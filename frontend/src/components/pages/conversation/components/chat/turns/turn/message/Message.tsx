import { cn } from '@/lib/utils';

const Message = ({
    message,
    isPinnedPrompt = false,
}: {
    message: { turnId: string; prompt?: string; answer?: string };
    isPinnedPrompt?: boolean;
}) => {
    const isPrompt = message.prompt !== undefined;
    const containerClassName = isPrompt ? 'flex justify-end' : 'flex justify-start';
    const contentClassName = isPrompt && 'bg-muted';
    const content = isPrompt ? message.prompt : message.answer;
    return (
        <div
            className={cn(containerClassName, 'w-full', isPinnedPrompt && 'mt-md')}
            data-pinned-prompt={isPinnedPrompt ? '' : undefined}>
            <div className={cn(contentClassName, 'flex flex-col gap-sm rounded-md p-md text-sm')}>
                {content?.split(/\n\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            </div>
        </div>
    );
};

export default Message;
