import Message from './message/Message';
import Placeholder from './placeholder/Placeholder';

import { McpConversationTurn } from '@/_types/_gen/mcpConversationTurn';

interface MessagesProps {
    turns: McpConversationTurn[];
}

const Messages = ({ turns }: MessagesProps) => {
    const mappedMessages = [];
    for (const turn of turns) {
        mappedMessages.push({
            role: 'user' as const,
            content: turn.prompt,
            turnId: `${turn.turnId}-user`,
        });
        mappedMessages.push({
            role: 'assistant' as const,
            content: turn.answer,
            turnId: `${turn.turnId}-assistant`,
        });
    }

    const hasMessages = mappedMessages.length > 0;

    const messages = mappedMessages.map(message => (
        <Message content={message.content} role={message.role} key={message.turnId} />
    ));

    return <section className="h-full">{hasMessages ? messages : <Placeholder />}</section>;
};

export default Messages;
