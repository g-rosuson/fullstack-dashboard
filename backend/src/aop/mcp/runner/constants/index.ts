/**
 * How many finished prompts this process remembers.
 * Remembering the owner lets a later stop or permit return 422 for this user's prompt.
 * After the cap drops an id, or after a restart, that id is unknown and returns 404.
 */
const FINISHED_PROMPT_LIMIT = 200;

/**
 * Message content appended when the user refuses the pending tool or resource.
 */
const REFUSAL_CONTENT = {
    tool: 'The user refused this tool.',
    resource: 'The user refused this resource.',
} as const;

/**
 * Message content when a tool reports failure and returns no text.
 */
const TOOL_FAILURE_CONTENT = 'The tool failed.';

export { FINISHED_PROMPT_LIMIT, REFUSAL_CONTENT, TOOL_FAILURE_CONTENT };
