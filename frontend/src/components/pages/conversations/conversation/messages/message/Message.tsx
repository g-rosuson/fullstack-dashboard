import { cn } from '@/lib/utils';

function Message({ role, content }: { role: 'user' | 'assistant'; content: string }) {
    const isUser = role === 'user';
    const containerClassName = isUser ? 'flex justify-end' : 'flex justify-start';
    const contentClassName = isUser && 'bg-muted';

    return (
        <div className={containerClassName}>
            <div className={cn(contentClassName, 'w-fit rounded-md p-md text-sm')}>{content}</div>
        </div>
    );
}

export default Message;
