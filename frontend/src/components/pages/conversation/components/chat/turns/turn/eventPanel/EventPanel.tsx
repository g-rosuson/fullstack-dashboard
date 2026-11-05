import { CSSProperties, useState } from 'react';

import Result from './result/Result';
import Animate from '@/components/blocks/animate/Animate';
import Collapsible from '@/components/blocks/collapsible/Collapsible';
import Flex from '@/components/blocks/flex/Flex';
import Text from '@/components/blocks/text/Text';
import Heading from '@/components/blocks/title/Title';

import mappers from './mappers';

import type { McpPersistedPromptEvent } from '@/_types/_gen';

import constants from './constants';
import utils from '@/utils';

interface EventPanelProps {
    composerHeight: number;
    events: McpPersistedPromptEvent[];
}

const EventPanel = ({ composerHeight, events }: EventPanelProps) => {
    // State
    const [open, setIsOpen] = useState(false);

    // Derived
    const items = mappers.mapToItems(events);

    // 'md' is the page container bottom padding; 'sm' is the gap between the composer and the event panel.
    const bottom = composerHeight + utils.spacing.measure('sm') + utils.spacing.measure('md');

    const style: CSSProperties = {
        position: 'sticky',
        bottom: `${bottom}px`,
        right: '0',
    };

    const collapsibleLabel = `${constants.label.events} (${items.length})`;

    return (
        <Animate style={style}>
            <Collapsible label={collapsibleLabel} open={open} onOpenChange={setIsOpen}>
                <Flex direction="column" gap="md">
                    {items.map((item, index) => (
                        <Flex key={index} direction="column" gap="sm" className="border border-border rounded-md p-sm">
                            <div>
                                <Heading level={2} size="xs">
                                    {constants.label.domain}
                                </Heading>

                                <Text size="xs">{item.domain}</Text>
                            </div>

                            <div>
                                <Heading level={2} size="xs">
                                    {constants.label.kind}
                                </Heading>

                                <Text size="xs">{item.kind}</Text>
                            </div>

                            <div>
                                <Heading level={2} size="xs">
                                    {constants.label.name}
                                </Heading>

                                <Text size="xs">{item.name}</Text>
                            </div>

                            <div>
                                <Heading level={2} size="xs">
                                    {constants.label.arguments}
                                </Heading>

                                <Text size="xs">{JSON.stringify(item.arguments || null)}</Text>
                            </div>

                            {item.status ? (
                                <div>
                                    <Heading level={2} size="xs">
                                        {constants.label.status}
                                    </Heading>

                                    <Text size="xs">{item.status}</Text>
                                </div>
                            ) : null}

                            {item.call ? <Result event={item.call} /> : null}
                        </Flex>
                    ))}
                </Flex>
            </Collapsible>
        </Animate>
    );
};

export default EventPanel;
