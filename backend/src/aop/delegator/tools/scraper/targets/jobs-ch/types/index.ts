import type { RequestUserData } from '../../../types';
import type { Dictionary, PlaywrightCrawlingContext, Request } from 'crawlee';
import type { Page } from 'playwright';
import type { ScraperPageContent } from 'shared/types/jobs/tools/types-tools-scraper';
/**
 * An enqueue links type.
 */
type EnqueueLinksType = PlaywrightCrawlingContext<Dictionary>['enqueueLinks'];

/**
 * A process request options interface.
 */
interface ProcessRequestOptions {
    page: Page;
    request: Request;
    userData: RequestUserData;
    enqueueLinks: EnqueueLinksType;
}

/**
 * A process request result type.
 */
type ProcessRequestResult =
    | { uniqueKeys: string[]; result: null }
    | {
          uniqueKeys: null;
          result: ScraperPageContent;
      }
    | { uniqueKeys: null; result: null; error: Error };

export type { ProcessRequestOptions, ProcessRequestResult };
