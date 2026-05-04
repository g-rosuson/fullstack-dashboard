import { beforeEach, describe, expect, it, vi } from 'vitest';

import constants from './constants';

import type { ScraperTargetConfig } from '../../types';
import type { Locator, Page } from 'playwright';

import jobIchTarget, { buildSearchUrl, groupDescriptionLines } from './index';
import { chromium } from 'playwright';

vi.mock('utils/async/utils-async-retry', () => ({
    retryWithFixedInterval: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

vi.mock('playwright', () => ({
    chromium: {
        launch: vi.fn(),
    },
}));

/**
 * Build a fake Page with row-locator and overlay-extraction stubs. Each call
 * to `locator(selector)` returns a different fake based on which extraction
 * the target is doing at that moment.
 */
const buildPage = (options: {
    rowCount: number;
    title?: string | null;
    descriptionLines?: string[]; // returned from descriptionSelector.evaluate
    metaItems?: { hasStrong?: boolean; isSource?: boolean; isIndustry?: boolean; text: string }[];
    tagItems?: { hasStrong?: boolean; isSource?: boolean; isIndustry?: boolean; text: string }[];
    /** When `'repeat'`, "Show more" stays visible/enabled for every loop iteration. */
    showMoreBehavior?: 'absent' | 'repeat';
    /** Captures Show-more clicks when `showMoreBehavior === 'repeat'`. */
    showMoreClick?: ReturnType<typeof vi.fn>;
}): Page => {
    const rowsLocator: Locator = {
        count: vi.fn().mockResolvedValue(options.rowCount),
        nth: vi.fn().mockReturnValue({
            click: vi.fn().mockResolvedValue(undefined),
        }),
    } as unknown as Locator;

    const descLocator = {
        count: vi.fn().mockResolvedValue(options.descriptionLines ? 1 : 0),
        evaluate: vi.fn().mockResolvedValue(options.descriptionLines ?? []),
    } as unknown as Locator;

    const metaLocator = {
        count: vi.fn().mockResolvedValue(options.metaItems ? 1 : 0),
        evaluate: vi.fn().mockResolvedValue(options.metaItems ?? []),
    } as unknown as Locator;

    const tagsLocator = {
        count: vi.fn().mockResolvedValue(options.tagItems ? 1 : 0),
        evaluate: vi.fn().mockResolvedValue(options.tagItems ?? []),
    } as unknown as Locator;

    const absentShowMore = {
        count: vi.fn().mockResolvedValue(0),
        first: vi.fn(),
    };

    const showMoreClick = options.showMoreClick ?? vi.fn().mockResolvedValue(undefined);

    const repeatShowMore = {
        count: vi.fn().mockResolvedValue(1),
        first: vi.fn().mockReturnValue({
            isDisabled: vi.fn().mockResolvedValue(false),
            isVisible: vi.fn().mockResolvedValue(true),
            click: showMoreClick,
        }),
    };

    const showMoreLocator = options.showMoreBehavior === 'repeat' ? repeatShowMore : absentShowMore;

    const page = {
        goto: vi.fn().mockResolvedValue(undefined),
        locator: vi.fn().mockImplementation((selector: string) => {
            if (selector === constants.selectors.jobRow) return rowsLocator;
            if (selector === constants.selectors.descriptionSelector) return descLocator;
            if (selector === constants.selectors.metaSelector) return metaLocator;
            if (selector === constants.selectors.tagsSelector) return tagsLocator;
            if (selector === constants.selectors.showMoreButton) return showMoreLocator;
            return { count: vi.fn().mockResolvedValue(0), evaluate: vi.fn() };
        }),
        textContent: vi.fn().mockResolvedValue(options.title ?? 'Engineer'),
        waitForSelector: vi.fn().mockResolvedValue(undefined),
        keyboard: { press: vi.fn().mockResolvedValue(undefined) },
        close: vi.fn().mockResolvedValue(undefined),
    } as unknown as Page;

    return page;
};

function buildTargetConfig(overrides?: Partial<ScraperTargetConfig>): ScraperTargetConfig {
    return {
        targetId: 't',
        target: 'job-ich',
        keywords: ['frontend'],
        maxPages: 1,
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

    return jobIchTarget.run(buildTargetConfig(overrides));
}

describe('buildSearchUrl', () => {
    it('builds a URL with q', () => {
        expect(buildSearchUrl(['frontend', 'developer'])).toBe('https://jobich.ch/?q=frontend+developer#search');
    });

    it('omits q when no keywords are provided', () => {
        expect(buildSearchUrl([])).toBe('https://jobich.ch/#search');
    });
});

describe('groupDescriptionLines', () => {
    it('groups intro paragraph and titled sections', () => {
        // Mirrors the actual jobich.ch markup pattern after <br> -> \n conversion.
        // Title lines ("Tasks", "Skills") are short; content lines are full
        // sentences and exceed the title length/word thresholds.
        const intro = 'Join a global company as a Project Engineer in Giubiasco today.';
        const lead = 'Lead design and execution of diverse infrastructure projects worldwide.';
        const provide = 'Provide technical assistance to clients and project sites effectively.';
        const collaborate = 'Collaborate in a team to tackle cutting-edge engineering challenges.';
        const masters = 'Degree in Civil Engineering with relevant experience required.';
        const fluent = 'Fluent in Italian and English with strong technical abilities.';
        const ability = 'Ability to work independently with focus on underground projects.';

        const lines = [intro, 'Tasks', '', lead, provide, collaborate, '', 'Skills', '', masters, fluent, ability, ''];

        expect(groupDescriptionLines(lines)).toEqual([
            { blocks: [intro] },
            { title: 'Tasks', blocks: [lead, provide, collaborate] },
            { title: 'Skills', blocks: [masters, fluent, ability] },
        ]);
    });

    it('returns no sections for empty input', () => {
        expect(groupDescriptionLines([])).toEqual([]);
    });

    it('treats a long line followed by an empty line as content, not a title', () => {
        // A long sentence followed by an empty line (i.e. end-of-section
        // boundary) must not be promoted to a title.
        const longLine = 'This is a very long sentence that should be treated as a content block, not a title heading.';
        expect(groupDescriptionLines([longLine, '', longLine])).toEqual([{ blocks: [longLine, longLine] }]);
    });

    it('returns a single untitled section when there are no empty-line boundaries', () => {
        expect(groupDescriptionLines(['line one', 'line two'])).toEqual([{ blocks: ['line one', 'line two'] }]);
    });
});

describe('jobIchTarget', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('navigates to the search URL and emits one result per row', async () => {
        const page = buildPage({ rowCount: 3 });
        const results = await runTarget(page, { keywords: ['frontend'], maxPages: 1 });

        expect(page.goto).toHaveBeenCalledWith('https://jobich.ch/?q=frontend#search');
        const succeeded = results.filter(r => r.result !== null);
        expect(succeeded).toHaveLength(3);
        expect(succeeded[0].result?.title).toBe('Engineer');
    });

    it('clicks "Show more" maxPages - 1 times when the button stays available', async () => {
        vi.useFakeTimers();
        try {
            const showMoreClick = vi.fn().mockResolvedValue(undefined);
            const page = buildPage({ rowCount: 0, showMoreBehavior: 'repeat', showMoreClick });
            const runPromise = runTarget(page, { keywords: ['x'], maxPages: 4 });
            await vi.advanceTimersByTimeAsync(constants.configuration.showMoreLoadDelayMs * 5);
            await runPromise;

            expect(showMoreClick).toHaveBeenCalledTimes(3);
        } finally {
            vi.useRealTimers();
        }
    });

    it('clamps the click count to a non-negative number when maxPages is 0 or 1', async () => {
        vi.useFakeTimers();
        try {
            const showMoreClick = vi.fn().mockResolvedValue(undefined);
            const page = buildPage({ rowCount: 0, showMoreBehavior: 'repeat', showMoreClick });
            const runPromise = runTarget(page, { keywords: ['x'], maxPages: 1 });
            await vi.advanceTimersByTimeAsync(100);
            await runPromise;

            expect(showMoreClick).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it('labels meta spans by class and position (Company / Location / Source / Posted)', async () => {
        const page = buildPage({
            rowCount: 1,
            metaItems: [
                { hasStrong: true, text: 'Acme' },
                { text: 'Zurich' },
                { isSource: true, text: 'jobs.ch' },
                { text: '3 weeks ago' },
            ],
        });
        const results = await runTarget(page);

        expect(results[0].result?.informations).toEqual([
            { label: 'Company', value: 'Acme' },
            { label: 'Location', value: 'Zurich' },
            { label: 'Source', value: 'jobs.ch' },
            { label: 'Posted', value: '3 weeks ago' },
        ]);
    });

    it('labels tag spans (.tag-industry -> Industry, others -> Tag)', async () => {
        const page = buildPage({
            rowCount: 1,
            tagItems: [{ isIndustry: true, text: 'Engineering' }, { text: 'Onsite' }, { text: 'Full-time' }],
        });
        const results = await runTarget(page);

        expect(results[0].result?.informations).toEqual([
            { label: 'Industry', value: 'Engineering' },
            { label: 'Tag', value: 'Onsite' },
            { label: 'Tag', value: 'Full-time' },
        ]);
    });

    it('records an error when interacting with a single row fails', async () => {
        const rowCount = 2;

        const waitForSelector = vi
            .fn()
            .mockResolvedValueOnce(undefined) // initial resultsContainer wait
            .mockRejectedValueOnce(new Error('overlay never appeared'))
            .mockResolvedValue(undefined);

        const rowsLocator: Locator = {
            count: vi.fn().mockResolvedValue(rowCount),
            nth: vi.fn().mockReturnValue({ click: vi.fn().mockResolvedValue(undefined) }),
        } as unknown as Locator;

        const page = {
            goto: vi.fn().mockResolvedValue(undefined),
            locator: vi.fn().mockImplementation((selector: string) => {
                if (selector === constants.selectors.jobRow) return rowsLocator;
                return { count: vi.fn().mockResolvedValue(0), evaluate: vi.fn() };
            }),
            textContent: vi.fn().mockResolvedValue('Engineer'),
            waitForSelector,
            keyboard: { press: vi.fn().mockResolvedValue(undefined) },
            close: vi.fn().mockResolvedValue(undefined),
        } as unknown as Page;

        const results = await runTarget(page);

        const failures = results.filter(r => r.error !== null);
        expect(failures).toHaveLength(1);
        expect(failures[0].error?.message).toContain('overlay never appeared');
        expect(results.filter(r => r.result !== null)).toHaveLength(1);
    });
});
