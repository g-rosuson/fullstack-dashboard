import type { JobFormSheetToolScraper } from '@/components/pages/jobs/components/jobSheet/types/JobSheet.types';

import { ScraperToolTargetName } from '@/_types/_gen';

/**
 * The state of a scraper tool target.
 */
interface ScraperToolTargetState {
    target: ScraperToolTargetName;
    label: string;
    keyword: string;
    keywords: string[];
    maxPages: number;
}

/**
 * The props for the ScraperTool component.
 */
interface ScraperToolProps {
    tool: JobFormSheetToolScraper;
    onChange: (tool: JobFormSheetToolScraper) => void;
}

export type { ScraperToolTargetState, ScraperToolProps };
