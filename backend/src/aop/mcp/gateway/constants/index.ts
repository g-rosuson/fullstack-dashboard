/**
 * OpenRouter chat completions endpoint for one prompt step.
 */
const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';

const MODEL_GATEWAY_HEADERS = {
    contentType: 'Content-Type',
    authorization: 'Authorization',
} as const;

/**
 * Tells the model to return one function call or a GitHub-flavored Markdown answer.
 * Tool and resource results are user messages because the provider's tool role needs a prior call id.
 * The format rules apply only when the model writes the answer and does not call a function.
 */
const STEP_INSTRUCTIONS = [
    'Select one tool or resource by calling its function, or write the answer with no function call.',
    'Call at most one function.',
    'Fill arguments from the messages so far.',
    'Tool results and resource reads are user messages labeled "Tool result" or "Resource result".',
    'When you write the answer, and only then, use GitHub-flavored Markdown.',
    'Use headings, lists, tables, and bold where they help.',
    'Write the answer as Markdown. Do not wrap the whole answer in a code fence.',
    'Do not use HTML.',
].join(' ');

export { OPENROUTER_CHAT_COMPLETIONS_URL, MODEL_GATEWAY_HEADERS, STEP_INSTRUCTIONS };
