import { beforeEach, describe, expect, it, vi } from 'vitest';

import { logger } from 'aop/logging';
import { parseSchema } from 'lib/validation';

import constants from './constants';

import type { ScraperRequest, ScraperResult, ScraperTool } from './types';
import type { Dictionary, Request as CrawleeRequest } from 'crawlee';
import type { Page } from 'playwright';

import Scraper from './index';
import targetRegistry from './targets';
import { PlaywrightCrawler, RequestQueue } from 'crawlee';
import { kebabToCamelCase } from 'utils';

// Mock dependencies
vi.mock('aop/logging', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));
vi.mock('config', () => ({
    default: {
        isDeveloping: true,
        clientUrl: 'http://localhost:3000',
        domain: 'localhost',
        accessTokenSecret: 'test-access-secret',
        refreshTokenSecret: 'test-refresh-secret',
        mongoURI: 'mongodb://localhost:27017/test',
        mongoDBName: 'test',
        basePath: '/api',
        maxDbRetries: 3,
        dbRetryDelayMs: 5000,
    },
}));
vi.mock('crawlee');
vi.mock('lib/validation', () => ({
    parseSchema: vi.fn(),
}));
vi.mock('utils');
vi.mock('./targets', () => ({
    default: {
        jobsCh: {
            processRequest: vi.fn(),
        },
    },
}));

/**
 * Testing Strategy for Scraper
 *
 * This test suite tests the scraper orchestrator that manages web scraping operations.
 * Key testing considerations:
 *
 * 1. REQUEST QUEUE: The scraper uses RequestQueue to manage crawling requests
 *    - Mock RequestQueue.open() and addRequests()
 *
 * 2. CRAWLER: The scraper uses PlaywrightCrawler to execute requests
 *    - Mock PlaywrightCrawler constructor and run() method
 *    - Mock requestHandler callback execution
 *
 * 3. TARGET REGISTRY: The scraper resolves targets from a registry
 *    - Mock targetRegistry to return target instances
 *    - Mock target.processRequest() method
 *
 * 4. VALIDATION: The scraper validates request userData
 *    - Mock parseSchema to return success/failure results
 *
 * 5. CALLBACKS: The scraper invokes onTargetFinish when targets complete
 *    - Verify callback invocation with correct parameters
 *
 * 6. RESULT AGGREGATION: The scraper aggregates results per target
 *    - Verify results are correctly grouped by targetId
 *    - Verify completion detection when all requests finish
 */

describe('Scraper', () => {
    let scraper: Scraper;
    let mockRequestQueue: {
        addRequests: ReturnType<typeof vi.fn>;
    };
    let mockCrawler: {
        run: ReturnType<typeof vi.fn>;
    };
    let mockOnTargetFinish: ReturnType<typeof vi.fn>;
    let mockTarget: {
        processRequest: ReturnType<typeof vi.fn>;
    };
    let mockPage: Page;
    let mockEnqueueLinks: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        scraper = new Scraper();

        mockRequestQueue = {
            addRequests: vi.fn().mockResolvedValue(undefined),
        };

        mockCrawler = {
            run: vi.fn().mockResolvedValue(undefined),
        };

        mockOnTargetFinish = vi.fn();

        mockTarget = {
            processRequest: vi.fn(),
        };

        mockPage = {} as Page;

        mockEnqueueLinks = vi.fn();

        vi.mocked(RequestQueue.open).mockResolvedValue(mockRequestQueue as unknown as RequestQueue);
        vi.mocked(PlaywrightCrawler).mockImplementation(() => mockCrawler as unknown as PlaywrightCrawler);

        // Reset target registry mock
        (targetRegistry as Record<string, unknown>).jobsCh = mockTarget;

        vi.mocked(kebabToCamelCase).mockImplementation((str: string) => {
            return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        });
    });

    describe('execute()', () => {
        const typeProperty = 'type';
        const targetsProperty = 'targets';
        const keywordsProperty = 'keywords';
        const maxPagesProperty = 'maxPages';
        const targetIdProperty = 'targetId';
        const targetProperty = 'target';

        const toolType = 'scraper';
        const targetId = 'target-1';
        const target = 'jobs-ch';
        const keywords = ['software', 'engineer'];
        const maxPages = 2;

        const tool: ScraperTool = {
            [typeProperty]: toolType,
            [targetsProperty]: [
                {
                    [targetIdProperty]: targetId,
                    [targetProperty]: target,
                    [keywordsProperty]: keywords,
                    [maxPagesProperty]: maxPages,
                },
            ],
            [keywordsProperty]: keywords,
            [maxPagesProperty]: maxPages,
        };

        it('should initialize request queue and add target requests', async () => {
            vi.mocked(PlaywrightCrawler).mockImplementation(() => {
                return mockCrawler as unknown as PlaywrightCrawler;
            });

            vi.mocked(parseSchema).mockReturnValue({
                success: true,
                data: {
                    label: constants.requestLabels.targetRequest,
                    targetId,
                    target,
                    keywords,
                    maxPages,
                },
            });

            mockTarget.processRequest.mockResolvedValue({
                uniqueKeys: ['key-1'],
                result: null,
            });

            await scraper.execute({
                tool,
                onTargetFinish: mockOnTargetFinish,
            });

            expect(RequestQueue.open).toHaveBeenCalled();
            expect(mockRequestQueue.addRequests).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        url: constants.placeholderUrl,
                        userData: expect.objectContaining({
                            label: constants.requestLabels.targetRequest,
                            [targetIdProperty]: targetId,
                            [targetProperty]: target,
                            [keywordsProperty]: keywords,
                            [maxPagesProperty]: maxPages,
                        }),
                    }),
                ])
            );
            expect(PlaywrightCrawler).toHaveBeenCalled();
            expect(mockCrawler.run).toHaveBeenCalled();
        });

        it('should use target-specific keywords and maxPages when provided', async () => {
            const targetKeywords = ['javascript', 'react'];
            const targetMaxPages = 5;

            const toolWithTargetOverrides: ScraperTool = {
                [typeProperty]: toolType,
                [targetsProperty]: [
                    {
                        [targetIdProperty]: targetId,
                        [targetProperty]: target,
                        [keywordsProperty]: targetKeywords,
                        [maxPagesProperty]: targetMaxPages,
                    },
                ],
                [keywordsProperty]: keywords,
                [maxPagesProperty]: maxPages,
            };

            await scraper.execute({
                tool: toolWithTargetOverrides,
                onTargetFinish: mockOnTargetFinish,
            });

            expect(mockRequestQueue.addRequests).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        userData: expect.objectContaining({
                            [keywordsProperty]: targetKeywords,
                            [maxPagesProperty]: targetMaxPages,
                        }),
                    }),
                ])
            );
        });

        it('should use tool-level keywords and maxPages when target does not provide them', async () => {
            const toolWithoutTargetOverrides: ScraperTool = {
                [typeProperty]: toolType,
                [targetsProperty]: [
                    {
                        [targetIdProperty]: targetId,
                        [targetProperty]: target,
                    },
                ],
                [keywordsProperty]: keywords,
                [maxPagesProperty]: maxPages,
            };

            await scraper.execute({
                tool: toolWithoutTargetOverrides,
                onTargetFinish: mockOnTargetFinish,
            });

            expect(mockRequestQueue.addRequests).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        userData: expect.objectContaining({
                            [keywordsProperty]: keywords,
                            [maxPagesProperty]: maxPages,
                        }),
                    }),
                ])
            );
        });

        it('should handle multiple targets', async () => {
            const targetId2 = 'target-2';
            const target2 = 'jobs-ch';

            const toolWithMultipleTargets: ScraperTool = {
                [typeProperty]: toolType,
                [targetsProperty]: [
                    {
                        [targetIdProperty]: targetId,
                        [targetProperty]: target,
                    },
                    {
                        [targetIdProperty]: targetId2,
                        [targetProperty]: target2,
                    },
                ],
                [keywordsProperty]: keywords,
                [maxPagesProperty]: maxPages,
            };

            await scraper.execute({
                tool: toolWithMultipleTargets,
                onTargetFinish: mockOnTargetFinish,
            });

            expect(mockRequestQueue.addRequests).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        userData: expect.objectContaining({
                            [targetIdProperty]: targetId,
                        }),
                    }),
                    expect.objectContaining({
                        userData: expect.objectContaining({
                            [targetIdProperty]: targetId2,
                        }),
                    }),
                ])
            );
        });
    });

    describe('execute(): request handler - target request processing', () => {
        const targetIdProperty = 'targetId';
        const targetProperty = 'target';
        const keywordsProperty = 'keywords';
        const maxPagesProperty = 'maxPages';
        const labelProperty = 'label';

        const targetId = 'target-1';
        const target = 'jobs-ch';
        const keywords = ['software'];
        const maxPages = 1;
        const uniqueKey = 'unique-key-1';

        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
        let requestHandler: (context: {
            page: Page;
            request: CrawleeRequest<Dictionary>;
            enqueueLinks: ReturnType<typeof vi.fn>;
        }) => Promise<void>;

        beforeEach(() => {
            vi.mocked(PlaywrightCrawler).mockImplementation(options => {
                if (options?.requestHandler) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    requestHandler = options.requestHandler as any;
                }
                return mockCrawler as unknown as PlaywrightCrawler;
            });
        });

        it('should process target request and enqueue extraction requests', async () => {
            const uniqueKey1 = 'key-1';
            const uniqueKey2 = 'key-2';

            const tool: ScraperTool = {
                type: 'scraper',
                targets: [
                    {
                        targetId,
                        target,
                    },
                ],
                keywords,
                maxPages,
            };

            const request = {
                url: constants.placeholderUrl,
                uniqueKey: uniqueKey,
                userData: {
                    [labelProperty]: constants.requestLabels.targetRequest,
                    [targetIdProperty]: targetId,
                    [targetProperty]: target,
                    [keywordsProperty]: keywords,
                    [maxPagesProperty]: maxPages,
                },
            } as unknown as CrawleeRequest<Dictionary>;

            vi.mocked(parseSchema).mockReturnValue({
                success: true,
                data: request.userData as ScraperRequest['userData'],
            });

            mockTarget.processRequest.mockResolvedValue({
                uniqueKeys: [uniqueKey1, uniqueKey2],
                result: null,
            });

            await scraper.execute({
                tool,
                onTargetFinish: mockOnTargetFinish,
            });

            await requestHandler({
                page: mockPage,
                request: request as unknown as CrawleeRequest<Dictionary>,
                enqueueLinks: mockEnqueueLinks,
            });

            expect(mockTarget.processRequest).toHaveBeenCalledWith({
                page: mockPage,
                request: request as unknown as CrawleeRequest<Dictionary>,
                userData: request.userData as ScraperRequest['userData'],
                enqueueLinks: mockEnqueueLinks,
            });
            expect(mockOnTargetFinish).not.toHaveBeenCalled();
        });

        it('should log an error when target request validation fails', async () => {
            const tool: ScraperTool = {
                type: 'scraper',
                targets: [
                    {
                        targetId,
                        target,
                    },
                ],
                keywords,
                maxPages,
            };

            vi.mocked(parseSchema).mockReturnValue({
                success: false,
                issues: [],
            });

            await scraper.execute({
                tool,
                onTargetFinish: mockOnTargetFinish,
            });

            await requestHandler({
                page: mockPage,
                request: {
                    url: constants.placeholderUrl,
                    uniqueKey: 'key',
                    userData: {},
                } as unknown as CrawleeRequest<Dictionary>,
                enqueueLinks: mockEnqueueLinks,
            });

            expect(logger.error).toHaveBeenCalled();
        });

        it('should invoke onTargetFinish with error when target is not found in registry', async () => {
            const tool: ScraperTool = {
                type: 'scraper',
                targets: [
                    {
                        targetId,
                        target: 'jobs-ch' as const,
                    },
                ],
                keywords,
                maxPages,
            };

            const request = {
                url: constants.placeholderUrl,
                uniqueKey: uniqueKey,
                userData: {
                    [labelProperty]: constants.requestLabels.targetRequest,
                    [targetIdProperty]: targetId,
                    [targetProperty]: 'jobs-ch',
                    [keywordsProperty]: keywords,
                    [maxPagesProperty]: maxPages,
                },
            } as unknown as CrawleeRequest<Dictionary>;

            vi.mocked(parseSchema).mockReturnValue({
                success: true,
                data: request.userData as ScraperRequest['userData'],
            });

            vi.mocked(kebabToCamelCase).mockReturnValue('invalidTarget');
            // Simulate target not found by ensuring it's not in registry
            (targetRegistry as Record<string, unknown>).jobsCh = undefined;

            await scraper.execute({
                tool,
                onTargetFinish: mockOnTargetFinish,
            });

            await requestHandler({
                page: mockPage,
                request: request as unknown as CrawleeRequest<Dictionary>,
                enqueueLinks: mockEnqueueLinks,
            });

            expect(mockOnTargetFinish).toHaveBeenCalledWith(
                expect.objectContaining({
                    results: [
                        {
                            error: {
                                message: expect.any(String),
                            },
                            result: null,
                        },
                    ],
                })
            );
        });
    });

    describe('execute(): request handler - extraction request processing', () => {
        const targetIdProperty = 'targetId';
        const targetProperty = 'target';
        const keywordsProperty = 'keywords';
        const maxPagesProperty = 'maxPages';
        const labelProperty = 'label';
        const urlProperty = 'url';
        const titleProperty = 'title';
        const descriptionProperty = 'description';
        const informationProperty = 'information';

        const targetId = 'target-1';
        const target = 'jobs-ch';
        const keywords = ['software'];
        const maxPages = 1;
        const uniqueKey = 'unique-key-1';
        const jobUrl = 'https://example.com/job/1';
        const jobTitle = 'Software Engineer';
        const jobDescription: ScraperResult['result'] = {
            [urlProperty]: jobUrl,
            [titleProperty]: jobTitle,
            [descriptionProperty]: [],
            [informationProperty]: [],
        };

        // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
        let requestHandler: (context: {
            page: Page;
            request: CrawleeRequest<Dictionary>;
            enqueueLinks: ReturnType<typeof vi.fn>;
        }) => Promise<void>;

        beforeEach(() => {
            vi.mocked(PlaywrightCrawler).mockImplementation(options => {
                if (options?.requestHandler) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    requestHandler = options.requestHandler as any;
                }
                return mockCrawler as unknown as PlaywrightCrawler;
            });
        });

        it('should process extraction request and add result to target results', async () => {
            const tool: ScraperTool = {
                type: 'scraper',
                targets: [
                    {
                        targetId,
                        target,
                    },
                ],
                keywords,
                maxPages,
            };

            const targetRequest = {
                url: constants.placeholderUrl,
                uniqueKey: 'target-request-key',
                userData: {
                    [labelProperty]: constants.requestLabels.targetRequest,
                    [targetIdProperty]: targetId,
                    [targetProperty]: target,
                    [keywordsProperty]: keywords,
                    [maxPagesProperty]: maxPages,
                },
            } as unknown as CrawleeRequest<Dictionary>;

            const extractionRequest = {
                url: jobUrl,
                uniqueKey: uniqueKey,
                userData: {
                    [labelProperty]: constants.requestLabels.extractionRequest,
                    [targetIdProperty]: targetId,
                    [targetProperty]: target,
                    [keywordsProperty]: keywords,
                    [maxPagesProperty]: maxPages,
                },
            } as unknown as CrawleeRequest<Dictionary>;

            vi.mocked(parseSchema)
                .mockReturnValueOnce({
                    success: true,
                    data: targetRequest.userData as ScraperRequest['userData'],
                })
                .mockReturnValueOnce({
                    success: true,
                    data: extractionRequest.userData as ScraperRequest['userData'],
                });

            mockTarget.processRequest
                .mockResolvedValueOnce({
                    uniqueKeys: [uniqueKey],
                    result: null,
                })
                .mockResolvedValueOnce({
                    uniqueKeys: null,
                    result: jobDescription,
                });

            await scraper.execute({
                tool,
                onTargetFinish: mockOnTargetFinish,
            });

            await requestHandler({
                page: mockPage,
                request: targetRequest as unknown as CrawleeRequest<Dictionary>,
                enqueueLinks: mockEnqueueLinks,
            });

            await requestHandler({
                page: mockPage,
                request: extractionRequest as unknown as CrawleeRequest<Dictionary>,
                enqueueLinks: mockEnqueueLinks,
            });

            expect(mockOnTargetFinish).toHaveBeenCalledWith(
                expect.objectContaining({
                    results: [
                        {
                            result: jobDescription,
                            error: null,
                        },
                    ],
                })
            );
        });

        it('should invoke onTargetFinish when all extraction requests complete', async () => {
            const uniqueKey1 = 'key-1';
            const uniqueKey2 = 'key-2';

            const tool: ScraperTool = {
                type: 'scraper',
                targets: [
                    {
                        targetId,
                        target,
                    },
                ],
                keywords,
                maxPages,
            };

            const targetRequest = {
                url: constants.placeholderUrl,
                uniqueKey: 'target-request-key',
                userData: {
                    [labelProperty]: constants.requestLabels.targetRequest,
                    [targetIdProperty]: targetId,
                    [targetProperty]: target,
                    [keywordsProperty]: keywords,
                    [maxPagesProperty]: maxPages,
                },
            } as unknown as CrawleeRequest<Dictionary>;

            const extractionRequest1 = {
                url: jobUrl,
                uniqueKey: uniqueKey1,
                userData: {
                    [labelProperty]: constants.requestLabels.extractionRequest,
                    [targetIdProperty]: targetId,
                    [targetProperty]: target,
                    [keywordsProperty]: keywords,
                    [maxPagesProperty]: maxPages,
                },
            } as unknown as CrawleeRequest<Dictionary>;

            const extractionRequest2 = {
                url: jobUrl,
                uniqueKey: uniqueKey2,
                userData: {
                    [labelProperty]: constants.requestLabels.extractionRequest,
                    [targetIdProperty]: targetId,
                    [targetProperty]: target,
                    [keywordsProperty]: keywords,
                    [maxPagesProperty]: maxPages,
                },
            } as unknown as CrawleeRequest<Dictionary>;

            vi.mocked(parseSchema)
                .mockReturnValueOnce({
                    success: true,
                    data: targetRequest.userData as ScraperRequest['userData'],
                })
                .mockReturnValueOnce({
                    success: true,
                    data: extractionRequest1.userData as ScraperRequest['userData'],
                })
                .mockReturnValueOnce({
                    success: true,
                    data: extractionRequest2.userData as ScraperRequest['userData'],
                });

            mockTarget.processRequest
                .mockResolvedValueOnce({
                    uniqueKeys: [uniqueKey1, uniqueKey2],
                    result: null,
                })
                .mockResolvedValueOnce({
                    uniqueKeys: null,
                    result: jobDescription,
                })
                .mockResolvedValueOnce({
                    uniqueKeys: null,
                    result: jobDescription,
                });

            await scraper.execute({
                tool,
                onTargetFinish: mockOnTargetFinish,
            });

            await requestHandler({
                page: mockPage,
                request: targetRequest as unknown as CrawleeRequest<Dictionary>,
                enqueueLinks: mockEnqueueLinks,
            });

            await requestHandler({
                page: mockPage,
                request: extractionRequest1,
                enqueueLinks: mockEnqueueLinks,
            });

            await requestHandler({
                page: mockPage,
                request: extractionRequest2 as unknown as CrawleeRequest<Dictionary>,
                enqueueLinks: mockEnqueueLinks,
            });

            expect(mockOnTargetFinish).toHaveBeenCalledTimes(1);
            expect(mockOnTargetFinish).toHaveBeenCalledWith(
                expect.objectContaining({
                    results: [
                        {
                            result: jobDescription,
                            error: null,
                        },
                        {
                            result: jobDescription,
                            error: null,
                        },
                    ],
                })
            );
        });

        it('should invoke onTargetFinish with error when request processing fails', async () => {
            const tool: ScraperTool = {
                type: 'scraper',
                targets: [
                    {
                        targetId,
                        target,
                    },
                ],
                keywords,
                maxPages,
            };

            const extractionRequest = {
                url: jobUrl,
                uniqueKey: uniqueKey,
                userData: {
                    [labelProperty]: constants.requestLabels.extractionRequest,
                    [targetIdProperty]: targetId,
                    [targetProperty]: target,
                    [keywordsProperty]: keywords,
                    [maxPagesProperty]: maxPages,
                },
            } as unknown as CrawleeRequest<Dictionary>;

            vi.mocked(parseSchema).mockReturnValue({
                success: true,
                data: extractionRequest.userData as ScraperRequest['userData'],
            });

            mockTarget.processRequest.mockResolvedValue({
                uniqueKeys: null,
                result: null,
            });

            await scraper.execute({
                tool,
                onTargetFinish: mockOnTargetFinish,
            });

            await requestHandler({
                page: mockPage,
                request: extractionRequest as unknown as CrawleeRequest<Dictionary>,
                enqueueLinks: mockEnqueueLinks,
            });

            expect(mockOnTargetFinish).toHaveBeenCalledWith(
                expect.objectContaining({
                    results: [
                        {
                            result: null,
                            error: {
                                message: expect.any(String),
                            },
                        },
                    ],
                })
            );
        });
    });
});
