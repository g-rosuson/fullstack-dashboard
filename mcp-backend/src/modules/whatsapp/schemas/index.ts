import { z } from "zod";

/**
 * `list_chats` takes no arguments. A tool still needs an input schema,
 * and an empty object means the call is `{}`. The chat list is fixed, so there
 * is nothing to filter or pass.
 */
const listChatsInputSchema = z.object({});

/**
 * `send_message` takes the listed chat id and the message text.
 */
const sendMessageInputSchema = z.object({
    chat: z.string(),
    text: z.string(),
});

export { listChatsInputSchema, sendMessageInputSchema };
