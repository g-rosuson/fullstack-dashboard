import { ObjectId } from 'mongodb';

import type { CreateJobInput, UpdateJobInput } from 'modules/jobs/types';

import { ErrorCode } from 'aop/exceptions/shared/enums';

import constants from 'shared/constants';

import { ErrorMessage } from 'shared/enums/error-messages';

import type { Express } from 'express';
import type { IncomingMessage } from 'http';
import type { JobSchedule } from 'shared/types/jobs';

import { clearCollections, deleteCronJobs, disconnectMongo, getAgent, initServer } from '../harness';
import { buildRegisterPayload, expectValidAccessToken, getRegisterResponse } from '../helpers';

/** ~20 days ahead: stays under Node's ~32‑bit signed `setTimeout` max (~24.8 days). */
const INTEGRATION_JOB_START_DELAY_MS = 20 * 24 * 60 * 60 * 1000;

/**
 * Daily schedule anchored in the medium-term future so cron side-effects stay outside normal test runtime.
 */
const buildJobWithSchedulePayload = (name: string): CreateJobInput => ({
    name,
    schedule: {
        type: 'daily',
        startDate: new Date(Date.now() + INTEGRATION_JOB_START_DELAY_MS).toISOString(),
        endDate: null,
    },
    tools: [
        {
            type: 'scraper',
            keywords: ['typescript'],
            maxPages: 1,
            targets: [
                {
                    target: 'jobs-ch',
                    keywords: ['remote'],
                    maxPages: 1,
                },
            ],
        },
    ],
});

/**
 * Immediate job (no schedule): satisfies scraper cross-field rules via tool-level keywords/maxPages.
 */
const buildJobWithoutSchedulePayload = (name: string): CreateJobInput => ({
    name,
    schedule: null,
    tools: [
        {
            type: 'scraper',
            keywords: ['integration'],
            maxPages: 1,
            targets: [{ target: 'jobs-ch' }],
        },
    ],
});

/**
 * Builds the URL for the job route.
 * @param routeTemplate The template for the job route
 * @param id The id of the job
 * @returns The URL for the job route
 */
function buildJobUrl(routeTemplate: string, id: string): string {
    return routeTemplate.replace(':id', id);
}

/**
 * Builds the PUT body from a GET/create job shape. When `partial.schedule` is omitted,
 * copies only `type` / `startDate` / `endDate` so enriched fields (`nextRun`, `lastRun`) are dropped.
 */
function buildUpdateJobPayload(
    job: { name: string; schedule: JobSchedule; tools: UpdateJobInput['tools'] },
    partial: Partial<UpdateJobInput> = {}
): UpdateJobInput {
    let schedule: UpdateJobInput['schedule'];

    if (partial.schedule !== undefined) {
        schedule = partial.schedule;
    } else if (job.schedule == null) {
        schedule = null;
    } else {
        const s = job.schedule as { type: string; startDate: string; endDate: string | null };

        schedule = {
            type: s.type,
            startDate: s.startDate,
            endDate: s.endDate ?? null,
        } as UpdateJobInput['schedule'];
    }

    return {
        name: partial.name ?? job.name,
        schedule,
        tools: partial.tools ?? job.tools,
        runJob: partial.runJob ?? false,
    };
}

/**
 * Integration: jobs HTTP — real Mongo, middleware, and route handlers.
 * Each `describe` names the endpoint (`METHOD path`); scenario detail lives in `it` titles and IDs.
 *
 * Requirement IDs: docs/requirements/jobs-http-contract.md
 */
describe('Integration: jobs HTTP', () => {
    let app: Express;
    let agent: ReturnType<typeof getAgent>;

    beforeAll(async () => {
        app = await initServer();
        agent = getAgent(app);
    });

    beforeEach(async () => {
        await deleteCronJobs();
        await clearCollections();
    });

    afterAll(async () => {
        await deleteCronJobs();
        await clearCollections();
        await disconnectMongo();
    });

    describe(`GET ${constants.routes.jobs.getAll} — unauthenticated access`, () => {
        it('[JOBS-AUTH-001] rejects jobs requests without an Authorization header', async () => {
            const res = await agent.get(constants.routes.jobs.getAll);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe(ErrorCode.VALIDATION_ERROR);
        });
    });

    describe(`GET ${constants.routes.jobs.getAll}`, () => {
        it('[JOBS-LST-001] returns an empty list and default pagination metadata', async () => {
            const registerResponse = await getRegisterResponse(agent, 'empty-list@example.com');
            expect(registerResponse.status).toBe(200);

            const getAllResponse = await agent
                .get(constants.routes.jobs.getAll)
                .set('Authorization', `Bearer ${registerResponse.body.data}`);

            expect(getAllResponse.status).toBe(200);
            expect(getAllResponse.body.success).toBe(true);
            expect(getAllResponse.body.data).toEqual([]);
            expect(getAllResponse.body.limit).toBe(0);
            expect(getAllResponse.body.offset).toBe(0);
            expect(getAllResponse.body.count).toBe(0);
        });
        it('[JOBS-LST-002] respects limit and offset query params', async () => {
            const registerResponse = await getRegisterResponse(agent, 'pagination@example.com');
            expect(registerResponse.status).toBe(200);

            const token = registerResponse.body.data;

            for (let i = 0; i < 3; i++) {
                const createRes = await agent
                    .post(constants.routes.jobs.create)
                    .set('Authorization', `Bearer ${token}`)
                    .send(buildJobWithoutSchedulePayload(`Paginated job ${i}`));
                expect(createRes.status).toBe(201);
            }

            const firstPage = await agent
                .get(constants.routes.jobs.getAll)
                .query({ limit: '2', offset: '0' })
                .set('Authorization', `Bearer ${token}`);

            expect(firstPage.status).toBe(200);
            expect(firstPage.body.success).toBe(true);
            expect(firstPage.body.data).toHaveLength(2);
            expect(firstPage.body.limit).toBe(2);
            expect(firstPage.body.offset).toBe(0);
            expect(firstPage.body.count).toBe(2);

            const secondPage = await agent
                .get(constants.routes.jobs.getAll)
                .query({ limit: '2', offset: '2' })
                .set('Authorization', `Bearer ${token}`);

            expect(secondPage.status).toBe(200);
            expect(secondPage.body.data).toHaveLength(1);
            expect(secondPage.body.limit).toBe(2);
            expect(secondPage.body.offset).toBe(2);
            expect(secondPage.body.count).toBe(1);

            const ids = [...firstPage.body.data, ...secondPage.body.data].map((j: { id: string }) => j.id);
            expect(new Set(ids).size).toBe(3);
        });
    });

    describe(`GET ${constants.routes.jobs.getById}`, () => {
        const emailA = 'owner-a@example.com';
        const emailB = 'owner-b@example.com';

        it('[JOBS-ISO-001] returns not found when another user requests a job by id', async () => {
            const regA = await getRegisterResponse(agent, emailA);
            expect(regA.status).toBe(200);
            expectValidAccessToken(regA.body.data, emailA);

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${regA.body.data}`)
                .send(buildJobWithSchedulePayload('Owned by A'));

            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const regB = await getRegisterResponse(agent, emailB);
            expect(regB.status).toBe(200);
            expectValidAccessToken(regB.body.data, emailB);

            const getRes = await agent
                .get(buildJobUrl(constants.routes.jobs.getById, jobId))
                .set('Authorization', `Bearer ${regB.body.data}`);

            expect(getRes.status).toBe(404);
            expect(getRes.body.success).toBe(false);
            expect(getRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);
        });

        it('[JOBS-GET-001] returns the job with enriched schedule when scheduled', async () => {
            const registerResponse = await getRegisterResponse(agent, 'owner-get@example.com');
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(buildJobWithSchedulePayload('Owner fetch'));

            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const getRes = await agent
                .get(buildJobUrl(constants.routes.jobs.getById, jobId))
                .set('Authorization', `Bearer ${token}`);

            expect(getRes.status).toBe(200);
            expect(getRes.body.success).toBe(true);
            expect(getRes.body.data.id).toBe(jobId);
            expect(getRes.body.data.name).toBe('Owner fetch');
            expect(getRes.body.data.schedule).not.toBeNull();
            expect(getRes.body.data.schedule.type).toBe('daily');
            expect(typeof getRes.body.data.schedule.nextRun).toBe('string');
        });

        it('[JOBS-GET-002] returns not found for a non-existent job id', async () => {
            const registerResponse = await getRegisterResponse(agent, 'unknown-get@example.com');
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;
            const missingId = new ObjectId().toString();

            const getRes = await agent
                .get(buildJobUrl(constants.routes.jobs.getById, missingId))
                .set('Authorization', `Bearer ${token}`);

            expect(getRes.status).toBe(404);
            expect(getRes.body.success).toBe(false);
            expect(getRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);
        });
    });

    describe(`POST ${constants.routes.jobs.create}`, () => {
        it('[JOBS-CRT-001] creates a job without a schedule and returns 201', async () => {
            const email = 'immediate-job@example.com';
            const registerResponse = await getRegisterResponse(agent, email);
            expect(registerResponse.status).toBe(200);
            expectValidAccessToken(registerResponse.body.data, email);

            const name = 'Run-once job';
            const res = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${registerResponse.body.data}`)
                .send(buildJobWithoutSchedulePayload(name));

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe(name);
            expect(res.body.data.id).toBeDefined();
            expect(res.body.data.schedule).toBeNull();
            expect(res.body.data.tools).toHaveLength(1);
            expect(res.body.data.tools[0].toolId).toBeDefined();
            expect(res.body.data.tools[0].targets[0].targetId).toBeDefined();
        });

        it('[JOBS-CRT-002] creates a scheduled job and returns enriched schedule metadata', async () => {
            const email = 'scheduled-job@example.com';
            const registerResponse = await getRegisterResponse(agent, email);
            expect(registerResponse.status).toBe(200);

            const name = 'Daily engineering jobs';
            const res = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${registerResponse.body.data}`)
                .send(buildJobWithSchedulePayload(name));

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.name).toBe(name);
            expect(res.body.data.schedule).not.toBeNull();
            expect(res.body.data.schedule.type).toBe('daily');
            expect(res.body.data.schedule.startDate).toBeDefined();
            expect(typeof res.body.data.schedule.nextRun).toBe('string');
            const { lastRun } = res.body.data.schedule;
            expect(lastRun === null || typeof lastRun === 'string').toBe(true);
        });

        it('[JOBS-SCH-001] rejects a schedule whose start date is not in the future', async () => {
            const email = 'past-start@example.com';
            const registerResponse = await getRegisterResponse(agent, email);
            expect(registerResponse.status).toBe(200);

            const payload: CreateJobInput = {
                ...buildJobWithSchedulePayload('Past start'),
                schedule: {
                    type: 'daily',
                    startDate: new Date(Date.now() - 86_400_000).toISOString(),
                    endDate: null,
                },
            };

            const res = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${registerResponse.body.data}`)
                .send(payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe(ErrorCode.VALIDATION_ERROR);
            expect(res.body.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        property: 'startDate',
                        message: ErrorMessage.JOBS_START_DATE_IN_FUTURE,
                    }),
                ])
            );
        });

        it('[JOBS-SCH-002] rejects a schedule where end date is before start date', async () => {
            const email = 'end-before-start@example.com';
            const registerResponse = await agent.post(constants.routes.auth.register).send(buildRegisterPayload(email));
            expect(registerResponse.status).toBe(200);

            const start = new Date(Date.now() + INTEGRATION_JOB_START_DELAY_MS).toISOString();
            const end = new Date(Date.now() + INTEGRATION_JOB_START_DELAY_MS - 86_400_000).toISOString();

            const payload: CreateJobInput = {
                ...buildJobWithSchedulePayload('Inverted range'),
                schedule: {
                    type: 'daily',
                    startDate: start,
                    endDate: end,
                },
            };

            const res = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${registerResponse.body.data}`)
                .send(payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe(ErrorCode.VALIDATION_ERROR);
            expect(res.body.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        property: 'startDate',
                        message: ErrorMessage.JOBS_START_DATE_COME_BEFORE_END_DATE,
                    }),
                ])
            );
        });

        it('[JOBS-SCH-003] rejects a one-off schedule that includes an end date', async () => {
            const email = 'once-end@example.com';
            const registerResponse = await agent.post(constants.routes.auth.register).send(buildRegisterPayload(email));
            expect(registerResponse.status).toBe(200);

            const start = new Date(Date.now() + INTEGRATION_JOB_START_DELAY_MS).toISOString();
            const end = new Date(Date.now() + INTEGRATION_JOB_START_DELAY_MS + 86_400_000).toISOString();

            const payload: CreateJobInput = {
                ...buildJobWithSchedulePayload('Once with end'),
                schedule: {
                    type: 'once',
                    startDate: start,
                    endDate: end,
                },
            };

            const res = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${registerResponse.body.data}`)
                .send(payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe(ErrorCode.VALIDATION_ERROR);
            expect(res.body.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        property: 'endDate',
                        message: ErrorMessage.JOBS_ONCE_TYPE_CANNOT_HAVE_END_DATE,
                    }),
                ])
            );
        });

        it('[JOBS-TLR-001] rejects a scraper when tool and target both omit keywords', async () => {
            const email = 'scraper-kw@example.com';
            const registerResponse = await getRegisterResponse(agent, email);
            expect(registerResponse.status).toBe(200);

            const payload: CreateJobInput = {
                name: 'Bad scraper keywords',
                schedule: null,
                tools: [
                    {
                        type: 'scraper',
                        maxPages: 1,
                        targets: [{ target: 'jobs-ch', maxPages: 1 }],
                    },
                ],
            };

            const res = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${registerResponse.body.data}`)
                .send(payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe(ErrorCode.VALIDATION_ERROR);
            expect(res.body.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        property: 'keywords',
                    }),
                ])
            );
        });

        it('[JOBS-TLR-002] rejects a scraper when tool and target both omit maxPages', async () => {
            const email = 'scraper-pages@example.com';
            const registerResponse = await getRegisterResponse(agent, email);
            expect(registerResponse.status).toBe(200);

            const payload: CreateJobInput = {
                name: 'Bad scraper maxPages',
                schedule: null,
                tools: [
                    {
                        type: 'scraper',
                        keywords: ['integration'],
                        targets: [{ target: 'jobs-ch', keywords: ['nested'] }],
                    },
                ],
            };

            const res = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${registerResponse.body.data}`)
                .send(payload);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe(ErrorCode.VALIDATION_ERROR);
            expect(res.body.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        property: 'maxPages',
                    }),
                ])
            );
        });

        it('[JOBS-TLR-003] rejects email tools when subject or body is missing on tool and targets', async () => {
            const emailUser = 'email-tool@example.com';
            const registerResponse = await getRegisterResponse(agent, emailUser);
            expect(registerResponse.status).toBe(200);

            const token = registerResponse.body.data as string;

            const missingSubject: CreateJobInput = {
                name: 'Email missing subject',
                schedule: null,
                tools: [
                    {
                        type: 'email',
                        targets: [{ target: 'recipient@example.com', body: 'Hello' }],
                    },
                ],
            };

            const subjectRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(missingSubject);

            expect(subjectRes.status).toBe(400);
            expect(subjectRes.body.success).toBe(false);
            expect(subjectRes.body.code).toBe(ErrorCode.VALIDATION_ERROR);
            expect(subjectRes.body.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        property: 'subject',
                    }),
                ])
            );

            const missingBody: CreateJobInput = {
                name: 'Email missing body',
                schedule: null,
                tools: [
                    {
                        type: 'email',
                        subject: 'Hello',
                        targets: [{ target: 'recipient@example.com' }],
                    },
                ],
            };

            const bodyRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(missingBody);

            expect(bodyRes.status).toBe(400);
            expect(bodyRes.body.success).toBe(false);
            expect(bodyRes.body.code).toBe(ErrorCode.VALIDATION_ERROR);
            expect(bodyRes.body.issues).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        property: 'body',
                    }),
                ])
            );
        });
    });

    describe(`PUT ${constants.routes.jobs.update}`, () => {
        it('[JOBS-ISO-002] returns not found when another user updates a job', async () => {
            const emailA = 'put-owner@example.com';
            const emailB = 'put-intruder@example.com';
            const regA = await getRegisterResponse(agent, emailA);
            expect(regA.status).toBe(200);
            const tokenA = regA.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${tokenA}`)
                .send(buildJobWithSchedulePayload('PUT iso'));

            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const regB = await getRegisterResponse(agent, emailB);
            expect(regB.status).toBe(200);
            const tokenB = regB.body.data as string;

            const payload = buildUpdateJobPayload(createRes.body.data, { name: 'Stolen' });

            const putRes = await agent
                .put(buildJobUrl(constants.routes.jobs.update, jobId))
                .set('Authorization', `Bearer ${tokenB}`)
                .send(payload);

            expect(putRes.status).toBe(404);
            expect(putRes.body.success).toBe(false);
            expect(putRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);
        });

        it('[JOBS-UPD-001] updates name and tools then persists on follow-up GET', async () => {
            const registerResponse = await getRegisterResponse(agent, 'put-happy@example.com');
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(buildJobWithSchedulePayload('Before PUT'));

            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const payload = buildUpdateJobPayload(createRes.body.data, { name: 'After PUT' });

            const putRes = await agent
                .put(buildJobUrl(constants.routes.jobs.update, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send(payload);

            expect(putRes.status).toBe(200);
            expect(putRes.body.success).toBe(true);
            expect(putRes.body.data.name).toBe('After PUT');

            const getRes = await agent
                .get(buildJobUrl(constants.routes.jobs.getById, jobId))
                .set('Authorization', `Bearer ${token}`);

            expect(getRes.status).toBe(200);
            expect(getRes.body.data.name).toBe('After PUT');
        });

        it('[JOBS-UPD-002] clears schedule when schedule is set to null', async () => {
            const registerResponse = await getRegisterResponse(agent, 'put-clear-schedule@example.com');
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(buildJobWithSchedulePayload('Scheduled then cleared'));

            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const putRes = await agent
                .put(buildJobUrl(constants.routes.jobs.update, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send(
                    buildUpdateJobPayload(createRes.body.data, {
                        schedule: null,
                        runJob: false,
                    })
                );

            expect(putRes.status).toBe(200);
            expect(putRes.body.data.schedule).toBeNull();

            const getRes = await agent
                .get(buildJobUrl(constants.routes.jobs.getById, jobId))
                .set('Authorization', `Bearer ${token}`);

            expect(getRes.status).toBe(200);
            expect(getRes.body.data.schedule).toBeNull();
        });

        it('[JOBS-UPD-003] accepts schedule null with runJob true', async () => {
            const registerResponse = await getRegisterResponse(agent, 'put-runjob@example.com');
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(buildJobWithSchedulePayload('Run job flag'));

            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const putRes = await agent
                .put(buildJobUrl(constants.routes.jobs.update, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send(
                    buildUpdateJobPayload(createRes.body.data, {
                        schedule: null,
                        runJob: true,
                    })
                );

            expect(putRes.status).toBe(200);
            expect(putRes.body.data.schedule).toBeNull();
        });

        it('[JOBS-UPD-004] rejects update while the job delegate is running', async () => {
            const registerResponse = await getRegisterResponse(agent, 'put-running@example.com');
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(buildJobWithoutSchedulePayload('Running guard'));

            expect(createRes.status).toBe(201);
            const job = createRes.body.data;
            const payload = buildUpdateJobPayload(job, { name: 'Race update' });

            let sawBusinessBlock = false;

            for (let i = 0; i < 80; i++) {
                const putRes = await agent
                    .put(buildJobUrl(constants.routes.jobs.update, job.id))
                    .set('Authorization', `Bearer ${token}`)
                    .send(payload);

                if (putRes.status === 422 && putRes.body.code === ErrorCode.BUSINESS_LOGIC_ERROR) {
                    sawBusinessBlock = true;
                    expect(putRes.body.success).toBe(false);
                    break;
                }

                await new Promise<void>(resolve => {
                    setTimeout(resolve, 50);
                });
            }

            expect(sawBusinessBlock).toBe(true);
        });

        it('[JOBS-UPD-005] returns not found for a non-existent job id', async () => {
            const registerResponse = await getRegisterResponse(agent, 'put-missing@example.com');
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;
            const missingId = new ObjectId().toString();

            const minimalTools = buildJobWithoutSchedulePayload('x').tools as UpdateJobInput['tools'];

            const putRes = await agent
                .put(buildJobUrl(constants.routes.jobs.update, missingId))
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: 'Ghost',
                    schedule: null,
                    tools: minimalTools,
                    runJob: false,
                });

            expect(putRes.status).toBe(404);
            expect(putRes.body.success).toBe(false);
            expect(putRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);
        });
    });

    describe(`DELETE ${constants.routes.jobs.delete} — owner`, () => {
        it('[JOBS-ISO-003] returns not found when another user deletes a job', async () => {
            const emailA = 'del-owner@example.com';
            const emailB = 'del-intruder@example.com';
            const regA = await getRegisterResponse(agent, emailA);
            expect(regA.status).toBe(200);
            const tokenA = regA.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${tokenA}`)
                .send(buildJobWithoutSchedulePayload('DELETE iso'));

            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const regB = await getRegisterResponse(agent, emailB);
            expect(regB.status).toBe(200);
            const tokenB = regB.body.data as string;

            const delRes = await agent
                .delete(buildJobUrl(constants.routes.jobs.delete, jobId))
                .set('Authorization', `Bearer ${tokenB}`);

            expect(delRes.status).toBe(404);
            expect(delRes.body.success).toBe(false);
            expect(delRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);
        });

        it('[JOBS-DEL-001] deletes the job and follow-up GET returns not found', async () => {
            const registerResponse = await getRegisterResponse(agent, 'delete-happy@example.com');
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(buildJobWithoutSchedulePayload('To delete'));

            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const delRes = await agent
                .delete(buildJobUrl(constants.routes.jobs.delete, jobId))
                .set('Authorization', `Bearer ${token}`);

            expect(delRes.status).toBe(200);
            expect(delRes.body.success).toBe(true);
            expect(delRes.body.data.id).toBe(jobId);

            const getRes = await agent
                .get(buildJobUrl(constants.routes.jobs.getById, jobId))
                .set('Authorization', `Bearer ${token}`);

            expect(getRes.status).toBe(404);
            expect(getRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);
        });

        it('[JOBS-DEL-002] returns not found for a non-existent job id', async () => {
            const registerResponse = await getRegisterResponse(agent, 'delete-missing@example.com');
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;
            const missingId = new ObjectId().toString();

            const delRes = await agent
                .delete(buildJobUrl(constants.routes.jobs.delete, missingId))
                .set('Authorization', `Bearer ${token}`);

            expect(delRes.status).toBe(404);
            expect(delRes.body.success).toBe(false);
            expect(delRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);
        });
    });

    describe(`GET ${constants.routes.jobs.streamAll}`, () => {
        it('[JOBS-SSE-001] responds with text/event-stream and emits running-jobs', async () => {
            const registerResponse = await getRegisterResponse(agent, 'sse-user@example.com');
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            await new Promise<void>((resolve, reject) => {
                const deadline = setTimeout(() => {
                    reject(new Error('SSE timeout'));
                }, 20_000);

                const req = agent
                    .get(constants.routes.jobs.streamAll)
                    .set('Authorization', `Bearer ${token}`)
                    .buffer(false);

                req.on('response', (res: IncomingMessage) => {
                    try {
                        expect(res.statusCode).toBe(200);
                        expect(res.headers['content-type']).toContain('text/event-stream');
                    } catch (e) {
                        clearTimeout(deadline);
                        reject(e);
                        return;
                    }

                    const onData = (chunk: Buffer) => {
                        if (chunk.toString().includes(constants.events.jobs.runningJobs)) {
                            clearTimeout(deadline);
                            res.destroy();
                            resolve();
                        }
                    };

                    res.on('data', onData);
                    res.on('error', e => {
                        clearTimeout(deadline);
                        reject(e);
                    });
                });

                req.on('error', err => {
                    clearTimeout(deadline);
                    reject(err);
                });

                req.end((err: Error | undefined) => {
                    if (err && !(err as NodeJS.ErrnoException).message?.includes('aborted')) {
                        clearTimeout(deadline);
                        reject(err);
                    }
                });
            });
        });
    });
});
