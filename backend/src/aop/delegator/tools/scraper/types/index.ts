import { z } from 'zod';

import type { ValidationIssue } from 'lib/validation/types';

import type { Dictionary, LoadedRequest, Request } from 'crawlee';
import type {
    ExecutionScraperTargetResult,
    ExecutionScraperToolTarget,
} from 'shared/types/jobs/tools/execution/types-execution-scraper-tool';

import { requestUserDataSchema } from '../schemas';

/**
 * A function to invoke onTargetFinish with the target results.
 */
// eslint-disable-next-line no-unused-vars
type ScraperOnTargetFinish = (target: ExecutionScraperToolTarget) => void;

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

/**
 * A process extraction target result resources interface.
 */
interface ProcessExtractionTargetResultResources {
    targetMap: TargetMap;
    userData: RequestUserData;
    uniqueKey: string;
    targetResult: ExecutionScraperTargetResult;
    onTargetFinish: ScraperOnTargetFinish;
}

/**
 * A process schema validation failure resources interface.
 */
interface ProcessSchemaValidationFailureResources {
    targetMap: TargetMap;
    request: LoadedRequest<LoadedRequest<Request<Dictionary>>>;
    issues: ValidationIssue[];
}

/**
 * A finish target resources interface.
 */
interface FinishTargetResources {
    userData: RequestUserData;
    results: ExecutionScraperTargetResult[];
    onTargetFinish: ScraperOnTargetFinish;
}

/**
 * A target interface.
 */
interface Target {
    uniqueKeys: Set<string>;
    results: ExecutionScraperTargetResult[];
    completed: boolean;
}

/**
 * A target map type.
 */
type TargetMap = Map<string, Target>;

export type {
    ProcessExtractionTargetResultResources,
    ProcessSchemaValidationFailureResources,
    FinishTargetResources,
    Target,
    TargetMap,
    RequestUserData,
    ScraperOnTargetFinish,
    ScraperRequest,
};
