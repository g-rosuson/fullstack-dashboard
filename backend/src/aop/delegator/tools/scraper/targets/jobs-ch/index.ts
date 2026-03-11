import scraperConstants from '../../constants';
import constants from './constants';

import type { DescriptionSection, InformationItem } from '../../types';
import type { ProcessRequestOptions, ProcessRequestResult } from './types';
import type { Page } from 'playwright';

/**
 * A jobs.ch target extractor implementation.
 */
class JobsChTarget {
    constructor() {
        this.buildRequestUrl = this.buildRequestUrl.bind(this);
        this.getTitle = this.getTitle.bind(this);
        this.getDescription = this.getDescription.bind(this);
        this.getInformation = this.getInformation.bind(this);
        this.getCompanyName = this.getCompanyName.bind(this);
    }

    /**
     * Builds a search URL with keywords and page number for jobs.ch pagination.
     *
     * @param keywords - Array of search keywords to join into a search term
     * @param baseUrl - Base URL for the jobs.ch search endpoint
     * @param page - Page number for pagination
     * @returns Complete search URL with encoded query parameters
     */
    private buildRequestUrl(keywords: string[], baseUrl: string, page: number): string {
        const searchTerm = keywords.join(' ');
        const params = new URLSearchParams({ term: searchTerm, page: page.toString() });
        return `${baseUrl}?${params.toString()}`;
    }

    /**
     * Extracts the job title from a jobs.ch vacancy page.
     *
     * @param page - Playwright Page instance for DOM access
     * @returns Job title text or empty string if not found
     */
    private async getTitle(page: Page): Promise<string> {
        return (await page.textContent(constants.selectors.titleSelector)) || '';
    }

    /**
     * Extracts structured description sections from jobs.ch vacancy pages.
     *
     * Parses description container to extract section titles and content blocks.
     * Handles untitled intro paragraphs, skips the first CTA container, and groups
     * content by sections with optional titles.
     *
     * @param page - Playwright Page instance for DOM access
     * @returns Array of description sections, each with optional title and blocks array
     */
    private async getDescription(page: Page): Promise<DescriptionSection[]> {
        const container = page.locator(constants.selectors.descriptionSelector);

        return await container.evaluate((containerElement, selectors) => {
            /**
             * Accumulated sections to return.
             * Each section has an optional title and an array of content blocks.
             */
            const tmpSections: DescriptionSection[] = [];

            /**
             * Current section being built.
             * Null when no section has been started yet (before first title or content).
             */
            let current: DescriptionSection | null = null;

            /**
             * Flag to skip the first container which contains the jobs.ch CTA box.
             */
            let isFirstContainer = true;

            /**
             * Iterate through direct children of the description container.
             * This allows us to skip the first CTA container and process content in order.
             * The container element is passed as a parameter from the locator.evaluate() call.
             */
            const children = Array.from(containerElement.children);

            for (const child of children) {
                /**
                 * Skip the first container which contains the jobs.ch CTA box
                 * with "You are a great fit for this position." text.
                 */
                if (isFirstContainer) {
                    isFirstContainer = false;
                    continue;
                }

                /**
                 * Find all relevant spans within this child element.
                 * Selector matches:
                 * - p > strong > span (section titles)
                 * - p > span (paragraph content)
                 * - ul > li > span (list item content)
                 */
                const spans = Array.from(child.querySelectorAll(selectors.allSpans));

                for (const span of spans) {
                    /**
                     * Extract and trim text content.
                     * Skip empty spans (handles empty span elements).
                     */
                    const text = span.textContent?.trim();

                    if (!text) {
                        continue;
                    }

                    /**
                     * Handle section titles: p > strong > span
                     * When a title is found:
                     * 1. Finalize and push the previous section if it has content
                     * 2. Start a new section with the title
                     */
                    if (span.closest(selectors.titleContainer)) {
                        // Finalize previous section before starting a new one
                        if (current && current.blocks.length > 0) {
                            tmpSections.push(current);
                        }

                        // Start new section with title
                        current = { title: text, blocks: [] };
                        continue;
                    }

                    /**
                     * Handle content blocks: regular paragraphs or list items.
                     * Check parent structure to determine content type.
                     */
                    const parentParagraph = span.closest(selectors.paragraph);
                    const parentListItem = span.closest(selectors.listItem);

                    /**
                     * Regular paragraph content (not a title).
                     * Condition: span is in a p tag, but that p tag doesn't contain a strong element.
                     */
                    if (parentParagraph && !parentParagraph.querySelector(selectors.strong)) {
                        // Initialize untitled section if no current section exists
                        if (!current) {
                            current = { blocks: [] };
                        }

                        current.blocks.push(text);

                        /**
                         * List item content: ul > li > span
                         */
                    } else if (parentListItem) {
                        // Initialize untitled section if no current section exists
                        if (!current) {
                            current = { blocks: [] };
                        }

                        current.blocks.push(text);
                    }
                }
            }

            /**
             * Finalize and push the last section if it has content.
             * This handles the case where the last section doesn't have a following title.
             */
            if (current && current.blocks.length > 0) {
                tmpSections.push(current);
            }

            return tmpSections;
        }, constants.selectors.descriptionParsing);
    }

    /**
     * Extracts information items (label-value pairs) from jobs.ch vacancy pages.
     *
     * Parses list items to extract structured information, filtering out SVG icon spans.
     * Uses first span as label and second span as value, with fallback for single-span items.
     *
     * @param page - Playwright Page instance for DOM access
     * @returns Array of information items with label and value properties
     */
    private async getInformation(page: Page): Promise<InformationItem[]> {
        const container = page.locator(constants.selectors.infoSelector);

        return await container.evaluate((containerElement, selectors) => {
            /**
             * Accumulated information items to return.
             * Each item has a label and value.
             */
            const informationItems: Array<{ label: string; value: string }> = [];

            /**
             * Get the list container within the info element.
             * Early return if container or list is not found.
             */
            if (!containerElement) {
                return informationItems;
            }

            const listElement = containerElement.querySelector(selectors.list);

            if (!listElement) {
                return informationItems;
            }

            /**
             * Iterate through list items to extract information.
             */
            const listItems = Array.from(listElement.querySelectorAll(selectors.listItem));

            for (const listItem of listItems) {
                /**
                 * Find all span elements within this list item.
                 */
                const spanElements = Array.from(listItem.querySelectorAll(selectors.span));
                const textSpans: string[] = [];

                /**
                 * Filter out spans that contain SVG (icon spans) and get text content.
                 * Only collect non-empty text spans.
                 */
                for (const spanElement of spanElements) {
                    const hasSvg = spanElement.querySelector(selectors.svg) !== null;

                    if (!hasSvg) {
                        const text = spanElement.textContent?.trim();

                        if (text) {
                            textSpans.push(text);
                        }
                    }
                }

                /**
                 * Create information item from text spans.
                 * jobs.ch markup: first span is label, second span is value.
                 */
                if (textSpans.length >= 2) {
                    informationItems.push({
                        label: textSpans[0],
                        value: textSpans[1],
                    });
                } else if (textSpans.length === 1) {
                    /**
                     * Fallback: if only one span found, use it as value with empty label.
                     */
                    informationItems.push({
                        label: '',
                        value: textSpans[0],
                    });
                }
            }

            return informationItems;
        }, constants.selectors.informationParsing);
    }

    /**
     * Extracts company name from jobs.ch vacancy pages.
     *
     * Handles two markup cases:
     * 1. With link: data-cy="company-link" > span (anchor tag with company name)
     * 2. Without link: data-cy="vacancy-logo" > div > span with fw_semibold class
     *
     * @param page - Playwright Page instance for DOM access
     * @returns Information item object with label 'Company' and company name value, or null if not found
     */
    private async getCompanyName(page: Page): Promise<InformationItem | null> {
        const selectors = constants.selectors.companyNameParsing;

        /**
         * First try: look for company link (case with anchor tag)
         */
        const companyLink = await page.$(constants.selectors.companyNameSelector);

        if (companyLink) {
            const companyName = await companyLink.evaluate((element: Element, spanSelector: string) => {
                const span = element.querySelector(spanSelector);
                return span?.textContent?.trim() || null;
            }, selectors.span);

            if (companyName) {
                return {
                    label: selectors.label,
                    value: companyName,
                };
            }
        }

        /**
         * Second try: look for vacancy-logo container (case without link)
         */
        const vacancyLogo = await page.$(constants.selectors.vacancyLogoSelector);

        if (vacancyLogo) {
            const companyName = await vacancyLogo.evaluate(
                (element: Element, selectors: { span: string; svg: string }) => {
                    /**
                     * Find span that doesn't contain an SVG (company name span)
                     */
                    const spans = Array.from(element.querySelectorAll(selectors.span)) as HTMLSpanElement[];

                    for (const span of spans) {
                        const hasSvg = span.querySelector(selectors.svg) !== null;

                        if (!hasSvg) {
                            const text = span.textContent?.trim();

                            if (text) {
                                return text;
                            }
                        }
                    }

                    return null;
                },
                { span: selectors.span, svg: selectors.svg }
            );

            if (companyName) {
                return {
                    label: selectors.label,
                    value: companyName,
                };
            }
        }

        return null;
    }

    /**
     * Processes requests for jobs.ch scraping operations.
     *
     * Handles two request types:
     * - Extraction requests: Scrapes job detail pages and returns structured data
     * - Target requests: Enqueues extraction requests by paginating through search results
     *
     * @param page - Playwright Page instance for DOM access and navigation
     * @param request - Request object containing label and userData
     * @param userData - Custom data for additional request context
     * @param enqueueLinks - Function to enqueue new extraction requests from links
     * @returns Object with either extraction result and null uniqueKeys, or uniqueKeys array and null result
     */
    public async processRequest({
        page,
        request,
        userData,
        enqueueLinks,
    }: ProcessRequestOptions): Promise<ProcessRequestResult> {
        try {
            /**
             * Extract job detail page data.
             */
            if (request.userData.label === scraperConstants.requestLabels.extractionRequest) {
                // Navigate to the request URL and wait for the title selector to be present.
                await page.goto(request.url);
                await page.waitForSelector(constants.selectors.titleSelector);

                const title = await this.getTitle(page);
                const companyName = await this.getCompanyName(page);
                const information = await this.getInformation(page);
                information.push({
                    label: 'Company',
                    value: companyName?.value || '',
                });
                const description = await this.getDescription(page);

                return { result: { url: request.url, title, description, information }, uniqueKeys: null };
            }

            /**
             * Handle target requests by enqueuing extraction requests, to be handled by the extraction logic above.
             */
            const uniqueKeys = [];

            for (let pageIndex = 1; pageIndex <= userData.maxPages; pageIndex++) {
                // Navigate to the request URL and wait for the results container to be present.
                const requestUrl = this.buildRequestUrl(userData.keywords, constants.configuration.baseUrl, pageIndex);

                await page.goto(requestUrl);
                await page.waitForSelector(constants.selectors.resultsContainer);

                // Determine the current URL and check if the page exists.
                const currentUrl = page.url();

                // Break the loop when the page does not exist
                const doesPageExist = currentUrl.includes('page=' + pageIndex);

                if (!doesPageExist) {
                    break;
                }

                /**
                 * Enqueue extraction requests and only process requests that adhear to the glob pattern.
                 */
                const result = await enqueueLinks({
                    baseUrl: constants.configuration.baseUrl,
                    selector: constants.selectors.itemSelector,
                    globs: constants.configuration.extractionGlobs,
                    transformRequestFunction: tmpRequest => ({
                        uniqueKey: `extraction-request-${userData.targetId}-${tmpRequest.url}`,
                        ...tmpRequest,
                        userData: {
                            targetId: userData.targetId,
                            target: userData.target,
                            keywords: userData.keywords,
                            maxPages: userData.maxPages,
                            label: scraperConstants.requestLabels.extractionRequest,
                        },
                    }),
                });

                // Only process requests that adhear to the glob pattern.
                for (const request of result.processedRequests) {
                    uniqueKeys.push(request.uniqueKey);
                }
            }

            return { uniqueKeys, result: null };
        } catch (error) {
            return { result: null, uniqueKeys: null, error: error as Error };
        }
    }
}

export default JobsChTarget;
