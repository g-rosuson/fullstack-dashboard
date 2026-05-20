/**
 * Unit tests for the scraper orchestrator (`scraper/index.ts`).
 *
 * Targets are mocked so tests observe only `onTargetFinish` payloads — screened
 * `results`, `summary`, and configuration error listings — not Playwright or registry internals.
 */
import constants from './constants';

import type {
    ExecutionScraperToolTarget,
    ExecutionScraperToolTargetListing,
} from 'shared/types/jobs/tools/execution/types-execution-scraper-tool';
import type { ScraperTool, ScraperToolTargetName } from 'shared/types/jobs/tools/types-tools-scraper';

/** Stub `jobs-ch` scrape output — orchestrator tests assert screening/summary, not Playwright. */
const mockJobsChRun = vi.hoisted(() => vi.fn());

/** Stub `job-ich` scrape output — used when exercising multi-target completion. */
const mockJobIchRun = vi.hoisted(() => vi.fn());

vi.mock('./targets', () => ({
    default: {
        jobsCh: { run: mockJobsChRun },
        jobIch: { run: mockJobIchRun },
    },
}));

import Scraper from './index';

const minTextLength = constants.listing.minTextLength;

type SuccessListing = Extract<ExecutionScraperToolTargetListing, { ok: true }>;

/**
 * Builds body text that satisfies the orchestrator minimum length while embedding a keyword.
 *
 * @param keyword - Substring expected to appear in the padded body for screening tests.
 */
function paddedText(keyword: string): string {
    return `${keyword} `.padEnd(minTextLength, 'x');
}

/**
 * Factory for successful scraped listings returned by mocked targets.
 *
 * @param overrides - Partial fields to shape a listing for a given screening scenario.
 */
function buildSuccessListing(overrides: Partial<SuccessListing> = {}): SuccessListing {
    return {
        ok: true,
        source: 'jobs-ch',
        url: 'https://example.com/job/1',
        title: 'Software Engineer',
        text: paddedText('software'),
        ...overrides,
    };
}

/**
 * Minimal valid scraper tool configuration; override fields per scenario.
 *
 * @param overrides - Tool-level keywords, maxPages, or per-target settings.
 */
function buildTool(overrides: Partial<ScraperTool> = {}): ScraperTool {
    return {
        toolId: 'tool-1',
        type: 'scraper',
        keywords: ['software'],
        maxPages: 1,
        targets: [
            {
                targetId: 'target-1',
                target: 'jobs-ch',
            },
        ],
        ...overrides,
    };
}

/**
 * Runs `Scraper.execute` and collects each `onTargetFinish` payload (public contract under test).
 *
 * @param tool - Scraper tool definition passed to the orchestrator.
 * @returns One finished target payload per invocation of `onTargetFinish`.
 */
async function runScraper(tool: ScraperTool): Promise<ExecutionScraperToolTarget[]> {
    const finished: ExecutionScraperToolTarget[] = [];
    const scraper = new Scraper();

    await scraper.execute({
        tool,
        onTargetFinish: target => {
            // Callback is typed as the cross-tool union; scraper runs only produce scraper targets.
            finished.push(target as ExecutionScraperToolTarget);
        },
    });

    return finished;
}

describe('Scraper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockJobsChRun.mockResolvedValue([]);
        mockJobIchRun.mockResolvedValue([]);
    });

    /** Asserts emitted payloads from `execute` — configuration errors, screening, and summaries. */
    describe('execute', () => {
        it('emits an unknown-target error listing and empty summary for unrecognized portals', async () => {
            const [finished] = await runScraper(
                buildTool({
                    targets: [
                        {
                            targetId: 't1',
                            target: 'unknown-portal' as ScraperToolTargetName,
                        },
                    ],
                })
            );

            expect(finished.results).toHaveLength(1);
            expect(finished.results[0].listing).toMatchObject({
                ok: false,
                error: { code: constants.error.unknownTarget.code },
            });
            expect(finished.summary).toEqual(constants.summary);
        });

        it('emits invalid-configuration when keywords cannot be resolved', async () => {
            const [finished] = await runScraper(
                buildTool({
                    keywords: undefined,
                    targets: [{ targetId: 't1', target: 'jobs-ch', keywords: undefined }],
                })
            );

            expect(finished.results[0].listing).toMatchObject({
                ok: false,
                error: { code: constants.error.invalidConfiguration.code },
            });
            expect(finished.summary).toEqual(constants.summary);
        });

        it('emits invalid-configuration when maxPages cannot be resolved', async () => {
            const [finished] = await runScraper(
                buildTool({
                    maxPages: undefined,
                    targets: [{ targetId: 't1', target: 'jobs-ch', maxPages: undefined }],
                })
            );

            expect(finished.results[0].listing).toMatchObject({
                ok: false,
                error: { code: constants.error.invalidConfiguration.code },
            });
            expect(finished.summary).toEqual(constants.summary);
        });

        it('screens listings and returns per-target results with a summary', async () => {
            mockJobsChRun.mockResolvedValue([
                buildSuccessListing({ title: 'Software role', text: paddedText('software') }),
                buildSuccessListing({ title: '', text: paddedText('software') }),
                {
                    ok: false,
                    source: 'jobs-ch',
                    url: null,
                    error: { code: 'SCRAPE_FAILED', message: 'failed' },
                },
            ]);

            const [finished] = await runScraper(buildTool());

            expect(finished.target).toBe('jobs-ch');
            expect(finished.targetId).toBe('target-1');
            expect(finished.results).toHaveLength(3);
            expect(finished.results[0].screen).toEqual({ passed: true, reasonCodes: [] });
            expect(finished.results[1].screen).toMatchObject({
                passed: false,
                reasonCodes: expect.arrayContaining([constants.error.invalidTitle.code]),
            });
            expect(finished.results[2].screen).toEqual({
                passed: false,
                reasonCodes: [constants.error.invalidListing.code],
            });
            expect(finished.summary).toEqual({
                total: 3,
                passed: 1,
                rejected: 2,
                reasonCounts: {
                    [constants.error.invalidTitle.code]: 1,
                    [constants.error.invalidListing.code]: 1,
                },
            });
        });

        it('rejects listings with text shorter than the minimum length', async () => {
            mockJobsChRun.mockResolvedValue([
                buildSuccessListing({ title: 'Software role', text: 'short software snippet' }),
            ]);

            const [finished] = await runScraper(buildTool());

            expect(finished.results[0].screen).toEqual({
                passed: false,
                reasonCodes: [constants.error.invalidText.code],
            });
            expect(finished.summary.rejected).toBe(1);
        });

        it('rejects listings when no configured keyword appears in title or text', async () => {
            mockJobsChRun.mockResolvedValue([
                buildSuccessListing({
                    title: 'Data Analyst',
                    text: paddedText('analytics'),
                }),
            ]);

            const [finished] = await runScraper(buildTool({ keywords: ['software'] }));

            expect(finished.results[0].screen).toEqual({
                passed: false,
                reasonCodes: [constants.error.invalidKeywordsInContent.code],
            });
        });

        it('passes when a keyword appears only in the body text', async () => {
            mockJobsChRun.mockResolvedValue([
                buildSuccessListing({
                    title: 'Engineer',
                    text: paddedText('software'),
                }),
            ]);

            const [finished] = await runScraper(buildTool());

            expect(finished.results[0].screen?.passed).toBe(true);
        });

        it('matches keywords without regard to case or diacritics', async () => {
            mockJobsChRun.mockResolvedValue([
                buildSuccessListing({
                    title: 'Café Engineer',
                    text: paddedText('role'),
                }),
            ]);

            const [finished] = await runScraper(buildTool({ keywords: ['cafe'] }));

            expect(finished.results[0].screen?.passed).toBe(true);
        });

        it('returns an empty summary when the target yields no listings', async () => {
            mockJobsChRun.mockResolvedValue([]);

            const [finished] = await runScraper(buildTool());

            expect(finished.results).toEqual([]);
            expect(finished.summary).toEqual({
                total: 0,
                passed: 0,
                rejected: 0,
                reasonCounts: {},
            });
        });

        it('finishes every configured target independently', async () => {
            mockJobsChRun.mockResolvedValue([buildSuccessListing({ source: 'jobs-ch', title: 'Software jobs-ch' })]);
            mockJobIchRun.mockResolvedValue([buildSuccessListing({ source: 'job-ich', title: 'Software job-ich' })]);

            const finished = await runScraper(
                buildTool({
                    targets: [
                        { targetId: 'ch', target: 'jobs-ch' },
                        { targetId: 'ich', target: 'job-ich' },
                    ],
                })
            );

            expect(finished).toHaveLength(2);
            expect(finished.map(t => t.targetId).sort()).toEqual(['ch', 'ich']);
            expect(finished.every(t => t.summary.passed === 1)).toBe(true);
        });

        it('does not finish a target when scraping throws', async () => {
            mockJobsChRun.mockRejectedValue(new Error('portal down'));

            const finished = await runScraper(buildTool());

            expect(finished).toHaveLength(0);
        });

        it('uses tool-level defaults so a valid target still produces screened results', async () => {
            mockJobsChRun.mockResolvedValue([
                buildSuccessListing({ title: 'Software Engineer', text: paddedText('software') }),
            ]);

            const [finished] = await runScraper(
                buildTool({
                    keywords: ['software'],
                    maxPages: 2,
                    targets: [{ targetId: 't1', target: 'jobs-ch' }],
                })
            );

            expect(finished.results[0].screen?.passed).toBe(true);
            expect(finished.summary.passed).toBe(1);
        });
    });
});
