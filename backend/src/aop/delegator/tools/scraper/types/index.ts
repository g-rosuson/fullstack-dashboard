import type { z } from 'zod';

import { requestUserDataSchema } from '../schemas';

/**
 * A scraper tool.
 */
interface ScraperTool {
    type: 'scraper';
    targets: Omit<ScraperToolTarget, 'results'>[];
    keywords: string[];
    maxPages: number;
}

/**
 * A scraper tool with results.
 */
interface ScraperToolWithResults {
    type: 'scraper';
    targets: ScraperToolTarget[];
    keywords: string[];
    maxPages: number;
}

/**
 * A scraper tool target name.
 */
type ScraperToolTargetName = 'jobs-ch';

/**
 * A scraper tool target.
 */
interface ScraperToolTarget {
    target: ScraperToolTargetName;
    targetId: string;
    keywords?: string[];
    maxPages?: number;
    results: ScraperResult[];
}

/**
 * A description section type.
 */
interface DescriptionSection {
    title?: string;
    blocks: string[];
}

/**
 * An information item type.
 */
interface InformationItem {
    label: string;
    value: string;
}

/**
 * A scraper result type.
 */
interface ScraperResult {
    result: {
        url: string;
        title: string;
        description: DescriptionSection[];
        information: InformationItem[];
    } | null;
    error: {
        message: string;
    } | null;
}

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

export type {
    ScraperTool,
    ScraperToolWithResults,
    ScraperToolTarget,
    DescriptionSection,
    InformationItem,
    ScraperRequest,
    RequestUserData,
    ScraperResult,
    ScraperToolTargetName,
};
