import type { EventMapFromUnion } from '../../../client/types';

import { McpStreamEvent } from '@/_types/_gen';

/**
 * Typed SSE event map for the prompt stream.
 * Keys are the `type` literals on `McpStreamEvent`.
 */
type McpStreamEvents = EventMapFromUnion<McpStreamEvent>;

export type { McpStreamEvents };
