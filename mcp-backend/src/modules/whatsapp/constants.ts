/**
 * Module id. Tools and listed chats carry this id in `_meta.domain`.
 * `tools/list` does not return the module name.
 */
const NAME = "whatsapp";

/**
 * MCP tool name. Clients send this on `tools/call`.
 */
const TOOL_LIST_CHATS = "list_chats";

/**
 * MCP tool name. Clients send this on `tools/call`.
 */
const TOOL_SEND_MESSAGE = "send_message";

const TOOL_NAMES = [TOOL_LIST_CHATS, TOOL_SEND_MESSAGE] as const;

const CHAT_URI_TEMPLATE = "whatsapp://chats/{chatId}";

export { NAME, TOOL_LIST_CHATS, TOOL_SEND_MESSAGE, TOOL_NAMES, CHAT_URI_TEMPLATE };
