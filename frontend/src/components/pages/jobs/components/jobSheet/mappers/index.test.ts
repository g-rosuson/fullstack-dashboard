import { set } from 'date-fns';

import type { JobFormSheetState, JobFormSheetTool } from '../types/JobSheet.types';

import mappers from '.';
import { JobScheduleType, type Tool } from '@/_types/_gen';

/**
 * Builds a JobFormSheetState with sensible defaults for mapper tests.
 */
const buildState = (overrides: Partial<JobFormSheetState> = {}): JobFormSheetState => ({
    name: 'Test job',
    scheduleType: '',
    startDate: new Date(2024, 5, 10),
    startTime: '09:00',
    endDate: undefined,
    endTime: '17:00',
    tools: [],
    toolToEdit: null,
    isEditing: false,
    isSubmitting: false,
    isToolDialogOpen: false,
    runJob: false,
    ...overrides,
});

describe('JobFormSheet mappers: mapToJobFormTools', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns an empty array when the API returns no tools', () => {
        expect(mappers.mapToJobFormTools([])).toEqual([]);
    });

    it('maps a scraper tool from the API shape into the form sheet shape', () => {
        const tools: Tool[] = [
            {
                type: 'scraper',
                toolId: 'tool-api-1',
                keywords: ['alpha'],
                maxPages: 8,
                targets: [
                    {
                        target: 'jobs-ch',
                        targetId: 'tgt-1',
                        keywords: ['beta'],
                        maxPages: 4,
                    },
                ],
            },
        ];

        expect(mappers.mapToJobFormTools(tools)).toEqual([
            {
                type: 'scraper',
                keyword: '',
                keywords: ['alpha'],
                maxPages: 8,
                toolId: 'tool-api-1',
                targets: [
                    {
                        label: 'Jobs-ch',
                        target: 'jobs-ch',
                        keyword: '',
                        keywords: ['beta'],
                        maxPages: 4,
                        targetId: 'tgt-1',
                    },
                ],
            },
        ]);
    });

    it('maps an email tool from the API shape into the form sheet shape', () => {
        const tools: Tool[] = [
            {
                type: 'email',
                toolId: 'email-tool-1',
                subject: 'Hello',
                body: 'World',
                targets: [
                    {
                        target: 'inbox',
                        targetId: 'et-1',
                        subject: 'T subj',
                        body: 'T body',
                    },
                ],
            },
        ];

        expect(mappers.mapToJobFormTools(tools)).toEqual([
            {
                type: 'email',
                subject: 'Hello',
                body: 'World',
                toolId: 'email-tool-1',
                targets: [
                    {
                        target: 'inbox',
                        label: 'Inbox',
                        subject: 'T subj',
                        body: 'T body',
                        targetId: 'et-1',
                    },
                ],
            },
        ]);
    });

    it('fills missing optional API fields with empty defaults on the form model', () => {
        const tools: Tool[] = [
            {
                type: 'scraper',
                toolId: 't',
                targets: [
                    {
                        target: 'jobs-ch',
                        targetId: 'tid',
                    },
                ],
            },
        ];

        expect(mappers.mapToJobFormTools(tools)).toEqual([
            {
                type: 'scraper',
                keyword: '',
                keywords: [],
                maxPages: 0,
                toolId: 't',
                targets: [
                    {
                        label: 'Jobs-ch',
                        target: 'jobs-ch',
                        keyword: '',
                        keywords: [],
                        maxPages: 0,
                        targetId: 'tid',
                    },
                ],
            },
        ]);
    });

    it('preserves tool order when multiple tools are returned', () => {
        const tools: Tool[] = [
            {
                type: 'email',
                toolId: 'e1',
                targets: [{ target: 'a', targetId: '1', subject: '', body: '' }],
            },
            {
                type: 'scraper',
                toolId: 's1',
                targets: [{ target: 'jobs-ch', targetId: '2' }],
            },
        ];

        const out = mappers.mapToJobFormTools(tools);

        expect(out).toHaveLength(2);
        expect(out[0].type).toBe('email');
        expect(out[1].type).toBe('scraper');
    });
});

describe('JobFormSheet mappers: schedule in create and update payloads', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('maps a missing schedule type to a null schedule on the create payload', () => {
        const state = buildState({ scheduleType: '' });

        expect(mappers.mapToCreateJobPayload(state).schedule).toBeNull();
    });

    it('maps start date and time into an ISO startDate and leaves endDate null when no end date is set', () => {
        const startDate = new Date(2024, 2, 5);
        const state = buildState({
            scheduleType: JobScheduleType.once,
            startDate,
            startTime: '14:45',
            endDate: undefined,
        });

        const expectedStart = set(startDate, {
            hours: 14,
            minutes: 45,
            seconds: 0,
            milliseconds: 0,
        }).toISOString();

        expect(mappers.mapToCreateJobPayload(state).schedule).toEqual({
            type: JobScheduleType.once,
            startDate: expectedStart,
            endDate: null,
        });
    });

    it('maps an end date and time into an ISO endDate when both are present', () => {
        const startDate = new Date(2024, 0, 1);
        const endDate = new Date(2024, 11, 31);
        const state = buildState({
            scheduleType: JobScheduleType.daily,
            startDate,
            startTime: '08:00',
            endDate,
            endTime: '18:30',
        });

        const expectedStart = set(startDate, {
            hours: 8,
            minutes: 0,
            seconds: 0,
            milliseconds: 0,
        }).toISOString();
        const expectedEnd = set(endDate, {
            hours: 18,
            minutes: 30,
            seconds: 0,
            milliseconds: 0,
        }).toISOString();

        expect(mappers.mapToCreateJobPayload(state).schedule).toEqual({
            type: JobScheduleType.daily,
            startDate: expectedStart,
            endDate: expectedEnd,
        });
    });

    it('throws when a schedule is requested but start date is missing', () => {
        const state = buildState({
            scheduleType: JobScheduleType.once,
            startDate: undefined,
            startTime: '10:00',
        });

        expect(() => mappers.mapToCreateJobPayload(state)).toThrow('Start date is required');
    });

    it('throws when the time string is not a valid clock value', () => {
        const state = buildState({
            scheduleType: JobScheduleType.once,
            startDate: new Date(2024, 0, 1),
            startTime: '25:99',
        });

        expect(() => mappers.mapToCreateJobPayload(state)).toThrow(/Invalid time string/);
    });
});

describe('JobFormSheet mappers: mapToCreateJobPayload', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('maps job name, schedule, and tools onto the create payload', () => {
        const state = buildState({
            name: 'New listing job',
            scheduleType: '',
            tools: [],
        });

        expect(mappers.mapToCreateJobPayload(state)).toMatchObject({
            name: 'New listing job',
            tools: [],
            schedule: null,
        });
    });

    it('maps a scraper form tool to create payload with maxPages 1 and omits empty keyword arrays', () => {
        const scraper: JobFormSheetTool = {
            type: 'scraper',
            keyword: '',
            keywords: [],
            maxPages: 50,
            toolId: 'tid',
            targets: [
                {
                    target: 'jobs-ch',
                    label: 'Jobs-ch',
                    keyword: '',
                    keywords: [],
                    maxPages: 10,
                    targetId: 'x1',
                },
            ],
        };

        const state = buildState({ scheduleType: '', tools: [scraper] });

        expect(mappers.mapToCreateJobPayload(state).tools).toEqual([
            {
                type: 'scraper',
                keywords: undefined,
                maxPages: 1,
                targets: [
                    {
                        target: 'jobs-ch',
                        targetId: 'x1',
                        keywords: undefined,
                        maxPages: 1,
                    },
                ],
            },
        ]);
    });

    it('maps non-empty scraper keywords through to the create payload', () => {
        const scraper: JobFormSheetTool = {
            type: 'scraper',
            keyword: '',
            keywords: ['one'],
            maxPages: 1,
            targets: [
                {
                    target: 'jobs-ch',
                    label: 'Jobs-ch',
                    keyword: '',
                    keywords: ['two'],
                    maxPages: 1,
                    targetId: 't1',
                },
            ],
        };

        const state = buildState({ scheduleType: '', tools: [scraper] });

        expect(mappers.mapToCreateJobPayload(state).tools[0]).toMatchObject({
            type: 'scraper',
            keywords: ['one'],
            targets: [{ keywords: ['two'] }],
        });
    });

    it('maps an email form tool to the create payload with subject, body, and targets', () => {
        const email: JobFormSheetTool = {
            type: 'email',
            subject: 'S',
            body: 'B',
            targets: [
                {
                    target: 'jobs-ch',
                    subject: 'ts',
                    body: 'tb',
                    targetId: 'e1',
                },
            ],
        };

        const state = buildState({ scheduleType: '', tools: [email] });

        expect(mappers.mapToCreateJobPayload(state).tools).toEqual([
            {
                type: 'email',
                subject: 'S',
                body: 'B',
                targets: [
                    {
                        target: 'jobs-ch',
                        targetId: 'e1',
                        subject: 'ts',
                        body: 'tb',
                    },
                ],
            },
        ]);
    });
});

describe('JobFormSheet mappers: mapToUpdateJobPayload', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('includes runJob on the update payload from form state', () => {
        const state = buildState({ scheduleType: '', runJob: true, tools: [] });

        expect(mappers.mapToUpdateJobPayload(state).runJob).toBe(true);
    });

    it('maps a scraper form tool to update payload with toolId and the same maxPages and keyword rules as create', () => {
        const scraper: JobFormSheetTool = {
            type: 'scraper',
            keyword: '',
            keywords: [],
            maxPages: 9,
            toolId: 'persisted-scraper',
            targets: [
                {
                    target: 'jobs-ch',
                    label: 'Jobs-ch',
                    keyword: '',
                    keywords: [],
                    maxPages: 2,
                    targetId: 'tr-1',
                },
            ],
        };

        const state = buildState({ scheduleType: '', tools: [scraper] });

        expect(mappers.mapToUpdateJobPayload(state).tools).toEqual([
            {
                type: 'scraper',
                toolId: 'persisted-scraper',
                keywords: undefined,
                maxPages: 1,
                targets: [
                    {
                        target: 'jobs-ch',
                        targetId: 'tr-1',
                        keywords: undefined,
                        maxPages: 1,
                    },
                ],
            },
        ]);
    });

    it('maps an email form tool to the update payload with toolId and target fields', () => {
        const email: JobFormSheetTool = {
            type: 'email',
            subject: 'Sub',
            body: 'Bd',
            toolId: 'persisted-email',
            targets: [
                {
                    target: 'jobs-ch',
                    subject: 'a',
                    body: 'b',
                    targetId: 'z',
                },
            ],
        };

        const state = buildState({ scheduleType: '', tools: [email] });

        expect(mappers.mapToUpdateJobPayload(state).tools).toEqual([
            {
                type: 'email',
                toolId: 'persisted-email',
                subject: 'Sub',
                targets: [
                    {
                        target: 'jobs-ch',
                        targetId: 'z',
                        subject: 'a',
                        body: 'b',
                    },
                ],
            },
        ]);
    });
});
