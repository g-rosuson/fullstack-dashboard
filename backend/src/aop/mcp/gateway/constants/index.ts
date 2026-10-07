/**
 * OpenRouter chat completions endpoint for one prompt step.
 */
const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODEL_GATEWAY_HEADERS = {
    contentType: 'Content-Type',
    authorization: 'Authorization',
} as const;

/**
 * Tells the model to return one function call or the answer.
 * Tool and resource results are user messages because the provider's tool role needs a prior call id.
 */
const STEP_INSTRUCTIONS = [
    'Select one tool or resource by calling its function, or write the answer with no function call.',
    'Call at most one function.',
    'Fill arguments from the messages so far.',
    'Tool results and resource reads are user messages labeled "Tool result" or "Resource result".',
].join(' ');

export { OPENROUTER_CHAT_COMPLETIONS_URL, MODEL_GATEWAY_HEADERS, STEP_INSTRUCTIONS };
