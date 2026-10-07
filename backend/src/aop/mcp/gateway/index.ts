import { ExternalServiceException, SchemaValidationException } from 'aop/exceptions';
import { parseSchema } from 'lib/validation';

import { MODEL_GATEWAY_HEADERS, OPENROUTER_CHAT_COMPLETIONS_URL } from './constants';
import { buildCatalog, matchesSchema, parseArguments, toProviderMessages } from './utils';
import config from 'config';

import { ErrorMessage } from 'shared/enums/error-messages';

import type { CatalogEntry, ModelFetch, ModelGatewayOptions, ModelList, ModelMessage, ModelStep } from './types';
import type { z } from 'zod';

import { modelMessagesSchema, providerCompletionSchema } from './schemas';

type ProviderMessage = z.infer<typeof providerCompletionSchema>['choices'][number]['message'];

const isAbortError = (error: unknown): error is Error => error instanceof Error && error.name === 'AbortError';

/**
 * One-step gateway to the model provider.
 * Sends the messages so far and the MCP list, then returns the next tool or resource with its arguments, or the answer.
 * A non-200, a malformed completion, or a network failure is a provider failure.
 * An aborted request is rethrown so stop is not reported as a provider failure.
 */
export class ModelGateway {
    private readonly apiKey: string;
    private readonly model: string;
    private readonly endpoint: string;
    private readonly fetchImpl: ModelFetch;

    /**
     * @param options API key, model, and endpoint default to the OpenRouter config.
     * `fetchImpl` replaces global fetch in tests.
     */
    constructor(options: ModelGatewayOptions = {}) {
        this.apiKey = options.apiKey ?? config.openRouterApiKey;
        this.model = options.model ?? config.openRouterModel;
        this.endpoint = options.endpoint ?? OPENROUTER_CHAT_COMPLETIONS_URL;
        this.fetchImpl = options.fetchImpl ?? fetch;
    }

    /**
     * Runs one step. At most one tool or resource comes back, because the request sets `parallel_tool_calls` false.
     *
     * @param messages Context turns, the prompt, and earlier results and refusals, oldest first
     * @param list Tools, resources, and resource templates the model may select
     * @param signal Aborts the in-flight request
     * @returns The selected item and its arguments, or the answer text
     * @throws SchemaValidationException when the messages are invalid or the list repeats a kind, domain, and name
     * @throws ExternalServiceException when the provider returns an error, a non-200,
     * malformed output, or the connection fails
     */
    public async step(messages: ModelMessage[], list: ModelList, signal: AbortSignal): Promise<ModelStep> {
        const parsedMessages = this.parseMessages(messages);
        const { tools, lookup } = buildCatalog(list);
        const message = await this.post(parsedMessages, tools, signal);

        return this.interpret(message, lookup);
    }

    /**
     * Checks the record messages before they are sent.
     */
    private parseMessages(messages: ModelMessage[]): ModelMessage[] {
        const result = parseSchema(modelMessagesSchema, messages);

        if (!result.success) {
            throw new SchemaValidationException(ErrorMessage.SCHEMA_VALIDATION_FAILED, {
                issues: result.issues,
            });
        }

        return result.data;
    }

    /**
     * POSTs one chat completion and returns the first choice message.
     */
    private async post(
        messages: ModelMessage[],
        tools: ReturnType<typeof buildCatalog>['tools'],
        signal: AbortSignal
    ): Promise<ProviderMessage> {
        const body: {
            model: string;
            messages: ReturnType<typeof toProviderMessages>;
            tools?: ReturnType<typeof buildCatalog>['tools'];
            parallel_tool_calls?: false;
            tool_choice?: 'auto';
        } = {
            model: this.model,
            messages: toProviderMessages(messages),
        };

        if (tools.length > 0) {
            body.tools = tools;
            body.parallel_tool_calls = false;
            body.tool_choice = 'auto';
        }

        let response: Response;

        try {
            response = await this.fetchImpl(this.endpoint, {
                method: 'POST',
                headers: {
                    [MODEL_GATEWAY_HEADERS.contentType]: 'application/json',
                    [MODEL_GATEWAY_HEADERS.authorization]: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(body),
                signal,
            });
        } catch (error) {
            throw this.failureFromTransport(error);
        }

        let text: string;

        try {
            text = await response.text();
        } catch (error) {
            throw this.failureFromTransport(error);
        }

        if (response.status !== 200) {
            throw new ExternalServiceException(ErrorMessage.MODEL_PROVIDER_REQUEST_FAILED, {
                error: new Error(`Chat completion failed with status ${response.status}`),
            });
        }

        return this.parseCompletion(this.parseJson(text));
    }

    /**
     * Rethrows abort errors and wraps every other transport failure as a provider failure.
     */
    private failureFromTransport(error: unknown): Error {
        if (isAbortError(error)) {
            return error;
        }

        return new ExternalServiceException(ErrorMessage.MODEL_PROVIDER_REQUEST_FAILED, {
            error: error instanceof Error ? error : new Error(String(error)),
        });
    }

    /**
     * Parses a response body as JSON.
     */
    private parseJson(text: string): unknown {
        try {
            return JSON.parse(text);
        } catch {
            throw new ExternalServiceException(ErrorMessage.MODEL_PROVIDER_REQUEST_FAILED, {
                error: new Error('Model provider response is not JSON'),
            });
        }
    }

    /**
     * Parses a chat completion. A body that does not match the completion schema is a provider failure.
     */
    private parseCompletion(data: unknown): ProviderMessage {
        const result = parseSchema(providerCompletionSchema, data);

        if (!result.success) {
            throw new ExternalServiceException(ErrorMessage.MODEL_PROVIDER_REQUEST_FAILED, {
                error: new Error('Model provider response is malformed'),
            });
        }

        return result.data.choices[0].message;
    }

    /**
     * Maps one completion onto a selection or the answer.
     * A function call wins when the message also has content.
     */
    private interpret(message: ProviderMessage, lookup: Map<string, CatalogEntry>): ModelStep {
        const calls = message.tool_calls ?? [];

        if (calls.length > 1) {
            throw this.providerFailure('Model provider returned more than one function call');
        }

        if (calls.length === 1) {
            return this.selectionFromCall(calls[0], lookup);
        }

        const content = message.content ?? '';

        if (content.trim().length === 0) {
            throw this.providerFailure('Model provider returned no function call and no answer');
        }

        return { type: 'answer', content };
    }

    /**
     * Maps one function call back to the list item and checks its arguments.
     */
    private selectionFromCall(
        call: NonNullable<ProviderMessage['tool_calls']>[number],
        lookup: Map<string, CatalogEntry>
    ): ModelStep {
        const item = lookup.get(call.function.name);

        if (!item) {
            throw this.providerFailure('Model provider returned a function that is not in the list');
        }

        const args = parseArguments(call.function.arguments);

        if (!args || !matchesSchema(item.parameters, args)) {
            throw this.providerFailure('Model provider arguments do not match the item schema');
        }

        return {
            type: 'selection',
            domain: item.domain,
            name: item.name,
            kind: item.kind,
            arguments: args,
        };
    }

    /**
     * Wraps a malformed completion as a provider failure.
     */
    private providerFailure(detail: string): ExternalServiceException {
        return new ExternalServiceException(ErrorMessage.MODEL_PROVIDER_REQUEST_FAILED, {
            error: new Error(detail),
        });
    }
}
