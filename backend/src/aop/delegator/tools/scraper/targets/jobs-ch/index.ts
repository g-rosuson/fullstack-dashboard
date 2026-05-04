import { logger } from 'aop/logging';

import constants from './constants';

import type { ScraperTarget, ScraperTargetConfig } from '../../types';
import type { Page } from 'playwright';
import type {
    ExecutionScraperDescription,
    ExecutionScraperInformation,
    ExecutionScraperPageContent,
    ExecutionScraperTargetResult,
} from 'shared/types/jobs/tools/execution/types-execution-scraper-tool';

import { chromium } from 'playwright';
import { retryWithFixedInterval } from 'utils/async/utils-async-retry';

/**
 * Build a search URL for jobs.ch with keyword and pagination params.
 */
function buildSearchUrl(keywords: string[], pageIndex: number): string {
    const params = new URLSearchParams({
        term: keywords.join(' '),
        page: pageIndex.toString(),
    });
    return `${constants.configuration.baseUrl}?${params.toString()}`;
}

/**
 * Extract the trimmed text content of the title element.
 */
async function extractTitle(page: Page): Promise<string> {
    const text = await page.textContent(constants.selectors.titleSelector).catch(() => null);
    return text?.trim() ?? '';
}

/**
 * Extract structured description sections from the jobs.ch detail page.
 *
 * jobs.ch markup uses alternating section titles (in `p > strong`) and content
 * blocks (paragraphs or list items). The first direct child of the description
 * container is a CTA box ("You are a great fit for this position.") which we
 * skip.
 */
async function extractDescriptions(page: Page): Promise<ExecutionScraperDescription[]> {
    const container = page.locator(constants.selectors.descriptionSelector);

    if ((await container.count()) === 0) {
        return [];
    }

    return container.evaluate((containerElement, selectors) => {
        const sections: { title?: string; blocks: string[] }[] = [];
        let current: { title?: string; blocks: string[] } | null = null;

        const children = Array.from(containerElement.children);
        let firstChildSkipped = false;

        for (const child of children) {
            // Skip the first child (CTA box).
            if (!firstChildSkipped) {
                firstChildSkipped = true;
                continue;
            }

            const spans = Array.from(child.querySelectorAll(selectors.allSpans));

            for (const span of spans) {
                const text = span.textContent?.trim();
                if (!text) {
                    continue;
                }

                /**
                 * Section title: a span whose closest ancestor is `p > strong`.
                 * Finalize the previous section before starting a new one.
                 */
                if (span.closest(selectors.titleContainer)) {
                    if (current && current.blocks.length > 0) {
                        sections.push(current);
                    }
                    current = { title: text, blocks: [] };
                    continue;
                }

                const parentParagraph = span.closest(selectors.paragraph);
                const parentListItem = span.closest(selectors.listItem);

                /**
                 * Plain paragraph (not a title): a `<p>` that doesn't contain a `<strong>`.
                 */
                if (parentParagraph && !parentParagraph.querySelector(selectors.strong)) {
                    if (!current) {
                        current = { blocks: [] };
                    }
                    current.blocks.push(text);
                } else if (parentListItem) {
                    if (!current) {
                        current = { blocks: [] };
                    }
                    current.blocks.push(text);
                }
            }
        }

        if (current && current.blocks.length > 0) {
            sections.push(current);
        }

        return sections;
    }, constants.selectors.descriptionParsing);
}

/**
 * Extract a list of label/value information items from the info block.
 *
 * Each list item has 2 text spans — the first is the label, the second the
 * value. SVG-only spans (icons) are filtered out.
 */
async function extractInformations(page: Page): Promise<ExecutionScraperInformation[]> {
    const container = page.locator(constants.selectors.infoSelector);

    if ((await container.count()) === 0) {
        return [];
    }

    return container.evaluate((containerElement, selectors) => {
        const items: { label: string; value: string }[] = [];

        const list = containerElement.querySelector(selectors.list);
        if (!list) {
            return items;
        }

        const listItems = Array.from(list.querySelectorAll(selectors.listItem));

        for (const listItem of listItems) {
            const spans = Array.from(listItem.querySelectorAll(selectors.span));
            const texts: string[] = [];

            for (const span of spans) {
                const hasSvg = span.querySelector(selectors.svg) !== null;
                if (hasSvg) {
                    continue;
                }

                const text = span.textContent?.trim();
                if (text) {
                    texts.push(text);
                }
            }

            if (texts.length >= 2) {
                items.push({ label: texts[0], value: texts[1] });
            } else if (texts.length === 1) {
                items.push({ label: '', value: texts[0] });
            }
        }

        return items;
    }, constants.selectors.informationParsing);
}

/**
 * Extract the company name from the detail page.
 *
 * Handles two markup variants:
 * 1. With link: an anchor `[data-cy="company-link"]` contains a span with the name.
 * 2. Without link: a `[data-cy="vacancy-logo"]` div contains a span with the name
 *    (filtered against an SVG logo span).
 */
async function extractCompanyName(page: Page): Promise<ExecutionScraperInformation | null> {
    const parsing = constants.selectors.companyNameParsing;

    const companyLink = await page.$(constants.selectors.companyNameSelector);
    if (companyLink) {
        const value = await companyLink.evaluate((element, spanSelector) => {
            const span = element.querySelector(spanSelector);
            return span?.textContent?.trim() ?? null;
        }, parsing.span);

        if (value) {
            return { label: parsing.label, value };
        }
    }

    const vacancyLogo = await page.$(constants.selectors.vacancyLogoSelector);
    if (vacancyLogo) {
        const value = await vacancyLogo.evaluate(
            (element, args) => {
                const spans = Array.from(element.querySelectorAll(args.span)) as HTMLSpanElement[];
                for (const span of spans) {
                    const hasSvg = span.querySelector(args.svg) !== null;
                    if (hasSvg) {
                        continue;
                    }
                    const text = span.textContent?.trim();
                    if (text) {
                        return text;
                    }
                }
                return null;
            },
            { span: parsing.span, svg: parsing.svg }
        );

        if (value) {
            return { label: parsing.label, value };
        }
    }

    return null;
}

/**
 * Scrape a single jobs.ch detail page into a fully-formed page content payload.
 */
async function scrapeDetailPage(page: Page, url: string): Promise<ExecutionScraperPageContent> {
    await page.waitForSelector(constants.selectors.titleSelector);

    const title = await extractTitle(page);
    const descriptions = await extractDescriptions(page);
    const informations = await extractInformations(page);

    const company = await extractCompanyName(page);
    informations.push({ label: 'Company', value: company?.value ?? '' });

    return { url, title, descriptions, informations };
}

/**
 * jobs.ch target.
 *
 * Strategy: walk listing URLs by pagination, collect vacancy detail URLs, then scrape
 * each detail page sequentially on one tab.
 */
const jobsChTarget: ScraperTarget = {
    async run(scraperTargetConfig: ScraperTargetConfig): Promise<ExecutionScraperTargetResult[]> {
        const browser = await chromium.launch();
        const page = await browser.newPage();

        try {
            const jobDetailUrlSet = new Set<string>();
            const jobDetailUrlPrefix = constants.configuration.detailUrlPrefix;
            const { maxPages } = scraperTargetConfig;
            let currentPageIndex = 1;

            /**
             * Re-evaluate each iteration: `maxPages === 0` means unlimited (stop only on URL `break`);
             * otherwise stop after `goto`/`scrape` for pages `1 … maxPages` (see `finally` increment).
             */
            while (maxPages === 0 || currentPageIndex <= maxPages) {
                /**
                 * Retry navigation to the search result page up to 3 times with a 1 second delay between attempts.
                 */
                try {
                    await retryWithFixedInterval(
                        async () => {
                            await page.goto(buildSearchUrl(scraperTargetConfig.keywords, currentPageIndex));
                            await page.waitForSelector(constants.selectors.resultsContainer);
                        },
                        {
                            maxAttempts: scraperTargetConfig.totalAttempts,
                            delayMs: scraperTargetConfig.retryDelayMs,
                            operationName: 'navigate to search result page',
                        }
                    );

                    /**
                     * Skip this on page 1: the first results page drops `page=1`
                     * from the URL even when listings exist, so we would quit too soon.
                     */
                    if (currentPageIndex > 1 && !page.url().includes(`page=${currentPageIndex}`)) {
                        break;
                    }
                } catch (error) {
                    continue;
                } finally {
                    // * Note: finally always runs (unless the runtime aborts), so the increment always happens—including on break.
                    currentPageIndex++;
                }

                /**
                 * Resolve attributes with `URL` using the listing document URL as base so
                 * relative `/en/vacancies/detail/…`-style `href`s are kept; filter by prefix.
                 */
                const listingBaseHref = page.url();

                const jobDetailUrls = await page.$$eval(
                    constants.selectors.itemSelector,
                    (elements, args) => {
                        const prefix = args.jobDetailUrlPrefix;
                        const baseHref = args.listingBaseHref;
                        const absolute: string[] = [];

                        for (const el of elements) {
                            try {
                                const raw = el.getAttribute('href');

                                if (!raw?.trim()) {
                                    continue;
                                }

                                const url = new URL(raw.trim(), baseHref);

                                if (url.href.startsWith(prefix)) {
                                    absolute.push(url.href);
                                }
                            } catch {
                                /* malformed URL, continue to the next one */
                                continue;
                            }
                        }

                        return absolute;
                    },
                    {
                        jobDetailUrlPrefix,
                        listingBaseHref,
                    }
                );

                for (const url of jobDetailUrls) {
                    jobDetailUrlSet.add(url);
                }
            }

            /**
             * Scrape each detail page sequentially on one tab.
             */
            const results: ExecutionScraperTargetResult[] = [];

            for (const url of jobDetailUrlSet) {
                try {
                    await retryWithFixedInterval(
                        async () => {
                            await page.goto(url);
                        },
                        {
                            maxAttempts: scraperTargetConfig.totalAttempts,
                            delayMs: scraperTargetConfig.retryDelayMs,
                            operationName: 'navigate to job detail page',
                        }
                    );
                } catch (error) {
                    results.push({
                        result: null,
                        error: { message: `Failed to navigate to job detail page: ${url}` },
                    });
                    continue;
                }

                /**
                 * Scrape the job detail page and push the result to the results array.
                 * If any errors occur, push a null result and an error message.
                 */
                try {
                    const result = await scrapeDetailPage(page, url);

                    results.push({
                        result: result,
                        error: null,
                    });
                } catch (error) {
                    logger.error('Failed to scrape job detail page', { error: error as Error });
                    results.push({
                        result: null,
                        error: { message: 'Failed to scrape job detail page' },
                    });
                }
            }

            return results;
        } catch (error) {
            logger.error('jobs-ch target failed', { error: error as Error });

            return [
                {
                    result: null,
                    error: { message: 'Failed to scrape jobs.ch' },
                },
            ];
        } finally {
            await page.close().catch(error => logger.error('Error closing chrome page', { error }));
            await browser.close().catch(error => logger.error('Error closing chrome browser', { error }));
        }
    },
};

export default jobsChTarget;
