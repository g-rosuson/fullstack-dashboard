import { logger } from 'aop/logging';

import scraperConstants from '../../constants';
import constants from './constants';

import type { ScraperDescriptionSection, ScraperInformationRow, ScraperTarget, ScraperTargetConfig } from '../../types';
import type { Page } from 'playwright';
import type { ExecutionScrapedItem } from 'shared/types/jobs/tools/execution/types-execution-scraper-tool';

import { formatListingBodyFromSections, informationsToFields, listingKeyFrom } from '../../helpers';
import { chromium } from 'playwright';
import { retryWithFixedInterval } from 'utils/async/utils-async-retry';

/**
 * Build a jobich.ch search URL.
 * Format: `https://jobich.ch/?q=<query>#search`
 */
export function buildSearchUrl(keywords: string[]): string {
    const params = new URLSearchParams();
    if (keywords.length > 0) {
        params.set('q', keywords.join(' '));
    }

    const query = params.toString();
    const queryString = query ? `?${query}` : '';
    return `${constants.configuration.baseUrl}${queryString}#search`;
}

/**
 * Extract the title text from `vacancy-card-header > h2`.
 */
async function extractTitle(page: Page): Promise<string> {
    const text = await page.textContent(constants.selectors.titleSelector).catch(() => null);
    return text?.trim() || '[TITLE NOT FOUND]';
}

/**
 * Group an array of `<br>`-delimited text lines into description sections.
 *
 * jobich.ch uses a flat `<br>`-separated layout inside `vacancy-card-desc > div`:
 *
 *   Intro paragraph.<br>
 *   Tasks<br><br>
 *   Item 1<br>
 *   Item 2<br><br>
 *   Skills<br><br>
 *   Item 1<br>
 *   ...
 *
 * After replacing `<br>` with `\n` and splitting, both a title line ("Tasks")
 * and the last content line of a section ("Collaborate...") are followed by
 * an empty line — `<br><br>` looks the same after either. Titles are
 * therefore distinguished by length: a short non-empty line followed by an
 * empty line is treated as a title; a long line is treated as content.
 */
export function groupDescriptionLines(lines: string[]): ScraperDescriptionSection[] {
    /**
     * Maximum character length and word count for a line to be considered a
     * section title. jobich.ch sections are short labels like "Tasks", "Skills",
     * "Required Qualifications". Content lines are full sentences.
     */
    const TITLE_MAX_CHARS = 40;
    const TITLE_MAX_WORDS = 5;

    const sections: ScraperDescriptionSection[] = [];
    let current: ScraperDescriptionSection | null = null;

    const isTitleCandidate = (line: string): boolean => {
        if (line.length === 0 || line.length > TITLE_MAX_CHARS) {
            return false;
        }
        const wordCount = line.split(/\s+/).filter(Boolean).length;
        return wordCount > 0 && wordCount <= TITLE_MAX_WORDS;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) {
            continue;
        }

        const nextIsEmpty = i + 1 < lines.length && lines[i + 1] === '';
        const isTitle = nextIsEmpty && isTitleCandidate(line);

        if (isTitle) {
            if (current && current.blocks.length > 0) {
                sections.push(current);
            }
            current = { title: line, blocks: [] };
            continue;
        }

        if (!current) {
            current = { blocks: [] };
        }
        current.blocks.push(line);
    }

    if (current && current.blocks.length > 0) {
        sections.push(current);
    }

    return sections;
}

/**
 * Extract structured description sections from the jobich.ch overlay.
 *
 * The description is a flat block of text with `<br>` separators (no `<p>` /
 * `<strong>` structure). We grab the innerHTML, normalise `<br>` to newlines,
 * strip any other inline tags, decode entities (via the textarea trick), then
 * group lines into sections.
 */
async function extractDescriptions(page: Page): Promise<ScraperDescriptionSection[]> {
    const container = page.locator(constants.selectors.descriptionSelector);

    if ((await container.count()) === 0) {
        return [];
    }

    const lines = await container.evaluate(element => {
        const html = element.innerHTML.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');

        // Decode HTML entities (&amp;, &nbsp;, etc.) by routing the string
        // through a textarea — a small, dependency-free, browser-native trick.
        const textarea = document.createElement('textarea');
        textarea.innerHTML = html;
        const decoded = textarea.value;

        return decoded.split('\n').map(line => line.trim());
    });

    return groupDescriptionLines(lines);
}

/**
 * Extract a single info block (`<div>` with direct `<span>` children) into
 * label/value pairs. The label is derived from class detection or position:
 *
 * - `<strong>` child   -> "Company"
 * - `.source` class    -> "Source"
 * - `.tag-industry`    -> "Industry"
 * - otherwise          -> positional fallback or `defaultLabel`
 *
 * Spans with no text content are skipped.
 */
async function extractInfoBlock(
    page: Page,
    blockSelector: string,
    options: {
        positionalLabels?: readonly string[];
        defaultLabel: string;
    }
): Promise<ScraperInformationRow[]> {
    const block = page.locator(blockSelector);

    if ((await block.count()) === 0) {
        return [];
    }

    const items = await block.evaluate(
        (element, args) => {
            const spans = Array.from(element.querySelectorAll(':scope > span'));
            return spans.map(span => ({
                hasStrong: span.querySelector('strong') !== null,
                isSource: span.classList.contains(args.sourceClass),
                isIndustry: span.classList.contains(args.industryClass),
                text: span.textContent?.trim() ?? '',
            }));
        },
        {
            sourceClass: constants.selectors.meta.sourceClass,
            industryClass: constants.selectors.tags.industryClass,
        }
    );

    const informations: ScraperInformationRow[] = [];
    items.forEach((item, index) => {
        if (!item.text) {
            return;
        }

        let label: string;
        if (item.hasStrong) {
            label = 'Company';
        } else if (item.isSource) {
            label = 'Source';
        } else if (item.isIndustry) {
            label = 'Industry';
        } else {
            label = options.positionalLabels?.[index] ?? options.defaultLabel;
        }

        informations.push({ label, value: item.text });
    });

    return informations;
}

/**
 * Extract all metadata items from the jobich.ch overlay.
 *
 * The overlay has two sibling info blocks: `vacancy-card-meta` (Company,
 * Location, Source, Posted) and `vacancy-card-tags` (Industry plus other
 * unlabelled tags like "Onsite", "Full-time", "Management").
 */
async function extractInformations(page: Page): Promise<ScraperInformationRow[]> {
    const meta = await extractInfoBlock(page, constants.selectors.metaSelector, {
        positionalLabels: constants.configuration.metaLabels,
        defaultLabel: '',
    });

    const tags = await extractInfoBlock(page, constants.selectors.tagsSelector, {
        defaultLabel: 'Tag',
    });

    return [...meta, ...tags];
}

/**
 * Extract the source URL from the jobich.ch overlay.
 * @param page - The page to extract the source URL from.
 * @returns The source URL.
 */
async function extractSourceUrl(page: Page): Promise<string> {
    const href = await page
        .locator(constants.selectors.sourceUrl)
        .getAttribute('href')
        .catch(() => null);
    return href?.trim() || '[SOURCE URL NOT FOUND]';
}

/**
 * Scrape the open vacancy overlay into an execution listing (canonical URL from source link).
 */
async function scrapeOverlayListing(page: Page): Promise<ExecutionScrapedItem> {
    await page.waitForSelector(constants.selectors.overlayContainer);

    const title = await extractTitle(page);
    const descriptions = await extractDescriptions(page);
    const informations = await extractInformations(page);
    const sourceUrl = await extractSourceUrl(page);

    const text = formatListingBodyFromSections(descriptions, informations, scraperConstants.MAX_LISTING_TEXT_CHARS);
    const fields = informationsToFields(informations);

    return {
        ok: true,
        listingKey: listingKeyFrom('job-ich', sourceUrl),
        source: 'job-ich',
        url: sourceUrl,
        title,
        text,
        fields,
    };
}

/**
 * jobich.ch target.
 *
 * Strategy: jobich.ch has no per-job URLs and uses a single-page table with a
 * "Show more" button. We navigate to the search page, click "Show more" up to
 * `maxPages - 1` times (the first batch is already loaded), then iterate every
 * row, click it to open the overlay, scrape, and collect results.
 */
const jobIchTarget: ScraperTarget = {
    async run(scraperTargetConfig: ScraperTargetConfig): Promise<ExecutionScrapedItem[]> {
        const browser = await chromium.launch();
        const page = await browser.newPage();

        try {
            const listingUrl = buildSearchUrl(scraperTargetConfig.keywords);
            const maxPages = scraperTargetConfig.maxPages;
            const resultsSelector = constants.selectors.resultsContainer;

            /**
             * Retry navigation to the search page.
             */
            try {
                await retryWithFixedInterval(
                    async () => {
                        await page.goto(listingUrl);
                        await page.waitForSelector(resultsSelector);
                    },
                    {
                        maxAttempts: scraperTargetConfig.totalAttempts,
                        delayMs: scraperTargetConfig.retryDelayMs,
                        operationName: 'navigate to jobich.ch search page',
                    }
                );
            } catch {
                return [
                    {
                        ok: false,
                        listingKey: listingKeyFrom('job-ich', listingUrl),
                        source: 'job-ich',
                        url: listingUrl,
                        error: {
                            code: 'NAVIGATION_FAILED',
                            message: `Failed to navigate to jobich.ch search: ${listingUrl}`,
                        },
                    },
                ];
            }

            /**
             * First batch is already loaded; for bounded mode we subtract 1 from maxPages.
             * A maxPages value of 0 means unlimited mode, so keep clicking until the button
             * is missing, disabled, or hidden.
             */
            const maxClicks = maxPages === 0 ? Number.POSITIVE_INFINITY : Math.max(0, maxPages - 1);
            const waitAfterClickMs = constants.configuration.showMoreLoadDelayMs;

            for (let i = 0; i < maxClicks; i++) {
                const button = page.locator(constants.selectors.showMoreButton);

                if ((await button.count()) === 0) {
                    break;
                }

                const first = button.first();

                const isDisabled = await first.isDisabled().catch(() => false);
                if (isDisabled) {
                    break;
                }

                const isVisible = await first.isVisible().catch(() => false);
                if (!isVisible) {
                    break;
                }

                await first.click();
                await new Promise<void>(resolve => setTimeout(resolve, waitAfterClickMs));
            }

            const listings: ExecutionScrapedItem[] = [];
            const rows = page.locator(constants.selectors.jobRow);
            const count = await rows.count();

            for (let i = 0; i < count; i++) {
                const rowUrl = `${listingUrl}#row-${i}`;

                try {
                    await rows.nth(i).click();

                    listings.push(await scrapeOverlayListing(page));

                    await page.keyboard.press('Escape');
                    await page
                        .waitForSelector(constants.selectors.overlayContainer, { state: 'detached' })
                        .catch(() => {
                            // Overlay may already be detached; ignore.
                        });
                } catch (error) {
                    logger.error('Failed to scrape jobich.ch row', { error: error as Error });
                    const message = error instanceof Error ? error.message : String(error);
                    listings.push({
                        ok: false,
                        listingKey: listingKeyFrom('job-ich', rowUrl),
                        source: 'job-ich',
                        url: rowUrl,
                        error: {
                            code: 'SCRAPE_FAILED',
                            message: `Failed to scrape job index ${i}: ${message}`,
                        },
                    });
                }
            }

            return listings;
        } catch (error) {
            logger.error('job-ich target failed', { error: error as Error });

            return [
                {
                    ok: false,
                    listingKey: listingKeyFrom('job-ich', 'job-ich:fatal'),
                    source: 'job-ich',
                    url: '',
                    error: {
                        code: 'TARGET_FAILED',
                        message: 'Failed to scrape jobich.ch',
                    },
                },
            ];
        } finally {
            await page.close().catch(closeError => logger.error('Error closing chrome page', { error: closeError }));
            await browser
                .close()
                .catch(closeError => logger.error('Error closing chrome browser', { error: closeError }));
        }
    },
};

export default jobIchTarget;
