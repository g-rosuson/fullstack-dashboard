import { z } from 'zod';

/**
 * One message passed into a step.
 * `user` and `assistant` are conversation turns. `tool` is a tool result. `resource` is a resource read or a refusal.
 */
const modelMessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'tool', 'resource']),
    content: z.string(),
});

/**
 * The messages so far, oldest first.
 */
const modelMessagesSchema = z.array(modelMessageSchema);

/**
 * The model selected one tool or resource and supplied its arguments.
 * `kind` is `tool` or `resource`. A resource template is `resource`.
 */
const modelSelectionSchema = z.object({
    type: z.literal('selection'),
    domain: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(['tool', 'resource']),
    arguments: z.record(z.unknown()),
});

/**
 * The model wrote the answer and did not call a function.
 * `content` is the answer text.
 */
const modelAnswerSchema = z.object({
    type: z.literal('answer'),
    content: z.string().min(1),
});

/**
 * One step: a selection, or the answer text.
 */
const modelStepSchema = z.discriminatedUnion('type', [modelSelectionSchema, modelAnswerSchema]);

/**
 * One function call on a provider completion.
 * Fields other than `function` are kept and ignored.
 */
const providerFunctionCallSchema = z
    .object({
        function: z.object({
            name: z.string().min(1),
            arguments: z.string(),
        }),
    })
    .passthrough();

/**
 * A provider chat completion. The step uses the first choice.
 * Missing or empty `choices` is malformed output.
 */
const providerCompletionSchema = z
    .object({
        choices: z
            .array(
                z
                    .object({
                        message: z
                            .object({
                                content: z.string().nullable().optional(),
                                tool_calls: z.array(providerFunctionCallSchema).nullable().optional(),
                            })
                            .passthrough(),
                    })
                    .passthrough()
            )
            .min(1),
    })
    .passthrough();

export { modelMessageSchema, modelMessagesSchema, modelStepSchema, providerCompletionSchema };
