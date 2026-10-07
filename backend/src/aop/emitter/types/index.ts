import { z } from 'zod';

import type { EventTypeToPayloadMap as JobEventTypeToPayloadMap } from 'shared/types/jobs/events/types-jobs-events';
import type { McpEventTypeToPayloadMap } from 'shared/types/mcp/events';

import { jobTargetFinishedEventSchema } from 'shared/schemas/jobs/events/schemas-events';

/**
 * Jobs and MCP each own an event map.
 * This is the one place both maps are combined.
 * Their `type` strings do not overlap, so each key has one payload.
 */
type EmitterEventMap = JobEventTypeToPayloadMap & McpEventTypeToPayloadMap;

/**
 * An event type.
 */
type EventType = keyof EmitterEventMap;

/**
 * A job target event payload.
 */
type JobTargetFinishedEvent = z.infer<typeof jobTargetFinishedEventSchema>;

export type { JobTargetFinishedEvent, EventType, EmitterEventMap };
