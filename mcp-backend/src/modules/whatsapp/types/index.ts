import type { z } from "zod";
import type { listChatsInputSchema, sendMessageInputSchema } from "../schemas";

interface ChatMessage {
    readonly from: string;
    readonly text: string;
    readonly at: string;
}

interface Chat {
    readonly id: string;
    readonly title: string;
    readonly uri: string;
    readonly description: string;
    readonly messages: readonly ChatMessage[];
}

type ListChatsInput = z.infer<typeof listChatsInputSchema>;
type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

export type { Chat, ChatMessage, ListChatsInput, SendMessageInput };
