/**
 * @file Exposure of the MCP server on the dev and prod Compose stacks.
 * Acceptance: docs/specs/architecture/http/mcp/exposure.md
 */

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const dockerMaxBufferBytes = 10 * 1024 * 1024;
const composeWaitTimeoutSeconds = 90;
const edgeProbeTimeoutMs = 3_000;

const timeoutsMs = {
    docker: 120_000,
    stackUp: 600_000,
    caddyUp: 180_000,
    backendRun: 600_000,
    edgeContainer: 180_000,
    curl: 15_000,
};

const overrideFile = 'tests/mcp/compose.override.yml';

const devStack = {
    label: 'dev',
    file: 'docker-compose.dev.yml',
    project: 'mcp-exposure-dev',
    edgeNetwork: 'default',
};

const prodStack = {
    label: 'prod',
    file: 'docker-compose.prod.yml',
    project: 'mcp-exposure-prod',
    edgeNetwork: 'web',
};

const stacks = [devStack, prodStack];

const publicApplicationHosts = ['dashboard.rosuson.com', 'api.rosuson.com'];

const mcpServerUrl = 'http://mcp-server:3000/mcp';
const protocolVersion = '2026-07-28';

const toolsListRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {
        _meta: {
            'io.modelcontextprotocol/protocolVersion': protocolVersion,
            'io.modelcontextprotocol/clientInfo': { name: 'backend', version: '0.0.0' },
            'io.modelcontextprotocol/clientCapabilities': {},
        },
    },
};

const toolsListHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': protocolVersion,
    'Mcp-Method': 'tools/list',
};

const serverVersion = JSON.parse(
    readFileSync(new URL('../../mcp-backend/package.json', import.meta.url), 'utf8')
).version;

/**
 * Runs docker and resolves with `{ stdout, stderr }`.
 */
function runDocker(args, timeout = timeoutsMs.docker) {
    return execFileAsync('docker', args, { timeout, maxBuffer: dockerMaxBufferBytes });
}

/**
 * Runs Compose for one exposure project. The override clears the backend env file.
 */
function runCompose(stack, args, timeout = timeoutsMs.docker) {
    return runDocker(['compose', '-f', stack.file, '-f', overrideFile, '-p', stack.project, ...args], timeout);
}

/**
 * Parses the last JSON object line from a container's stdout.
 * Compose and image logs may precede it.
 */
function parseLastJsonLine(stdout) {
    const line = stdout
        .trim()
        .split('\n')
        .filter(entry => entry.startsWith('{'))
        .at(-1);

    assert.ok(line, `no JSON in docker output:\n${stdout}`);

    return JSON.parse(line);
}

/**
 * True when `text` is one JSON-RPC 2.0 object with `result` or `error`.
 */
function isMcpJsonRpc(text) {
    try {
        const value = JSON.parse(text);

        return Boolean(value && value.jsonrpc === '2.0' && ('result' in value || 'error' in value));
    } catch {
        return false;
    }
}

/**
 * `node -e` source for the backend container.
 * POSTs tools/list and prints `{ status, contentType, body }` or `{ error }`.
 */
function backendToolsListSource() {
    const url = JSON.stringify(mcpServerUrl);
    const headers = JSON.stringify(toolsListHeaders);
    const body = JSON.stringify(toolsListRequest);

    return `(async () => {
    const res = await fetch(${url}, {
        method: "POST",
        headers: ${headers},
        body: JSON.stringify(${body}),
    });
    const text = await res.text();
    console.log(JSON.stringify({ status: res.status, contentType: res.headers.get("content-type"), body: text }));
})().catch((err) => {
    console.log(JSON.stringify({ error: String(err.cause && err.cause.code || err.message) }));
    process.exitCode = 1;
});`;
}

/**
 * `node -e` source for a container that is not on the private network.
 * POSTs to the MCP hostname and prints `{ status }` or `{ error }`.
 */
function edgeNetworkProbeSource() {
    const url = JSON.stringify(mcpServerUrl);

    return `(async () => {
    try {
        const res = await fetch(${url}, {
            method: "POST",
            signal: AbortSignal.timeout(${edgeProbeTimeoutMs}),
        });
        console.log(JSON.stringify({ status: res.status }));
    } catch (err) {
        console.log(JSON.stringify({ error: String(err.cause && err.cause.code || err.name || err.message) }));
    }
})()`;
}

/**
 * Runs the backend image on the stack networks and POSTs tools/list to mcp-server.
 */
async function postToolsListFromBackend(stack) {
    const { stdout } = await runCompose(
        stack,
        ['run', '--no-deps', '-T', '--rm', '--entrypoint', 'node', 'backend', '-e', backendToolsListSource()],
        timeoutsMs.backendRun
    );

    return parseLastJsonLine(stdout);
}

/**
 * Compose network name a non-application container joins for HTTP-MCP-EXP-002.
 * Dev uses `default`. Prod uses `web`, the network Caddy is on.
 */
function edgeNetworkName(stack) {
    return `${stack.project}_${stack.edgeNetwork}`;
}

/**
 * Runs a throwaway Node container on `network` and POSTs to the MCP hostname.
 */
async function postMcpFromEdgeNetwork(network) {
    const { stdout } = await runDocker(
        ['run', '--rm', '--network', network, 'node:22-alpine', 'node', '-e', edgeNetworkProbeSource()],
        timeoutsMs.edgeContainer
    );

    return parseLastJsonLine(stdout);
}

/**
 * Host port bindings for mcp-server. A null binding is exposed in Docker and not published on the host.
 */
async function readPublishedPorts(stack) {
    const containerName = `${stack.project}-mcp-server-1`;
    const { stdout } = await runDocker(['inspect', '-f', '{{json .NetworkSettings.Ports}}', containerName]);

    return JSON.parse(stdout);
}

/**
 * Fails when any container port is bound on the host.
 */
function assertNothingPublished(ports) {
    for (const [key, binding] of Object.entries(ports)) {
        assert.equal(binding, null, `${key} is published`);
    }
}

/**
 * Splits the `%{http_code}` trailer curl appends from the response body.
 */
function splitCurlStatus(stdout) {
    const lines = stdout.trimEnd().split('\n');
    const status = Number(lines.at(-1));
    const body = lines.slice(0, -1).join('\n');

    return { status, body };
}

/**
 * POSTs `/mcp` on loopback with the Host header Caddy uses for a public site.
 */
async function postMcpOnPublicHost(host) {
    const { stdout } = await execFileAsync(
        'curl',
        [
            '-sS',
            '-m',
            '5',
            '-w',
            '\n%{http_code}',
            '-H',
            `Host: ${host}`,
            '-H',
            'Content-Type: application/json',
            '-X',
            'POST',
            '--data',
            '{}',
            'http://127.0.0.1/mcp',
        ],
        { timeout: timeoutsMs.curl }
    );

    return splitCurlStatus(stdout);
}

/**
 * Creates the dev `default` network, then removes the container that created it.
 * mcp-server is only on `private`, so Compose does not create `default` until another service starts.
 */
async function createDevDefaultNetwork() {
    const containerName = `${devStack.project}-net`;

    await runCompose(
        devStack,
        ['run', '-d', '--no-deps', '--name', containerName, '--entrypoint', 'sleep', 'backend', 'infinity'],
        timeoutsMs.stackUp
    );
    await runDocker(['rm', '-f', containerName]);
}

/**
 * Builds and starts mcp-server on both stacks, starts prod Caddy, and creates the dev default network.
 */
async function startStacks() {
    for (const stack of stacks) {
        await runCompose(
            stack,
            ['up', '-d', '--build', '--wait', '--wait-timeout', String(composeWaitTimeoutSeconds), 'mcp-server'],
            timeoutsMs.stackUp
        );
    }

    await runCompose(prodStack, ['up', '-d', '--no-deps', 'caddy'], timeoutsMs.caddyUp);
    await createDevDefaultNetwork();
}

/**
 * Removes both projects, including volumes and orphans.
 * A failed teardown of one project still attempts the other.
 */
async function stopStacks() {
    for (const stack of stacks) {
        await runCompose(stack, ['down', '-v', '--remove-orphans']).catch(() => {});
    }
}

test.before(startStacks);
test.after(stopStacks);

for (const stack of stacks) {
    test(`HTTP-MCP-EXP-001 ${stack.label} application call`, async () => {
        const result = await postToolsListFromBackend(stack);

        assert.equal(result.status, 200);
        assert.match(result.contentType, /application\/json/);
        assert.equal(isMcpJsonRpc(result.body), true);

        const payload = JSON.parse(result.body);

        assert.equal(payload.id, 1);
        assert.equal(payload.result._meta['io.modelcontextprotocol/serverInfo'].name, 'mcp-server');
        assert.equal(payload.result._meta['io.modelcontextprotocol/serverInfo'].version, serverVersion);
        assert.equal(result.body.includes('event:'), false);
    });

    test(`HTTP-MCP-EXP-002 ${stack.label} public internet`, async () => {
        assertNothingPublished(await readPublishedPorts(stack));

        const result = await postMcpFromEdgeNetwork(edgeNetworkName(stack));

        assert.equal(result.status, undefined);
        assert.ok(result.error);
    });
}

test('HTTP-MCP-EXP-003 prod public hosts', async () => {
    for (const host of publicApplicationHosts) {
        const result = await postMcpOnPublicHost(host);

        assert.equal(isMcpJsonRpc(result.body), false, `${host} returned an MCP result (${result.status})`);
    }
});
