import Flex from '@/components/blocks/flex/Flex';
import Text from '@/components/blocks/text/Text';

import type { FallbackProps } from './Fallback.types';

/**
 * Shows the original answer as plain paragraphs when markdown rendering crashes.
 */
const Fallback = ({ source }: FallbackProps) => {
    const paragraphs = source.trimEnd().split(/\n\n+/);

    return (
        <Flex direction="column" gap="sm">
            {paragraphs.map((paragraph, index) => (
                <Text size="sm" key={index}>
                    {paragraph}
                </Text>
            ))}
        </Flex>
    );
};

Fallback.displayName = 'Fallback';

export default Fallback;
