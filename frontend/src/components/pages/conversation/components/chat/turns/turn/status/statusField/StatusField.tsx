import Flex from '@/components/blocks/flex/Flex';
import Text from '@/components/blocks/text/Text';

import type { ReactNode } from 'react';

const StatusField = ({ label, indicator }: { label: string; indicator?: ReactNode }) => {
    return (
        <Flex gap="sm" align="center" className="w-fit p-md rounded-md bg-muted">
            {indicator}

            <Text size="xs" variant="muted" className="animate-pulse">
                {label}
            </Text>
        </Flex>
    );
};

export default StatusField;
