import type { ConversationTurn } from 'aop/db/mongo/repository/conversations/types';
import { BusinessLogicException, ExternalServiceException, SchemaValidationException } from 'aop/exceptions';
import type { McpResourceReadResult, McpToolCallResult } from 'aop/mcp/client/types';
import type { ModelList, ModelMessage } from 'aop/mcp/gateway/types';

import { REFUSAL_CONTENT, TOOL_FAILURE_CONTENT } from '../constants';

import { ErrorMessage } from 'shared/enums/error-messages';

import type { PromptSelection } from '../types';
import type { McpAnswerEvent, McpCallEvent } from 'shared/types/mcp/events';

import { isObject } from 'utils';

/**
 * Keeps the finished turns named by `turnIds`, in the order they were saved.
 * An omitted or empty list keeps every turn.
 *
 * @param turns Finished turns on the conversation, oldest first
 * @param turnIds Ids the prompt asked for, or omitted
 * @returns The turns that will be sent to the model
 * @throws BusinessLogicException when an id is missing, duplicated, or not a finished turn of this conversation
 */
const selectTurns = (turns: ConversationTurn[], turnIds: string[] | undefined): ConversationTurn[] => {
    if (!turnIds || turnIds.length === 0) {
        return turns;
    }

    const seen = new Set<string>();

    for (const turnId of turnIds) {
        if (seen.has(turnId)) {
            throw new BusinessLogicException(ErrorMessage.MCP_TURN_NOT_IN_CONVERSATION);
        }

        seen.add(turnId);
    }

    const selected = turns.filter(turn => seen.has(turn.turnId));

    if (selected.length !== seen.size) {
        throw new BusinessLogicException(ErrorMessage.MCP_TURN_NOT_IN_CONVERSATION);
    }

    return selected;
};

/**
 * Seeds the model messages from finished turns, then the new prompt.
 * Each old prompt is `user` and its answer is `assistant`.
 *
 * @param turns Turns to include, oldest first
 * @param prompt The new prompt
 * @returns Messages the first step sees
 */
const seedMessages = (turns: ConversationTurn[], prompt: string): ModelMessage[] => {
    const messages: ModelMessage[] = [];

    for (const turn of turns) {
        messages.push({ role: 'user', content: turn.prompt }, { role: 'assistant', content: turn.answer });
    }

    messages.push({ role: 'user', content: prompt });

    return messages;
};

/**
 * Reads argument fields off a tool input schema for the wire list.
 *
 * @param inputSchema Tool input schema from the MCP list. Omitted when the tool declares none
 * @returns Each property's name, type, and whether it is required
 */
const argumentFields = (
    inputSchema: Record<string, unknown> | undefined
): McpAnswerEvent['list']['tools'][number]['argumentFields'] => {
    if (!inputSchema || !isObject(inputSchema.properties)) {
        return [];
    }

    const required = new Set(
        Array.isArray(inputSchema.required)
            ? inputSchema.required.filter((item): item is string => typeof item === 'string')
            : []
    );

    return Object.entries(inputSchema.properties).map(([name, schema]) => ({
        name,
        type: propertyType(schema),
        required: required.has(name),
    }));
};

/**
 * JSON Schema type name for one argument field.
 * A missing or compound type is reported as `string`.
 */
const propertyType = (schema: unknown): string => {
    if (isObject(schema) && typeof schema.type === 'string' && schema.type.length > 0) {
        return schema.type;
    }

    return 'string';
};

/**
 * Projects the MCP list onto the wire `list` carried by answer, error, and stopped.
 *
 * @param list Tools, concrete resources, and resource templates
 * @returns The list the stream sends
 */
const toWireList = (list: ModelList): McpAnswerEvent['list'] => ({
    tools: list.tools.map(tool => ({
        domain: tool.domain,
        name: tool.name,
        argumentFields: argumentFields(tool.inputSchema),
    })),
    resources: [
        ...list.resources.map(resource => ({
            domain: resource.domain,
            name: resource.name,
            uri: resource.uri,
        })),
        ...list.templates.map(template => ({
            domain: template.domain,
            name: template.name,
            uriTemplate: template.uriTemplate,
        })),
    ],
});

/**
 * Groups tools and resources that ran, each name once, under its domain.
 * Refusals are not included. The first time a domain or name is used fixes its order.
 *
 * @param used Tools and resources that ran, including those that failed
 * @returns The `domains` array on the answer event
 */
const toDomains = (used: PromptSelection[]): McpAnswerEvent['domains'] => {
    const order: string[] = [];
    const byDomain = new Map<string, { tools: string[]; resources: string[] }>();

    for (const item of used) {
        let entry = byDomain.get(item.domain);

        if (!entry) {
            entry = { tools: [], resources: [] };
            byDomain.set(item.domain, entry);
            order.push(item.domain);
        }

        const names = item.kind === 'tool' ? entry.tools : entry.resources;

        if (!names.includes(item.name)) {
            names.push(item.name);
        }
    }

    return order.map(name => {
        const entry = byDomain.get(name);

        return {
            name,
            tools: (entry?.tools ?? []).map(toolName => ({ name: toolName })),
            resources: (entry?.resources ?? []).map(resourceName => ({ name: resourceName })),
        };
    });
};

/**
 * Expands an RFC 6570 URI template with the arguments the model filled.
 * Covers the simple operators the catalog already reads: none, +, #, ., /, ;, ?, &.
 *
 * @param template URI template from the MCP list
 * @param args Arguments for that step
 * @returns The URI to pass to `resources/read`
 * @throws Error when a template variable is missing or not a string
 */
const expandUriTemplate = (template: string, args: Record<string, unknown>): string => {
    const expression = /\{([+#./;?&])?([^}]+)\}/g;

    return template.replace(expression, (_match, operator: string | undefined, raw: string) => {
        const names = raw
            .split(',')
            .map(part => /^([A-Za-z0-9_]+)/.exec(part.trim())?.[1])
            .filter((name): name is string => Boolean(name));
        const values = names.map(name => {
            const value = args[name];

            if (typeof value !== 'string') {
                throw new Error(`URI template variable ${name} is missing`);
            }

            return value;
        });
        const encode = operator === '+' || operator === '#' ? encodeReserved : encodeURIComponent;
        const encoded = values.map(value => encode(value));

        switch (operator) {
            case '+':
                return encoded.join(',');
            case '#':
                return `#${encoded.join(',')}`;
            case '.':
                return encoded.map(value => `.${value}`).join('');
            case '/':
                return encoded.map(value => `/${value}`).join('');
            case ';':
                return names.map((name, index) => `;${name}=${encoded[index] ?? ''}`).join('');
            case '?':
                return `?${names.map((name, index) => `${name}=${encoded[index] ?? ''}`).join('&')}`;
            case '&':
                return `&${names.map((name, index) => `${name}=${encoded[index] ?? ''}`).join('&')}`;
            default:
                return encoded.join(',');
        }
    });
};

/**
 * Percent-encodes a reserved expansion, leaving RFC 6570 reserved characters in place.
 */
const encodeReserved = (value: string): string =>
    encodeURIComponent(value)
        .replace(/%3A/gi, ':')
        .replace(/%2F/gi, '/')
        .replace(/%3F/gi, '?')
        .replace(/%23/gi, '#')
        .replace(/%5B/gi, '[')
        .replace(/%5D/gi, ']')
        .replace(/%40/gi, '@')
        .replace(/%21/gi, '!')
        .replace(/%24/gi, '$')
        .replace(/%26/gi, '&')
        // eslint-disable-next-line quotes
        .replace(/%27/gi, "'")
        .replace(/%28/gi, '(')
        .replace(/%29/gi, ')')
        .replace(/%2A/gi, '*')
        .replace(/%2B/gi, '+')
        .replace(/%2C/gi, ',');

/**
 * Text stored on a tool message. The model sees this on the next step.
 *
 * @param result Tool result from the MCP server
 * @param failed Whether the tool reported `isError`
 * @returns The message content
 */
const toolMessageContent = (result: McpToolCallResult, failed: boolean): string => {
    const text = textFromParts(result.content);

    if (text) {
        return text;
    }

    if (failed) {
        return TOOL_FAILURE_CONTENT;
    }

    return JSON.stringify(result.content ?? []);
};

/**
 * Text stored on a resource message.
 *
 * @param result Resource read result
 * @returns The message content
 */
const resourceMessageContent = (result: McpResourceReadResult): string => {
    const text = textFromParts(result.contents);

    if (text) {
        return text;
    }

    return JSON.stringify(result.contents);
};

/**
 * Joins `text` fields from tool content or resource contents.
 */
const textFromParts = (parts: Array<{ text?: string }> | undefined): string =>
    (parts ?? [])
        .map(part => part.text)
        .filter((text): text is string => typeof text === 'string' && text.length > 0)
        .join('\n');

/**
 * Maps a tool result onto the succeeded `call` result.
 * `isError` is omitted. A tool that sets it is a failed call, not a succeeded one.
 *
 * @param result Tool result from the MCP server
 * @returns The wire result
 */
const toToolResult = (
    result: McpToolCallResult
): Extract<McpCallEvent, { status: 'succeeded'; kind: 'tool' }>['result'] => ({
    content: (result.content ?? []).map(item => ({
        type: item.type.length > 0 ? item.type : 'text',
        ...(item.text !== undefined ? { text: item.text } : {}),
    })),
});

/**
 * Maps a resource read onto the succeeded `call` result.
 *
 * @param result Resource read result
 * @returns The wire result
 */
const toResourceResult = (
    result: McpResourceReadResult
): Extract<McpCallEvent, { status: 'succeeded'; kind: 'resource' }>['result'] => ({
    contents: result.contents.map(item => ({
        uri: item.uri,
        ...(item.mimeType !== undefined ? { mimeType: item.mimeType } : {}),
        ...(item.text !== undefined ? { text: item.text } : {}),
    })),
});

/**
 * Whether the user refused this kind of item, as the message content.
 *
 * @param kind Tool or resource
 * @returns The refusal sentence
 */
const refusalContent = (kind: PromptSelection['kind']): string => REFUSAL_CONTENT[kind];

/**
 * Non-empty context for an `error` event.
 * Prefers the upstream detail over the exception's own summary.
 *
 * @param error Failure from the model provider, the MCP server, or a later save
 * @returns Context the stream sends
 */
const failureContext = (error: unknown): string => {
    if (error instanceof SchemaValidationException) {
        const detail = error.context.issues?.[0]?.message;

        if (detail && detail.trim().length > 0) {
            return detail;
        }
    }

    if (error instanceof ExternalServiceException) {
        const cause = error.context.error;

        if (cause instanceof Error && cause.message.trim().length > 0) {
            return cause.message;
        }
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return ErrorMessage.UNEXPECTED_ERROR;
};

/**
 * Whether this error is an abort from stop, rather than a provider or server failure.
 *
 * @param error A thrown value
 * @returns True when the request was aborted
 */
const isAbortError = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError';

export {
    argumentFields,
    expandUriTemplate,
    failureContext,
    isAbortError,
    refusalContent,
    resourceMessageContent,
    seedMessages,
    selectTurns,
    toDomains,
    toResourceResult,
    toToolResult,
    toWireList,
    toolMessageContent,
};
