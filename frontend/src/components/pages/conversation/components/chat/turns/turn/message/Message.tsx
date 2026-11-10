import Flex from '@/components/blocks/flex/Flex';
import Text from '@/components/blocks/text/Text';

import utils from '@/utils';

interface MessageProps {
    message: { turnId: string; prompt?: string; answer?: string };
    finishedAt?: string;
    isPinnedPrompt?: boolean;
}

const Message = ({ message, finishedAt, isPinnedPrompt = false }: MessageProps) => {
    const isPrompt = message.prompt !== undefined;
    const contentClassName = isPrompt ? 'w-fit bg-muted p-sm rounded-md' : undefined;
    const content = isPrompt ? message.prompt : message.answer;
    const contentWithoutWhitespace = content?.trimEnd();
    const formattedFinishedAt = finishedAt ? utils.time.formatDate(finishedAt) : undefined;

    let finishedAtComponent = null;

    if (finishedAt && !isPrompt) {
        finishedAtComponent = (
            <Text size="xs" weight="bold" variant="muted">
                {formattedFinishedAt}
            </Text>
        );
    }

    return (
        <>
            <Flex
                direction="column"
                align={isPrompt ? 'end' : 'start'}
                className={isPinnedPrompt ? 'mt-md' : undefined}
                data-pinned-prompt={isPinnedPrompt ? '' : undefined}>
                <Flex direction="column" gap="sm" className={contentClassName}>
                    {contentWithoutWhitespace?.split(/\n\n+/).map((paragraph, index) => (
                        <Text size="sm" key={index}>
                            {paragraph}
                        </Text>
                    ))}
                </Flex>
            </Flex>

            {finishedAtComponent}
        </>
    );
};

export default Message;
