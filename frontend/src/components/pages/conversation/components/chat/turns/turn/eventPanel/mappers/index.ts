import {
    type McpPersistedPermissionEvent,
    McpPersistedPermissionEventType,
    type McpPersistedPromptEvent,
} from '@/_types/_gen';

type EventPanelCall = Exclude<McpPersistedPromptEvent, McpPersistedPermissionEvent>;

interface EventPanelItem {
    arguments: McpPersistedPromptEvent['arguments'];
    call?: EventPanelCall;
    domain: string;
    kind: McpPersistedPromptEvent['kind'];
    name: string;
    status?: EventPanelCall['status'];
}

/**
 * Distinguishes the event that opens an ask from the call steps that follow it.
 */
const isPermission = (event: McpPersistedPromptEvent): event is McpPersistedPermissionEvent =>
    event.type === McpPersistedPermissionEventType.permission;

/**
 * A call step stays on the open ask when domain, name, and kind match.
 * Arguments are repeated on each step and are not part of the match.
 */
const belongsToItem = (item: EventPanelItem, event: EventPanelCall): boolean =>
    item.domain === event.domain && item.name === event.name && item.kind === event.kind;

/**
 * Copies the fields the card shows once. A call also carries the status of that step.
 */
const toItem = (event: McpPersistedPromptEvent): EventPanelItem => {
    if (isPermission(event)) {
        return {
            arguments: event.arguments,
            domain: event.domain,
            kind: event.kind,
            name: event.name,
        };
    }

    return {
        arguments: event.arguments,
        domain: event.domain,
        kind: event.kind,
        name: event.name,
        status: event.status,
        call: event,
    };
};

/**
 * Combines each ask into one event-panel item, in stored order.
 * A permission starts an item. Call steps that follow it for the same domain, name, and kind stay on that item.
 * The item keeps the last call, including a succeeded call's result. A refused or failed call has no result.
 * The next permission, or a call for a different item, starts the next item, so a later ask for the same tool stays separate.
 */
const mapToItems = (events: McpPersistedPromptEvent[]): EventPanelItem[] => {
    const items: EventPanelItem[] = [];

    for (const event of events) {
        const current = items[items.length - 1];

        if (!isPermission(event) && current && belongsToItem(current, event)) {
            items[items.length - 1] = {
                ...current,
                status: event.status,
                call: event,
            };
            continue;
        }

        items.push(toItem(event));
    }

    return items;
};

const mappers = {
    mapToItems,
};

export type { EventPanelItem };
export default mappers;
