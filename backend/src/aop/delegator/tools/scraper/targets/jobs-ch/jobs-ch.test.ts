import { beforeEach, describe, expect, it, vi } from 'vitest';

import constants from './constants';

import type { ScraperTargetConfig } from '../../types';
import type { Locator, Page } from 'playwright';

vi.mock('utils/async/utils-async-retry', () => ({
    retryWithFixedInterval: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

vi.mock('playwright', () => ({
    chromium: {
        launch: vi.fn(),
    },
}));

import jobsChTarget from './index';
import { chromium } from 'playwright';
import { retryWithFixedInterval } from 'utils/async/utils-async-retry';

/**
 * Build a fake Page where each extraction call (textContent, locator(...).evaluate, $)
 * returns canned values. The target reads selectors from constants and dispatches
 * to one of three flows: title (textContent), descriptions/informations (locator
 * evaluate), company name ($-based element handles).
 */
const buildPage = (options?: {
    title?: string | null;
    descriptions?: { title?: string; blocks: string[] }[];
    informations?: { label: string; value: string }[];
    companyLink?: { value: string | null } | null;
    vacancyLogo?: { value: string | null } | null;
    /** Return shapes from successive `$$eval` calls (one per listing page visited). */
    listingDetailUrlBatches?: string[][];
}): Page => {
    const titleValue = options?.title ?? 'Engineer';
    const descriptions = options?.descriptions ?? [];
    const informations = options?.informations ?? [];

    const descLocator = {
        count: vi.fn().mockResolvedValue(1),
        evaluate: vi.fn().mockResolvedValue(descriptions),
    } as unknown as Locator;

    const infoLocator = {
        count: vi.fn().mockResolvedValue(1),
        evaluate: vi.fn().mockResolvedValue(informations),
    } as unknown as Locator;

    let currentListingPage = 1;

    const listingBatches = options?.listingDetailUrlBatches ?? [
        ['https://www.jobs.ch/en/vacancies/detail/1'],
        ['https://www.jobs.ch/en/vacancies/detail/2'],
    ];

    const $$eval = vi.fn().mockImplementation(() => {
        const batchIndex = Math.min($$eval.mock.calls.length - 1, listingBatches.length - 1);
        return Promise.resolve(listingBatches[batchIndex] ?? []);
    });

    const page = {
        goto: vi.fn().mockImplementation((u: string) => {
            const m = u.match(/[?&]page=(\d+)/);
            if (m && u.includes('vacancies/') && !u.includes('/detail/')) {
                currentListingPage = Number(m[1]);
            }
            return Promise.resolve(undefined);
        }),
        url: vi
            .fn()
            .mockImplementation(() => `https://www.jobs.ch/en/vacancies/?term=software&page=${currentListingPage}`),
        $$eval,
        waitForSelector: vi.fn().mockResolvedValue(undefined),
        textContent: vi.fn().mockResolvedValue(titleValue),
        locator: vi.fn().mockImplementation((selector: string) => {
            if (selector === constants.selectors.descriptionSelector) return descLocator;
            if (selector === constants.selectors.infoSelector) return infoLocator;
            return { count: vi.fn().mockResolvedValue(0), evaluate: vi.fn() };
        }),
        $: vi.fn().mockImplementation((selector: string) => {
            if (selector === constants.selectors.companyNameSelector && options?.companyLink) {
                return {
                    evaluate: vi.fn().mockResolvedValue(options.companyLink.value),
                };
            }
            if (selector === constants.selectors.vacancyLogoSelector && options?.vacancyLogo) {
                return {
                    evaluate: vi.fn().mockResolvedValue(options.vacancyLogo.value),
                };
            }
            return null;
        }),
        close: vi.fn().mockResolvedValue(undefined),
    } as unknown as Page;

    return page;
};

function buildTargetConfig(overrides?: Partial<ScraperTargetConfig>): ScraperTargetConfig {
    return {
        targetId: 't',
        target: 'jobs-ch',
        keywords: ['software'],
        maxPages: 2,
        totalAttempts: 3,
        retryDelayMs: 1000,
        ...overrides,
    };
}

async function runTarget(page: Page, overrides?: Partial<ScraperTargetConfig>) {
    vi.mocked(chromium.launch).mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(page),
        close: vi.fn().mockResolvedValue(undefined),
    } as never);

    return jobsChTarget.run(buildTargetConfig(overrides));
}

describe('jobsChTarget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(retryWithFixedInterval).mockImplementation(async (fn: () => Promise<unknown>) => fn());
    });

    it('paginates listings and emits one result per detail URL', async () => {
        const page = buildPage();
        const results = await runTarget(page);

        expect(vi.mocked(page.goto).mock.calls.length).toBeGreaterThanOrEqual(4);
        const successes = results.filter((r): r is typeof r & { ok: true } => r.ok);
        expect(successes).toHaveLength(2);
        expect(successes[0].url).toBe('https://www.jobs.ch/en/vacancies/detail/1');
        expect(successes[1].url).toBe('https://www.jobs.ch/en/vacancies/detail/2');
    });

    it('forwards descriptions and informations from the page into text and fields', async () => {
        const page = buildPage({
            descriptions: [{ title: 'Section', blocks: ['line'] }],
            informations: [{ label: 'Location', value: 'Zurich' }],
            companyLink: { value: 'Acme' },
            listingDetailUrlBatches: [['https://www.jobs.ch/en/vacancies/detail/only']],
        });
        const results = await runTarget(page, { maxPages: 1 });

        const listing = results.find((r): r is typeof r & { ok: true } => r.ok);
        expect(listing?.fields?.Location).toBe('Zurich');
        expect(listing?.fields?.Company).toBe('Acme');
        expect(listing?.text).toContain('Section');
        expect(listing?.text).toContain('line');
        expect(listing?.text).toContain('Location: Zurich');
    });

    it('falls back to vacancy-logo for company name when company-link is missing', async () => {
        const page = buildPage({
            companyLink: null,
            vacancyLogo: { value: 'LogoCompany' },
            listingDetailUrlBatches: [['https://www.jobs.ch/en/vacancies/detail/only']],
        });
        const results = await runTarget(page, { maxPages: 1 });

        const listing = results.find((r): r is typeof r & { ok: true } => r.ok);
        expect(listing?.fields?.Company).toBe('LogoCompany');
    });

    it('emits an empty company value when no company markup is present', async () => {
        const page = buildPage({
            companyLink: null,
            vacancyLogo: null,
            listingDetailUrlBatches: [['https://www.jobs.ch/en/vacancies/detail/only']],
        });
        const results = await runTarget(page, { maxPages: 1 });

        const listing = results.find((r): r is typeof r & { ok: true } => r.ok);
        expect(listing?.fields?.Company).toBe('');
    });

    it('records an error when navigating to a detail page fails after retries', async () => {
        let retryCall = 0;
        vi.mocked(retryWithFixedInterval).mockImplementation(async (fn: () => Promise<unknown>) => {
            retryCall += 1;
            // 1 = listing page 1, 2 = listing page 2, 3 = first detail URL — fail that one.
            if (retryCall === 3) {
                throw new Error('navigation failed');
            }
            return fn();
        });

        const page = buildPage();
        const results = await runTarget(page);

        const failures = results.filter((r): r is typeof r & { ok: false } => !r.ok);
        expect(failures).toHaveLength(1);
        expect(failures[0].error.message).toContain('Failed to navigate to job detail page');
        expect(failures[0].error.message).toContain('https://www.jobs.ch/en/vacancies/detail/1');
    });

    it('passes item selector and detail URL prefix into listing $$eval', async () => {
        const page = buildPage({ listingDetailUrlBatches: [['https://www.jobs.ch/en/vacancies/detail/abc']] });
        await runTarget(page, { maxPages: 1 });

        expect(page.$$eval).toHaveBeenCalledWith(
            constants.selectors.itemSelector,
            expect.any(Function),
            expect.objectContaining({
                jobDetailUrlPrefix: constants.configuration.detailUrlPrefix,
                listingBaseHref: expect.any(String),
            })
        );
    });
});
