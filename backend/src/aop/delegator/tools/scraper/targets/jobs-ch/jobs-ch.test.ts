import { beforeEach, describe, expect, it, vi } from 'vitest';

import scraperConstants from '../../constants';
import constants from './constants';

import type { DescriptionSection, InformationItem, RequestUserData } from '../../types';
import type { Dictionary, Request } from 'crawlee';
import type { Page } from 'playwright';

import JobsChTarget from './index';

/**
 * Testing Strategy for JobsChTarget
 *
 * This test suite tests a web scraper class that extracts job data from jobs.ch.
 * Key testing considerations:
 *
 * 1. PLAYWRIGHT MOCKING: The class uses Playwright Page objects for DOM access.
 *    - Mock Page methods (goto, waitForSelector, textContent, locator, $)
 *    - Mock Locator methods (evaluate)
 *    - Mock Element methods (querySelector, querySelectorAll, textContent, closest)
 *
 * 2. REQUEST TYPES: The class handles two request types:
 *    - Extraction requests: Scrape job detail pages and return structured data
 *    - Target requests: Enqueue extraction requests by paginating through search results
 *
 * 3. DATA EXTRACTION: Tests verify extraction of:
 *    - Job title
 *    - Company name (with/without link)
 *    - Information items (label-value pairs)
 *    - Description sections (with/without titles)
 *
 * 4. ERROR HANDLING: Tests verify proper error handling and return structure.
 *
 * 5. ENQUEUE LINKS: Tests verify proper enqueuing of extraction requests with correct userData.
 */

describe('JobsChTarget', () => {
    let jobsChTarget: JobsChTarget;
    let mockPage: Page;
    let mockEnqueueLinks: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        jobsChTarget = new JobsChTarget();

        // Mock Playwright Page object
        mockPage = {
            goto: vi.fn().mockResolvedValue(undefined),
            waitForSelector: vi.fn().mockResolvedValue(undefined),
            url: vi.fn().mockReturnValue('https://www.jobs.ch/en/vacancies/?term=test&page=1'),
            textContent: vi.fn(),
            locator: vi.fn(),
            $: vi.fn(),
        } as unknown as Page;

        // Mock enqueueLinks function
        mockEnqueueLinks = vi.fn().mockResolvedValue({
            processedRequests: [],
        });
    });

    describe('processRequest(): extraction request', () => {
        const urlProperty = 'url';
        const titleProperty = 'title';
        const descriptionProperty = 'description';
        const informationProperty = 'information';
        const labelProperty = 'label';
        const valueProperty = 'value';

        const jobUrl = 'https://www.jobs.ch/en/vacancies/detail/test-job-123';
        const jobTitle = 'Software Engineer';
        const companyName = 'Tech Company';
        const locationLabel = 'Location';
        const locationValue = 'Zurich';
        const salaryLabel = 'Salary';
        const salaryValue = '100k-120k';

        const extractionRequest = {
            url: jobUrl,
            userData: {
                label: scraperConstants.requestLabels.extractionRequest,
                targetId: 'target-1',
                target: 'jobs-ch',
                keywords: ['software', 'engineer'],
                maxPages: 1,
            },
        };

        it('should extract job data from detail page', async () => {
            const mockCompanyLink = {
                evaluate: vi.fn().mockResolvedValue(companyName),
            };

            const mockDescriptionLocator = {
                evaluate: vi.fn().mockResolvedValue([
                    {
                        title: 'Frontend Developer',
                        blocks: ['Experience with TypeScript', 'Experience with React'],
                    },
                ] as DescriptionSection[]),
            };

            const mockInfoLocator = {
                evaluate: vi.fn().mockResolvedValue([
                    { [labelProperty]: locationLabel, [valueProperty]: locationValue },
                    { [labelProperty]: salaryLabel, [valueProperty]: salaryValue },
                ] as InformationItem[]),
            };

            (mockPage.textContent as ReturnType<typeof vi.fn>).mockResolvedValue(jobTitle);
            (mockPage.$ as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompanyLink);
            (mockPage.locator as ReturnType<typeof vi.fn>).mockImplementation((selector: string) => {
                if (selector === constants.selectors.descriptionSelector) {
                    return mockDescriptionLocator;
                }
                if (selector === constants.selectors.infoSelector) {
                    return mockInfoLocator;
                }
                return {};
            });

            const options = {
                page: mockPage,
                request: extractionRequest as unknown as Request<Dictionary>,
                userData: extractionRequest.userData as unknown as RequestUserData,
                enqueueLinks: mockEnqueueLinks,
            };

            const result = await jobsChTarget.processRequest(options);

            expect(mockPage.goto).toHaveBeenCalledWith(jobUrl);
            expect(mockPage.waitForSelector).toHaveBeenCalledWith(constants.selectors.titleSelector);
            expect(result).toEqual({
                uniqueKeys: null,
                result: {
                    [urlProperty]: jobUrl,
                    [titleProperty]: jobTitle,
                    [descriptionProperty]: [
                        {
                            title: 'Frontend Developer',
                            blocks: ['Experience with TypeScript', 'Experience with React'],
                        },
                    ],
                    [informationProperty]: [
                        { [labelProperty]: locationLabel, [valueProperty]: locationValue },
                        { [labelProperty]: salaryLabel, [valueProperty]: salaryValue },
                        { [labelProperty]: 'Company', [valueProperty]: companyName },
                    ],
                },
            });
        });

        it('should handle company name without link', async () => {
            const mockVacancyLogo = {
                evaluate: vi.fn().mockResolvedValue(companyName),
            };

            const mockDescriptionLocator = {
                evaluate: vi.fn().mockResolvedValue([] as DescriptionSection[]),
            };

            const mockInfoLocator = {
                evaluate: vi.fn().mockResolvedValue([] as InformationItem[]),
            };

            (mockPage.textContent as ReturnType<typeof vi.fn>).mockResolvedValue(jobTitle);
            (mockPage.$ as ReturnType<typeof vi.fn>).mockImplementation((selector: string) => {
                if (selector === constants.selectors.companyNameSelector) {
                    return null;
                }
                if (selector === constants.selectors.vacancyLogoSelector) {
                    return mockVacancyLogo;
                }
                return null;
            });
            (mockPage.locator as ReturnType<typeof vi.fn>).mockImplementation((selector: string) => {
                if (selector === constants.selectors.descriptionSelector) {
                    return mockDescriptionLocator;
                }
                if (selector === constants.selectors.infoSelector) {
                    return mockInfoLocator;
                }
                return {};
            });

            const options = {
                page: mockPage,
                request: extractionRequest as unknown as Request<Dictionary>,
                userData: extractionRequest.userData as unknown as RequestUserData,
                enqueueLinks: mockEnqueueLinks,
            };

            const result = await jobsChTarget.processRequest(options);

            expect(result.result?.information).toContainEqual({
                [labelProperty]: 'Company',
                [valueProperty]: companyName,
            });
        });

        it('should handle missing company name', async () => {
            const mockDescriptionLocator = {
                evaluate: vi.fn().mockResolvedValue([] as DescriptionSection[]),
            };

            const mockInfoLocator = {
                evaluate: vi.fn().mockResolvedValue([] as InformationItem[]),
            };

            (mockPage.textContent as ReturnType<typeof vi.fn>).mockResolvedValue(jobTitle);
            (mockPage.$ as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            (mockPage.locator as ReturnType<typeof vi.fn>).mockImplementation((selector: string) => {
                if (selector === constants.selectors.descriptionSelector) {
                    return mockDescriptionLocator;
                }
                if (selector === constants.selectors.infoSelector) {
                    return mockInfoLocator;
                }
                return {};
            });

            const options = {
                page: mockPage,
                request: extractionRequest as unknown as Request<Dictionary>,
                userData: extractionRequest.userData as unknown as RequestUserData,
                enqueueLinks: mockEnqueueLinks,
            };

            const result = await jobsChTarget.processRequest(options);

            expect(result.result?.information).toContainEqual({
                [labelProperty]: 'Company',
                [valueProperty]: '',
            });
        });

        it('should handle empty title', async () => {
            const mockCompanyLink = {
                evaluate: vi.fn().mockResolvedValue(companyName),
            };

            const mockDescriptionLocator = {
                evaluate: vi.fn().mockResolvedValue([] as DescriptionSection[]),
            };

            const mockInfoLocator = {
                evaluate: vi.fn().mockResolvedValue([] as InformationItem[]),
            };

            (mockPage.textContent as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            (mockPage.$ as ReturnType<typeof vi.fn>).mockResolvedValue(mockCompanyLink);
            (mockPage.locator as ReturnType<typeof vi.fn>).mockImplementation((selector: string) => {
                if (selector === constants.selectors.descriptionSelector) {
                    return mockDescriptionLocator;
                }
                if (selector === constants.selectors.infoSelector) {
                    return mockInfoLocator;
                }
                return {};
            });

            const options = {
                page: mockPage,
                request: extractionRequest as unknown as Request<Dictionary>,
                userData: extractionRequest.userData as unknown as RequestUserData,
                enqueueLinks: mockEnqueueLinks,
            };

            const result = await jobsChTarget.processRequest(options);

            expect(result.result?.title).toBe('');
        });
    });

    describe('processRequest(): target request', () => {
        const keywordsProperty = 'keywords';
        const maxPagesProperty = 'maxPages';
        const targetIdProperty = 'targetId';
        const targetProperty = 'target';
        const labelProperty = 'label';

        const keywords = ['software', 'engineer'];
        const maxPages = 2;
        const targetId = 'target-1';
        const target = 'jobs-ch';
        const baseUrl = constants.configuration.baseUrl;

        const targetRequest = {
            url: baseUrl,
            userData: {
                label: scraperConstants.requestLabels.targetRequest,
                [targetIdProperty]: targetId,
                [targetProperty]: target,
                [keywordsProperty]: keywords,
                [maxPagesProperty]: maxPages,
            },
        };

        it('should enqueue extraction requests for multiple pages', async () => {
            const uniqueKey1 = 'key-1';
            const uniqueKey2 = 'key-2';

            const mockRequest1 = { uniqueKey: uniqueKey1 };
            const mockRequest2 = { uniqueKey: uniqueKey2 };

            const mockResultsContainer = {};

            (mockPage.locator as ReturnType<typeof vi.fn>).mockImplementation((selector: string) => {
                if (selector === constants.selectors.resultsContainer) {
                    return mockResultsContainer;
                }
                return {};
            });

            (mockPage.url as ReturnType<typeof vi.fn>)
                .mockReturnValueOnce(`${baseUrl}?term=${keywords.join(' ')}&page=1`)
                .mockReturnValueOnce(`${baseUrl}?term=${keywords.join(' ')}&page=2`);

            mockEnqueueLinks
                .mockResolvedValueOnce({
                    processedRequests: [mockRequest1],
                })
                .mockResolvedValueOnce({
                    processedRequests: [mockRequest2],
                });

            const options = {
                page: mockPage,
                request: targetRequest as unknown as Request<Dictionary>,
                userData: targetRequest.userData as unknown as RequestUserData,
                enqueueLinks: mockEnqueueLinks,
            };

            const result = await jobsChTarget.processRequest(options);

            expect(mockPage.goto).toHaveBeenCalledTimes(maxPages);
            expect(mockEnqueueLinks).toHaveBeenCalledTimes(maxPages);
            expect(mockEnqueueLinks).toHaveBeenCalledWith({
                baseUrl: baseUrl,
                selector: constants.selectors.itemSelector,
                globs: constants.configuration.extractionGlobs,
                transformRequestFunction: expect.any(Function),
            });
            expect(result).toEqual({
                uniqueKeys: [uniqueKey1, uniqueKey2],
                result: null,
            });
        });

        it('should stop pagination when page does not exist', async () => {
            const uniqueKey1 = 'key-1';
            const mockRequest1 = { uniqueKey: uniqueKey1 };
            const mockResultsContainer = {};

            (mockPage.locator as ReturnType<typeof vi.fn>).mockImplementation((selector: string) => {
                if (selector === constants.selectors.resultsContainer) {
                    return mockResultsContainer;
                }
                return {};
            });

            (mockPage.url as ReturnType<typeof vi.fn>)
                .mockReturnValueOnce(`${baseUrl}?term=${keywords.join(' ')}&page=1`)
                .mockReturnValueOnce(`${baseUrl}?term=${keywords.join(' ')}&page=3`); // Page 2 doesn't exist

            mockEnqueueLinks.mockResolvedValueOnce({
                processedRequests: [mockRequest1],
            });

            const options = {
                page: mockPage,
                request: targetRequest as unknown as Request<Dictionary>,
                userData: targetRequest.userData as unknown as RequestUserData,
                enqueueLinks: mockEnqueueLinks,
            };

            const result = await jobsChTarget.processRequest(options);

            expect(mockPage.goto).toHaveBeenCalledTimes(2);
            expect(mockEnqueueLinks).toHaveBeenCalledTimes(1);
            expect(result).toEqual({
                uniqueKeys: [uniqueKey1],
                result: null,
            });
        });

        it('should transform requests with correct userData', async () => {
            const mockRequest = { uniqueKey: 'key-1' };
            const mockResultsContainer = {};

            (mockPage.locator as ReturnType<typeof vi.fn>).mockImplementation((selector: string) => {
                if (selector === constants.selectors.resultsContainer) {
                    return mockResultsContainer;
                }
                return {};
            });

            (mockPage.url as ReturnType<typeof vi.fn>).mockReturnValue(`${baseUrl}?term=${keywords.join(' ')}&page=1`);

            // eslint-disable-next-line no-unused-vars
            let transformRequestFunction: ((request: Request) => Request) | undefined;

            mockEnqueueLinks.mockImplementation((options: unknown) => {
                // eslint-disable-next-line no-unused-vars
                const tmpOptions = options as { transformRequestFunction: (request: Request) => Request };
                transformRequestFunction = tmpOptions.transformRequestFunction;

                return Promise.resolve({
                    processedRequests: [mockRequest],
                });
            });

            const options = {
                page: mockPage,
                request: targetRequest as unknown as Request<Dictionary>,
                userData: targetRequest.userData as unknown as RequestUserData,
                enqueueLinks: mockEnqueueLinks,
            };

            await jobsChTarget.processRequest(options);

            expect(transformRequestFunction).toBeDefined();

            if (transformRequestFunction) {
                const transformedRequest = transformRequestFunction(targetRequest as unknown as Request<Dictionary>);

                expect(transformedRequest.userData).toEqual({
                    [targetIdProperty]: targetId,
                    [targetProperty]: target,
                    [keywordsProperty]: keywords,
                    [maxPagesProperty]: maxPages,
                    [labelProperty]: scraperConstants.requestLabels.extractionRequest,
                });
            }
        });
    });

    describe('processRequest(): error handling', () => {
        const jobUrl = 'https://www.jobs.ch/en/vacancies/detail/test-job-123';
        const errorMessage = 'Navigation failed';

        const extractionRequest = {
            url: jobUrl,
            userData: {
                label: scraperConstants.requestLabels.extractionRequest,
                targetId: 'target-1',
                target: 'jobs-ch',
                keywords: ['software'],
                maxPages: 1,
            },
        };

        it('should return error result when extraction fails', async () => {
            (mockPage.goto as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(errorMessage));

            const options = {
                page: mockPage,
                request: extractionRequest as unknown as Request<Dictionary>,
                userData: extractionRequest.userData as unknown as RequestUserData,
                enqueueLinks: mockEnqueueLinks,
            };

            const result = await jobsChTarget.processRequest(options);

            expect(result).toEqual({
                uniqueKeys: null,
                result: null,
                error: expect.objectContaining({
                    message: errorMessage,
                }),
            });
        });

        it('should return error result when target request fails', async () => {
            const targetRequest = {
                url: constants.configuration.baseUrl,
                userData: {
                    label: scraperConstants.requestLabels.targetRequest,
                    targetId: 'target-1',
                    target: 'jobs-ch',
                    keywords: ['software'],
                    maxPages: 1,
                },
            };

            (mockPage.goto as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(errorMessage));

            const options = {
                page: mockPage,
                request: targetRequest as unknown as Request<Dictionary>,
                userData: targetRequest.userData as unknown as RequestUserData,
                enqueueLinks: mockEnqueueLinks,
            };

            const result = await jobsChTarget.processRequest(options);

            expect(result).toEqual({
                uniqueKeys: null,
                result: null,
                error: expect.objectContaining({
                    message: errorMessage,
                }),
            });
        });
    });
});
