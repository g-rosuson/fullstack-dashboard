import { OPENROUTER_CHAT_COMPLETIONS_URL } from 'aop/mcp/gateway/constants';

import config from 'config';

type RemoteTool = {
    name: string;
    domain: string;
    inputSchema?: Record<string, unknown>;
};

type RemoteResource = {
    name: string;
    domain: string;
    uri: string;
};

type RemoteTemplate = {
    name: string;
    domain: string;
    uriTemplate: string;
};

type RemoteStep =
    | { type: 'answer'; content: string }
    | { type: 'tool'; domain: string; name: string; arguments: Record<string, unknown> }
    | {
          type: 'resource';
          source: 'resource' | 'template';
          domain: string;
          name: string;
          arguments: Record<string, unknown>;
      }
    | { type: 'tool-from-result'; domain: string; name: string; argumentName: string }
    | { type: 'provider-failure' };

type RemoteToolResult = { text: string; isError?: boolean } | { hang: true } | { serverError: true };

type RemoteScript = {
    tools?: RemoteTool[];
    resources?: RemoteResource[];
    templates?: RemoteTemplate[];
    steps?: RemoteStep[];
    toolResults?: Record<string, RemoteToolResult>;
    resourceText?: string;
    listStatus?: number;
};

type HangWaiter = {
    resolve: () => void;
    // eslint-disable-next-line no-unused-vars
    reject: (error: Error) => void;
};

let tools: RemoteTool[] = [];
let resources: RemoteResource[] = [];
let templates: RemoteTemplate[] = [];
let steps: RemoteStep[] = [];
let toolResults: Record<string, RemoteToolResult> = {};
let resourceText = 'resource text';
let listStatus = 200;
let installed = false;
const hangWaiters: HangWaiter[] = [];
let inflight = 0;

/**
 * The error `fetch` throws when an abort signal fires.
 * Stop is recognized by `name`, not by the message.
 *
 * @returns An `AbortError`
 */
const abortError = (): Error => Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });

/**
 * A JSON response with the given status.
 *
 * @param body Response body
 * @param status HTTP status. 200 when omitted
 * @returns The response
 */
const jsonResponse = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });

/**
 * The URL string from a fetch input.
 *
 * @param input The first argument `fetch` received
 * @returns The URL
 */
const requestUrl = (input: RequestInfo | URL): string => {
    if (typeof input === 'string') {
        return input;
    }

    if (input instanceof URL) {
        return input.href;
    }

    return input.url;
};

/**
 * One header value. The name match ignores case.
 *
 * @param headers Headers from the fetch init
 * @param name Header name
 * @returns The value, or undefined when the header is absent
 */
const headerValue = (headers: HeadersInit | undefined, name: string): string | undefined => {
    if (!headers) {
        return undefined;
    }

    if (headers instanceof Headers) {
        return headers.get(name) ?? undefined;
    }

    if (Array.isArray(headers)) {
        const match = headers.find(([key]) => key.toLowerCase() === name.toLowerCase());

        return match?.[1];
    }

    const record = headers as Record<string, string>;

    return record[name] ?? record[name.toLowerCase()];
};

/**
 * Replaces the script the MCP server and the model provider will follow.
 * An empty step queue answers with "cleanup" so a leftover prompt can finish.
 *
 * @param script Tools, resources, templates, model steps, and tool outcomes
 */
const useRemote = (script: RemoteScript = {}): void => {
    tools = script.tools ?? [];
    resources = script.resources ?? [];
    templates = script.templates ?? [];
    steps = [...(script.steps ?? [])];
    toolResults = script.toolResults ?? {};
    resourceText = script.resourceText ?? 'resource text';
    listStatus = script.listStatus ?? 200;
};

/**
 * Lets a hung tool call finish so the prompt can continue.
 * Each waiter resolves. An aborted call has already left the list.
 */
const releaseHungCalls = (): void => {
    const pending = hangWaiters.splice(0, hangWaiters.length);

    for (const waiter of pending) {
        waiter.resolve();
    }
};

/**
 * Releases hung calls, switches the script to a cleanup answer, and waits until in-flight requests settle.
 * A prompt left mid-call can finish before the next test replaces the script.
 */
const settleRemote = async (): Promise<void> => {
    releaseHungCalls();
    useRemote({ steps: [{ type: 'answer', content: 'cleanup' }] });

    const startedAt = Date.now();

    while (inflight > 0 && Date.now() - startedAt < 2_000) {
        await new Promise<void>(resolve => {
            setTimeout(resolve, 10);
        });
    }
};

/**
 * Provider-safe function name. The gateway maps it back to domain, name, and kind.
 * Characters outside `[A-Za-z0-9_-]` become `_`, and the name is cut at 64 characters.
 *
 * @param source Which list the item came from
 * @param domain Item domain
 * @param name Item name
 * @returns The function name the model calls
 */
const functionName = (source: 'tool' | 'resource' | 'template', domain: string, name: string): string =>
    `${source}__${domain}__${name}`.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);

/**
 * One chat completion. The gateway uses the first choice.
 *
 * @param message The assistant message
 * @returns The provider response
 */
const completion = (message: { content?: string | null; tool_calls?: unknown[] | null }): Response =>
    jsonResponse({
        choices: [{ message }],
    });

/**
 * A completion that selects one tool or resource and fills its arguments.
 *
 * @param source Which list the item came from. A template stays `resource` on the wire
 * @param domain Item domain
 * @param name Item name
 * @param args Arguments for that step
 * @returns The provider response
 */
const toolCallCompletion = (source: 'tool' | 'resource' | 'template', domain: string, name: string, args: unknown) =>
    completion({
        content: null,
        tool_calls: [
            {
                function: {
                    name: functionName(source, domain, name),
                    arguments: JSON.stringify(args),
                },
            },
        ],
    });

/**
 * The text of the latest tool result in the provider request.
 * The gateway labels that message `Tool result`.
 *
 * @param body JSON body of the chat completion request
 * @returns The result text, or `missing` when the request has none
 */
const textFromToolResult = (body: string): string => {
    const parsed = JSON.parse(body) as { messages?: Array<{ content?: string }> };
    const marker = 'Tool result:\n';
    const found = [...(parsed.messages ?? [])].reverse().find(message => message.content?.startsWith(marker));

    return found?.content?.slice(marker.length) ?? 'missing';
};

/**
 * The next scripted model step.
 * An empty queue returns the cleanup answer so a leftover prompt can finish.
 *
 * @param body JSON body of the chat completion request
 * @returns The provider response
 */
const nextModelResponse = (body: string): Response => {
    const step = steps.shift();

    if (!step || step.type === 'answer') {
        return completion({ content: step?.type === 'answer' ? step.content : 'cleanup', tool_calls: null });
    }

    if (step.type === 'provider-failure') {
        return jsonResponse({ error: { message: 'unavailable' } }, 502);
    }

    if (step.type === 'tool-from-result') {
        return toolCallCompletion('tool', step.domain, step.name, {
            [step.argumentName]: textFromToolResult(body),
        });
    }

    if (step.type === 'resource') {
        return toolCallCompletion(step.source, step.domain, step.name, step.arguments);
    }

    return toolCallCompletion('tool', step.domain, step.name, step.arguments);
};

/**
 * Parks a tool call until `releaseHungCalls`, or until the signal aborts.
 * An abort rejects with `AbortError` so stop is not a server failure.
 *
 * @param signal The prompt's abort signal
 * @returns Resolves when the call is released
 */
const waitForHang = (signal: AbortSignal | undefined): Promise<void> =>
    new Promise((resolve, reject) => {
        const waiter: HangWaiter = {
            /**
             * Ends the hang and drops the abort listener.
             */
            resolve: () => {
                signal?.removeEventListener('abort', onAbort);
                resolve();
            },
            reject,
        };

        /**
         * Rejects the hang when stop aborts the prompt.
         */
        const onAbort = () => {
            const index = hangWaiters.indexOf(waiter);

            if (index >= 0) {
                hangWaiters.splice(index, 1);
            }

            reject(abortError());
        };

        if (signal?.aborted) {
            reject(abortError());

            return;
        }

        signal?.addEventListener('abort', onAbort, { once: true });
        hangWaiters.push(waiter);
    });

/**
 * The JSON-RPC result for one MCP method.
 * A list status other than 200 fails every list method. A hung tool waits on the signal.
 *
 * @param method `Mcp-Method` header
 * @param body JSON-RPC request body
 * @param signal Aborts a hung tool call
 * @returns The HTTP response, including a non-200 when the script says the server failed
 */
const mcpResult = async (method: string, body: string, signal: AbortSignal | undefined): Promise<Response> => {
    const id = (JSON.parse(body) as { id: unknown }).id;

    if (listStatus !== 200 && method.endsWith('/list')) {
        return jsonResponse({ error: { message: 'unavailable' } }, listStatus);
    }

    if (method === 'tools/list') {
        return jsonResponse({
            jsonrpc: '2.0',
            id,
            result: {
                tools: tools.map(tool => ({
                    name: tool.name,
                    ...(tool.inputSchema ? { inputSchema: tool.inputSchema } : {}),
                    _meta: { domain: tool.domain },
                })),
            },
        });
    }

    if (method === 'resources/list') {
        return jsonResponse({
            jsonrpc: '2.0',
            id,
            result: {
                resources: resources.map(resource => ({
                    name: resource.name,
                    uri: resource.uri,
                    _meta: { domain: resource.domain },
                })),
            },
        });
    }

    if (method === 'resources/templates/list') {
        return jsonResponse({
            jsonrpc: '2.0',
            id,
            result: {
                resourceTemplates: templates.map(template => ({
                    name: template.name,
                    uriTemplate: template.uriTemplate,
                    _meta: { domain: template.domain },
                })),
            },
        });
    }

    if (method === 'tools/call') {
        const name = (JSON.parse(body) as { params?: { name?: string } }).params?.name ?? '';
        const outcome = toolResults[name] ?? { text: 'tool text' };

        if ('hang' in outcome) {
            await waitForHang(signal);

            return jsonResponse({
                jsonrpc: '2.0',
                id,
                result: { content: [{ type: 'text', text: 'released' }] },
            });
        }

        if ('serverError' in outcome) {
            return jsonResponse({ jsonrpc: '2.0', id, error: { code: -32000, message: 'tool failed' } }, 200);
        }

        return jsonResponse({
            jsonrpc: '2.0',
            id,
            result: {
                content: [{ type: 'text', text: outcome.text }],
                ...(outcome.isError ? { isError: true } : {}),
            },
        });
    }

    if (method === 'resources/read') {
        const uri = (JSON.parse(body) as { params?: { uri?: string } }).params?.uri ?? '';

        return jsonResponse({
            jsonrpc: '2.0',
            id,
            result: { contents: [{ uri, text: resourceText }] },
        });
    }

    return jsonResponse({ jsonrpc: '2.0', id, error: { code: -32601, message: `unknown method ${method}` } }, 200);
};

/**
 * Points global fetch at the scripted MCP server and model provider.
 * Other URLs keep the original fetch. Call this before the first prompt.
 * A second call does nothing.
 */
const installRemoteFetch = (): void => {
    if (installed) {
        return;
    }

    installed = true;
    const originalFetch = globalThis.fetch.bind(globalThis);

    /**
     * Serves the scripted MCP server and model provider.
     * Any other URL uses the original fetch.
     *
     * @param input Request URL
     * @param init Method, headers, body, and abort signal
     * @returns The scripted response, or the original fetch result
     */
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = requestUrl(input);

        if (url !== config.mcpServerUrl && url !== OPENROUTER_CHAT_COMPLETIONS_URL) {
            return originalFetch(input, init);
        }

        inflight += 1;

        try {
            if (url === OPENROUTER_CHAT_COMPLETIONS_URL) {
                return nextModelResponse(String(init?.body ?? ''));
            }

            const method = headerValue(init?.headers, 'Mcp-Method') ?? '';

            return await mcpResult(method, String(init?.body ?? ''), init?.signal ?? undefined);
        } finally {
            inflight -= 1;
        }
    });
};

export type { RemoteResource, RemoteScript, RemoteStep, RemoteTemplate, RemoteTool };
export { installRemoteFetch, releaseHungCalls, settleRemote, useRemote };
