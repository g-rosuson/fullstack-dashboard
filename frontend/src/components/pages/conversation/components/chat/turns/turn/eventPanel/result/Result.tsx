import Text from '@/components/blocks/text/Text';
import Heading from '@/components/blocks/title/Title';

import constants from '../constants';
import {
    McpPersistedCallSucceededResourceEventKind,
    McpPersistedCallSucceededResourceEventStatus,
    McpPersistedCallSucceededToolEventKind,
    McpPersistedCallSucceededToolEventStatus,
    type McpPersistedPromptEvent,
} from '@/_types/_gen';

/**
 * These names come from the Model Context Protocol.
 * A tool result uses `content`. A resource read uses `contents`.
 * They are not two names for the same list.
 */
const Result = ({ event }: { event: McpPersistedPromptEvent }) => {
    let component = null;

    if (
        'status' in event &&
        event.status === McpPersistedCallSucceededToolEventStatus.succeeded &&
        event.kind === McpPersistedCallSucceededToolEventKind.tool
    ) {
        component = (
            <div>
                <Heading level={2} size="xs">
                    {constants.label.result}
                </Heading>

                {event.result.content.map((item, index) =>
                    item.text ? (
                        <Text key={index} size="xs">
                            {item.text}
                        </Text>
                    ) : null
                )}
            </div>
        );
    } else if (
        'status' in event &&
        event.status === McpPersistedCallSucceededResourceEventStatus.succeeded &&
        event.kind === McpPersistedCallSucceededResourceEventKind.resource
    ) {
        component = (
            <div>
                <Heading level={2} size="xs">
                    {constants.label.result}
                </Heading>

                {event.result.contents.map((item, index) => (
                    <Text key={index} size="xs">
                        {item.uri}
                        {item.text ? ` ${item.text}` : ''}
                    </Text>
                ))}
            </div>
        );
    }

    return component;
};

export default Result;
