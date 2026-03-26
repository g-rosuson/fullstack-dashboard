import { JobEvent } from '_types/_gen';

import type { EventMapFromUnion } from '../../../client/types';

/**
 * Typed SSE event map for the jobs stream.
 * Keys are the discriminator values from `JobEvent`; values are the corresponding event shapes.
 */
type JobStreamEvents = EventMapFromUnion<JobEvent>;

export type { JobStreamEvents };
