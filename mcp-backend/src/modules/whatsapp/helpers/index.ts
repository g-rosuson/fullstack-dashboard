import { chats } from "../chats";

const findChat = (id: string) => chats.find((chat) => chat.id === id);

const findChatByUri = (uri: string) => chats.find((chat) => chat.uri === uri);

export { findChat, findChatByUri };
