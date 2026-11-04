import StatusField from './statusField/StatusField';
import WithPermission from './withPermission/WithPermission';

import type { McpStreamEvent } from '@/_types/_gen';
import type { ConversationStatus } from '@/shared/types/conversation';

import constants from './constants';
import {
    McpAnswerEventType,
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

const Status = ({
    events,
    conversationStatus,
}: {
    events: McpStreamEvent[];
    conversationStatus: ConversationStatus;
}) => {
    const lastEvent = events[events.length - 1];

    let component = null;

    if (!lastEvent && conversationStatus === 'error') {
        component = <StatusField label={constants.status.error} />;
    } else if (lastEvent?.type === McpSelectingEventType.selecting) {
        component = <StatusField label={constants.status.selecting} />;
    } else if (lastEvent?.type === McpPermissionEventType.permission) {
        component = <WithPermission label={utils.string.replace(constants.status.permission, lastEvent.name)} />;
    } else if (lastEvent?.type === McpCallEventType.call) {
        component = <StatusField label={utils.string.replace(constants.status.calling, lastEvent.name)} />;

        if (lastEvent?.status === McpCallRefusedEventStatus.refused) {
            component = <StatusField label={utils.string.replace(constants.status.callingRefused, lastEvent.name)} />;
        } else if (lastEvent?.status === McpCallFailedEventStatus.failed) {
            component = <StatusField label={utils.string.replace(constants.status.callingFailed, lastEvent.name)} />;
        } else if (lastEvent?.status === McpCallSucceededToolEventStatus.succeeded) {
            component = <StatusField label={utils.string.replace(constants.status.callingSucceeded, lastEvent.name)} />;
        } else if (lastEvent?.status === McpCallProcessingEventStatus.processing) {
            component = (
                <StatusField label={utils.string.replace(constants.status.callingProcessing, lastEvent.name)} />
            );
        }
    } else if (lastEvent?.type === McpSavingEventType.saving) {
        component = <StatusField label={constants.status.saving} />;
    } else if (lastEvent?.type === McpErrorEventType.error) {
        component = <StatusField label={constants.status.error} />;
    } else if (lastEvent?.type === McpStoppedEventType.stopped) {
        component = <StatusField label={constants.status.stopped} />;
    } else if (lastEvent?.type === McpAnswerEventType.answer) {
        component = <StatusField label={constants.status.answered} />;
    } else {
        component = (
            <StatusField
                label={constants.status.sending}
                indicator={<div className="w-2 h-2 bg-primary rounded-full animate-pulse" />}
            />
        );
    }

    return component;
};

export default Status;
