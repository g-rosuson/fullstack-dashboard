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
 * One tool or resource the model selected, with its arguments.
 * `kind` is `tool` or `resource`. A resource template is `resource`.
 */
const modelSelectionSchema = z.object({
    domain: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(['tool', 'resource']),
    arguments: z.record(z.unknown()),
});

/**
 * A scripted step that selects one tool or resource.
 * The gateway returns `selections` for the calls in a response. Runner tests use this shape for one call.
 */
const modelSelectionStepSchema = modelSelectionSchema.extend({
    type: z.literal('selection'),
});

/**
 * The calls from one model response that match the list, in provider order.
 */
const modelSelectionsSchema = z.object({
    type: z.literal('selections'),
    items: z.array(modelSelectionSchema).min(1),
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
 * One model request: the calls it returned, one scripted selection, or the answer text.
 */
const modelStepSchema = z.discriminatedUnion('type', [
    modelSelectionStepSchema,
    modelSelectionsSchema,
    modelAnswerSchema,
]);

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

export { modelMessageSchema, modelMessagesSchema, modelSelectionSchema, modelStepSchema, providerCompletionSchema };
