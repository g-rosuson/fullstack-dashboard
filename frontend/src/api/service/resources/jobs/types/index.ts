import type { EventMapFromUnion } from '../../../client/types';

import { JobEvent } from '@/_types/_gen';

/**
 * Typed SSE event map for the jobs stream.
 * Keys are the discriminator values from `JobEvent`; values are the corresponding event shapes.
 */
type JobStreamEvents = EventMapFromUnion<JobEvent>;

export type { JobStreamEvents };
