import StatusField from './statusField/StatusField';
import WithPermission from './withPermission/WithPermission';

import type { McpStreamEvent } from '@/_types/_gen';
import type { ConversationStatus } from '@/shared/types/conversation';

import constants from './constants';
import {
    McpCallEventType,
    McpCallFailedEventStatus,
    McpCallProcessingEventStatus,
    McpCallRefusedEventStatus,
    McpCallSucceededToolEventStatus,
    McpErrorEventType,
    McpPermissionEventType,
    McpSavingEventType,
    McpSelectingEventType,
    McpStoppedEventType,
} from '@/_types/_gen';
import utils from '@/utils';

interface StatusProps {
    events: McpStreamEvent[];
    conversationStatus: ConversationStatus;
}

const Status = ({ events, conversationStatus }: StatusProps) => {
    const lastEvent = events[events.length - 1];

    let component = null;

    if (!lastEvent && conversationStatus === 'error') {
        component = <StatusField label={constants.status.error} />;
    } else if (lastEvent?.type === McpSelectingEventType.selecting) {
        component = <StatusField label={constants.status.selecting} animate />;
    } else if (lastEvent?.type === McpPermissionEventType.permission) {
        component = (
            <WithPermission
                label={utils.string.replace(constants.status.permission, lastEvent.name)}
                promptId={lastEvent.promptId}
                domain={lastEvent.domain}
                name={lastEvent.name}
                kind={lastEvent.kind}
            />
        );
    } else if (lastEvent?.type === McpCallEventType.call) {
        component = <StatusField label={utils.string.replace(constants.status.calling, lastEvent.name)} animate />;

        if (lastEvent?.status === McpCallRefusedEventStatus.refused) {
            component = <StatusField label={utils.string.replace(constants.status.callingRefused, lastEvent.name)} />;
        } else if (lastEvent?.status === McpCallFailedEventStatus.failed) {
            component = <StatusField label={utils.string.replace(constants.status.callingFailed, lastEvent.name)} />;
        } else if (lastEvent?.status === McpCallSucceededToolEventStatus.succeeded) {
            component = <StatusField label={utils.string.replace(constants.status.callingSucceeded, lastEvent.name)} />;
        } else if (lastEvent?.status === McpCallProcessingEventStatus.processing) {
            component = (
                <StatusField label={utils.string.replace(constants.status.callingProcessing, lastEvent.name)} animate />
            );
        }
    } else if (lastEvent?.type === McpSavingEventType.saving) {
        component = <StatusField label={constants.status.saving} />;
    } else if (lastEvent?.type === McpErrorEventType.error) {
        const message = `${constants.status.error}: ${lastEvent.context}`;
        component = <StatusField label={message} isError />;
    } else if (lastEvent?.type === McpStoppedEventType.stopped) {
        component = <StatusField label={constants.status.stopped} />;
    } else {
        component = <StatusField label={constants.status.sending} animate />;
    }

    return <div className="mt-md">{component}</div>;
};

export default Status;
