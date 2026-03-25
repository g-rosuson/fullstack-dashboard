import { z } from 'zod';

import { requestUserDataSchema } from '../schemas';

/**
 * A request user data type.
 */
type RequestUserData = z.infer<typeof requestUserDataSchema>;

/**
 * A scraper request interface.
 */
interface ScraperRequest {
    url: string;
    uniqueKey: string;
    userData: RequestUserData;
}

export type { RequestUserData, ScraperRequest };
