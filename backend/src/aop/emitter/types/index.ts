import { z } from 'zod';

import type { EventTypeToPayloadMap } from 'shared/types/jobs/events/types-jobs-events';

import { jobTargetFinishedEventSchema } from 'shared/schemas/jobs/events/schemas-events';

/**
 * An event type.
 */
type EventType = keyof EventTypeToPayloadMap;

/**
 * A job target event payload.
 */
type JobTargetFinishedEvent = z.infer<typeof jobTargetFinishedEventSchema>;

export type { JobTargetFinishedEvent, EventType };
