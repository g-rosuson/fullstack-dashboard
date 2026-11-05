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
import utils from '@/utils';

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
                        <Text key={index} as="pre" size="xs" className="whitespace-pre-wrap font-mono break-words m-0">
                            {utils.string.formatJson(item.text)}
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
                    <Text key={index} as="pre" size="xs" className="whitespace-pre-wrap font-mono break-words m-0">
                        {item.uri}
                        {item.text ? `\n${utils.string.formatJson(item.text)}` : ''}
                    </Text>
                ))}
            </div>
        );
    }

    return component;
};

export default Result;
