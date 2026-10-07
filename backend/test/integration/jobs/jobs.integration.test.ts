import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';

import type { UpdateJobInput } from 'modules/jobs/types';
import type { CreateJobInput } from 'modules/jobs/types';

import { Aborter } from 'aop/aborter';
import { Delegator } from 'aop/delegator';
import { ErrorCode } from 'aop/exceptions/shared/enums';

import { mapToRegisterPayload } from '../auth/mappers';
import { INTEGRATION_JOB_START_DELAY_MS } from './constants';
import {
    mapToJobUrl,
    mapToJobWithoutSchedulePayload,
    mapToJobWithSchedulePayload,
    mapToUpdateJobPayload,
} from './mappers';
import config from 'config';
import constants from 'shared/constants';

import { ErrorMessage } from 'shared/enums/error-messages';

import type { Express } from 'express';

import { expectValidAccessToken } from '../auth/expect';
import { clearCollections, deleteCronJobs, disconnectMongo, getAgent, initServer } from '../harness';
import { expectErrorEnvelope, expectSuccessEnvelope } from '../helpers/expect';
import { updatePersistedJobSchedule } from './db';
import { expectBusinessLogicBlockWhilePossiblyRunning } from './expect';
import { readJobsAggregatedStream, readJobsStreamUntilMatch } from './sse';

/**
 * Integration: jobs HTTP — real Mongo, middleware, and route handlers.
 *
 * Cites docs/specs/architecture/http/jobs (`HTTP-JOBS-*`).
 * Auth gate: docs/specs/architecture/http/auth/session.md (`HTTP-AUTH-TOK-003`).
 *
 * Post-save schedule attach warnings (HTTP-JOBS-CRT-004, UPD-005, SSC-008, RTY-003) are covered
 * in controller unit tests — they need a forced scheduler failure not practical here.
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

    describe(`GET ${constants.routes.jobs.getAll} — [HTTP-AUTH-TOK-003]`, () => {
        it('rejects jobs requests without an Authorization header', async () => {
            const res = await agent.get(constants.routes.jobs.getAll);

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.code).toBe(ErrorCode.VALIDATION_ERROR);
        });
    });

    describe(`GET ${constants.routes.jobs.getAll} — [HTTP-JOBS-LST-001]`, () => {
        it('returns an empty list and default pagination metadata', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('empty-list@example.com'));
            expect(registerResponse.status).toBe(200);

            const getAllResponse = await agent
                .get(constants.routes.jobs.getAll)
                .set('Authorization', `Bearer ${registerResponse.body.data}`);

            expect(getAllResponse.status).toBe(200);
            expect(getAllResponse.body.data).toEqual([]);
            expect(getAllResponse.body.limit).toBe(0);
            expect(getAllResponse.body.offset).toBe(0);
            expect(getAllResponse.body.count).toBe(0);
            expectSuccessEnvelope(getAllResponse.body);
        });

        it('respects limit and offset query params and returns only the requester’s jobs', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('pagination@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const other = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('pagination-other@example.com'));
            expect(other.status).toBe(200);
            const otherCreate = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${other.body.data}`)
                .send(mapToJobWithoutSchedulePayload('Other user job'));
            expect(otherCreate.status).toBe(201);

            for (let i = 0; i < 3; i++) {
                const createRes = await agent
                    .post(constants.routes.jobs.create)
                    .set('Authorization', `Bearer ${token}`)
                    .send(mapToJobWithoutSchedulePayload(`Paginated job ${i}`));
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
            expect(ids).not.toContain(otherCreate.body.data.id);
        });
    });

    describe('[HTTP-JOBS-OWN-001] — other user’s job or unknown id', () => {
        it('returns 404 on get / update / delete / stop / run / change-schedule-status / retry-schedule for another user’s job', async () => {
            const regA = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('own-owner@example.com'));
            expect(regA.status).toBe(200);
            const tokenA = regA.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${tokenA}`)
                .send(mapToJobWithSchedulePayload('Owned by A'));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const regB = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('own-intruder@example.com'));
            expect(regB.status).toBe(200);
            const tokenB = regB.body.data as string;

            const getRes = await agent
                .get(mapToJobUrl(constants.routes.jobs.getById, jobId))
                .set('Authorization', `Bearer ${tokenB}`);
            expect(getRes.status).toBe(404);
            expect(getRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);

            const putRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.update, jobId))
                .set('Authorization', `Bearer ${tokenB}`)
                .send(mapToUpdateJobPayload(createRes.body.data, { name: 'Stolen' }));
            expect(putRes.status).toBe(404);
            expect(putRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);

            const delRes = await agent
                .delete(mapToJobUrl(constants.routes.jobs.delete, jobId))
                .set('Authorization', `Bearer ${tokenB}`);
            expect(delRes.status).toBe(404);
            expect(delRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);

            const stopRes = await agent
                .post(mapToJobUrl(constants.routes.jobs.stop, jobId))
                .set('Authorization', `Bearer ${tokenB}`);
            expect(stopRes.status).toBe(404);
            expect(stopRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);

            const runRes = await agent
                .post(mapToJobUrl(constants.routes.jobs.run, jobId))
                .set('Authorization', `Bearer ${tokenB}`);
            expect(runRes.status).toBe(404);
            expect(runRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);

            const sscRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.changeScheduleStatus, jobId))
                .set('Authorization', `Bearer ${tokenB}`)
                .send({ status: 'stopped' });
            expect(sscRes.status).toBe(404);
            expect(sscRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);

            const rtyRes = await agent
                .post(mapToJobUrl(constants.routes.jobs.retrySchedule, jobId))
                .set('Authorization', `Bearer ${tokenB}`);
            expect(rtyRes.status).toBe(404);
            expect(rtyRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);
        });

        it('returns 404 on get / update / delete / stop / run / change-schedule-status / retry-schedule for a missing id', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('own-missing@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;
            const missingId = new ObjectId().toString();
            const minimalTools = mapToJobWithoutSchedulePayload('x').tools as UpdateJobInput['tools'];

            const getRes = await agent
                .get(mapToJobUrl(constants.routes.jobs.getById, missingId))
                .set('Authorization', `Bearer ${token}`);
            expect(getRes.status).toBe(404);
            expect(getRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);

            const putRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.update, missingId))
                .set('Authorization', `Bearer ${token}`)
                .send({ name: 'Ghost', schedule: null, tools: minimalTools });
            expect(putRes.status).toBe(404);
            expect(putRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);

            const delRes = await agent
                .delete(mapToJobUrl(constants.routes.jobs.delete, missingId))
                .set('Authorization', `Bearer ${token}`);
            expect(delRes.status).toBe(404);
            expect(delRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);

            const stopRes = await agent
                .post(mapToJobUrl(constants.routes.jobs.stop, missingId))
                .set('Authorization', `Bearer ${token}`);
            expect(stopRes.status).toBe(404);
            expect(stopRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);

            const runRes = await agent
                .post(mapToJobUrl(constants.routes.jobs.run, missingId))
                .set('Authorization', `Bearer ${token}`);
            expect(runRes.status).toBe(404);
            expect(runRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);

            const sscRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.changeScheduleStatus, missingId))
                .set('Authorization', `Bearer ${token}`)
                .send({ status: constants.status.schedule.stopped });
            expect(sscRes.status).toBe(404);
            expect(sscRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);

            const rtyRes = await agent
                .post(mapToJobUrl(constants.routes.jobs.retrySchedule, missingId))
                .set('Authorization', `Bearer ${token}`);
            expect(rtyRes.status).toBe(404);
            expect(rtyRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);
        });
    });

    describe(`GET ${constants.routes.jobs.getById} — [HTTP-JOBS-GET-001]`, () => {
        it('returns the owned job with persisted schedule when scheduled', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('owner-get@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Owner fetch'));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const getRes = await agent
                .get(mapToJobUrl(constants.routes.jobs.getById, jobId))
                .set('Authorization', `Bearer ${token}`);

            expect(getRes.status).toBe(200);
            expect(getRes.body.data.id).toBe(jobId);
            expect(getRes.body.data.name).toBe('Owner fetch');
            expect(getRes.body.data.schedule).not.toBeNull();
            expect(getRes.body.data.schedule.type).toBe('daily');
            expectSuccessEnvelope(getRes.body);
        });
    });

    describe(`POST ${constants.routes.jobs.create}`, () => {
        it('[HTTP-JOBS-CRT-001] creates a job without a schedule and returns 201', async () => {
            const email = 'immediate-job@example.com';
            const registerResponse = await agent.post(constants.routes.auth.register).send(mapToRegisterPayload(email));
            expect(registerResponse.status).toBe(200);
            expectValidAccessToken(registerResponse.body.data, email);
            const token = registerResponse.body.data as string;
            const { id: userId } = jwt.verify(token, config.accessTokenSecret) as { id: string };

            const name = 'Run-once job';
            const res = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithoutSchedulePayload(name));

            expect(res.status).toBe(201);
            expect(res.body.data.userId).toBe(userId);
            expect(res.body.data.name).toBe(name);
            expect(res.body.data.id).toBeDefined();
            expect(res.body.data.schedule).toBeNull();
            expect(res.body.data.tools).toHaveLength(1);
            expect(res.body.data.tools[0].toolId).toBeDefined();
            expect(res.body.data.tools[0].targets[0].targetId).toBeDefined();
            expectSuccessEnvelope(res.body);
        });

        it('[HTTP-JOBS-CRT-002] creates a scheduled idle job and returns the persisted schedule', async () => {
            const email = 'scheduled-job@example.com';
            const registerResponse = await agent.post(constants.routes.auth.register).send(mapToRegisterPayload(email));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;
            const { id: userId } = jwt.verify(token, config.accessTokenSecret) as { id: string };

            const name = 'Daily engineering jobs';
            const res = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload(name));

            expect(res.status).toBe(201);
            expect(res.body.data.userId).toBe(userId);
            expect(res.body.data.name).toBe(name);
            expect(res.body.data.schedule).not.toBeNull();
            expect(res.body.data.schedule.status).toBe(constants.status.schedule.idle);
            expect(res.body.data.schedule.type).toBe('daily');
            expect(res.body.data.schedule.startDate).toBeDefined();
            expectSuccessEnvelope(res.body);
        });

        it('[HTTP-JOBS-CRT-003] creates a job with stopped schedule', async () => {
            const email = 'stopped-create@example.com';
            const registerResponse = await agent.post(constants.routes.auth.register).send(mapToRegisterPayload(email));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;
            const { id: userId } = jwt.verify(token, config.accessTokenSecret) as { id: string };

            const res = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${registerResponse.body.data}`)
                .send(mapToJobWithSchedulePayload('Stopped on create', { status: constants.status.schedule.stopped }));

            expect(res.status).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.userId).toBe(userId);
            expect(res.body.data.schedule.status).toBe(constants.status.schedule.stopped);
        });

        it('[HTTP-JOBS-CRT-005] returns conflict when the same user creates a duplicate job name', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('unq-duplicate-create@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const first = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithoutSchedulePayload('Duplicate create'));
            expect(first.status).toBe(201);

            const second = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithoutSchedulePayload('Duplicate create'));

            expect(second.status).toBe(409);
            expectErrorEnvelope(second.body, ErrorCode.CONFLICT_ERROR);
        });

        it('[HTTP-JOBS-CRT-005] allows different users to create jobs with the same name', async () => {
            const sharedName = 'Shared job name';
            const regA = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('unq-user-a@example.com'));
            expect(regA.status).toBe(200);
            const regB = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('unq-user-b@example.com'));
            expect(regB.status).toBe(200);

            const createA = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${regA.body.data}`)
                .send(mapToJobWithoutSchedulePayload(sharedName));
            expect(createA.status).toBe(201);

            const createB = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${regB.body.data}`)
                .send(mapToJobWithoutSchedulePayload(sharedName));
            expect(createB.status).toBe(201);
            expect(createB.body.data.id).not.toBe(createA.body.data.id);
            expect(createB.body.data.userId).not.toBe(createA.body.data.userId);
        });

        describe('[HTTP-JOBS-CRT-006] — invalid body', () => {
            it('rejects a schedule whose start date is not in the future', async () => {
                const registerResponse = await agent
                    .post(constants.routes.auth.register)
                    .send(mapToRegisterPayload('past-start@example.com'));
                expect(registerResponse.status).toBe(200);

                const payload: CreateJobInput = {
                    ...mapToJobWithSchedulePayload('Past start'),
                    schedule: {
                        status: constants.status.schedule.idle,
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
                expect(res.body.code).toBe(ErrorCode.VALIDATION_ERROR);
                expect(res.body.issues).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            property: 'startDate',
                            message: ErrorMessage.JOBS_START_DATE_MUST_BE_IN_THE_FUTURE,
                        }),
                    ])
                );
            });

            it('rejects a schedule where end date is before start date', async () => {
                const registerResponse = await agent
                    .post(constants.routes.auth.register)
                    .send(mapToRegisterPayload('end-before-start@example.com'));
                expect(registerResponse.status).toBe(200);

                const start = new Date(Date.now() + INTEGRATION_JOB_START_DELAY_MS).toISOString();
                const end = new Date(Date.now() + INTEGRATION_JOB_START_DELAY_MS - 86_400_000).toISOString();

                const res = await agent
                    .post(constants.routes.jobs.create)
                    .set('Authorization', `Bearer ${registerResponse.body.data}`)
                    .send({
                        ...mapToJobWithSchedulePayload('Inverted range'),
                        schedule: {
                            status: constants.status.schedule.idle,
                            type: 'daily',
                            startDate: start,
                            endDate: end,
                        },
                    });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(ErrorCode.VALIDATION_ERROR);
                expect(res.body.issues).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            property: 'startDate',
                            message: ErrorMessage.JOBS_START_DATE_MUST_COME_BEFORE_END_DATE,
                        }),
                    ])
                );
            });

            it('rejects a one-off schedule that includes an end date', async () => {
                const registerResponse = await agent
                    .post(constants.routes.auth.register)
                    .send(mapToRegisterPayload('once-end@example.com'));
                expect(registerResponse.status).toBe(200);

                const start = new Date(Date.now() + INTEGRATION_JOB_START_DELAY_MS).toISOString();
                const end = new Date(Date.now() + INTEGRATION_JOB_START_DELAY_MS + 86_400_000).toISOString();

                const res = await agent
                    .post(constants.routes.jobs.create)
                    .set('Authorization', `Bearer ${registerResponse.body.data}`)
                    .send({
                        ...mapToJobWithSchedulePayload('Once with end'),
                        schedule: {
                            status: constants.status.schedule.idle,
                            type: 'once',
                            startDate: start,
                            endDate: end,
                        },
                    });

                expect(res.status).toBe(400);
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

            it('rejects a scraper when tool and target both omit keywords', async () => {
                const registerResponse = await agent
                    .post(constants.routes.auth.register)
                    .send(mapToRegisterPayload('scraper-kw@example.com'));
                expect(registerResponse.status).toBe(200);

                const res = await agent
                    .post(constants.routes.jobs.create)
                    .set('Authorization', `Bearer ${registerResponse.body.data}`)
                    .send({
                        name: 'Bad scraper keywords',
                        schedule: null,
                        tools: [{ type: 'scraper', maxPages: 1, targets: [{ target: 'jobs-ch', maxPages: 1 }] }],
                    });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(ErrorCode.VALIDATION_ERROR);
                expect(res.body.issues).toEqual(
                    expect.arrayContaining([expect.objectContaining({ property: 'keywords' })])
                );
            });

            it('rejects a scraper when tool and target both omit maxPages', async () => {
                const registerResponse = await agent
                    .post(constants.routes.auth.register)
                    .send(mapToRegisterPayload('scraper-pages@example.com'));
                expect(registerResponse.status).toBe(200);

                const res = await agent
                    .post(constants.routes.jobs.create)
                    .set('Authorization', `Bearer ${registerResponse.body.data}`)
                    .send({
                        name: 'Bad scraper maxPages',
                        schedule: null,
                        tools: [
                            {
                                type: 'scraper',
                                keywords: ['integration'],
                                targets: [{ target: 'jobs-ch', keywords: ['nested'] }],
                            },
                        ],
                    });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(ErrorCode.VALIDATION_ERROR);
                expect(res.body.issues).toEqual(
                    expect.arrayContaining([expect.objectContaining({ property: 'maxPages' })])
                );
            });

            it('rejects email tools when subject or body is missing on tool and targets', async () => {
                const registerResponse = await agent
                    .post(constants.routes.auth.register)
                    .send(mapToRegisterPayload('email-tool@example.com'));
                expect(registerResponse.status).toBe(200);
                const token = registerResponse.body.data as string;

                const subjectRes = await agent
                    .post(constants.routes.jobs.create)
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                        name: 'Email missing subject',
                        schedule: null,
                        tools: [{ type: 'email', targets: [{ target: 'recipient@example.com', body: 'Hello' }] }],
                    });
                expect(subjectRes.status).toBe(400);
                expect(subjectRes.body.issues).toEqual(
                    expect.arrayContaining([expect.objectContaining({ property: 'subject' })])
                );

                const bodyRes = await agent
                    .post(constants.routes.jobs.create)
                    .set('Authorization', `Bearer ${token}`)
                    .send({
                        name: 'Email missing body',
                        schedule: null,
                        tools: [{ type: 'email', subject: 'Hello', targets: [{ target: 'recipient@example.com' }] }],
                    });
                expect(bodyRes.status).toBe(400);
                expect(bodyRes.body.issues).toEqual(
                    expect.arrayContaining([expect.objectContaining({ property: 'body' })])
                );
            });
        });
    });

    describe(`PUT ${constants.routes.jobs.update}`, () => {
        it('[HTTP-JOBS-UPD-001] updates name, tools, and active schedule then persists on follow-up GET', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('put-happy@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;
            const { id: userId } = jwt.verify(token, config.accessTokenSecret) as { id: string };

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Before PUT'));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const putRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.update, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send(mapToUpdateJobPayload(createRes.body.data, { name: 'After PUT' }));

            expect(putRes.status).toBe(200);
            expect(putRes.body.data.userId).toBe(userId);
            expect(putRes.body.data.name).toBe('After PUT');
            expect(putRes.body.data.schedule.status).toBe(constants.status.schedule.idle);
            expectSuccessEnvelope(putRes.body);

            const getRes = await agent
                .get(mapToJobUrl(constants.routes.jobs.getById, jobId))
                .set('Authorization', `Bearer ${token}`);
            expect(getRes.status).toBe(200);
            expect(getRes.body.data.name).toBe('After PUT');
            expect(getRes.body.data.userId).toBe(userId);
        });

        it('[HTTP-JOBS-UPD-002] clears schedule when schedule is set to null', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('put-clear-schedule@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;
            const { id: userId } = jwt.verify(token, config.accessTokenSecret) as { id: string };

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Scheduled then cleared'));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const clearRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.update, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send(mapToUpdateJobPayload(createRes.body.data, { schedule: null }));
            expect(clearRes.status).toBe(200);
            expect(clearRes.body.data.userId).toBe(userId);
            expect(clearRes.body.data.schedule).toBeNull();

            const getRes = await agent
                .get(mapToJobUrl(constants.routes.jobs.getById, jobId))
                .set('Authorization', `Bearer ${token}`);
            expect(getRes.status).toBe(200);
            expect(getRes.body.data.schedule).toBeNull();
        });

        it('[HTTP-JOBS-UPD-003] updates with stopped schedule', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('put-stopped@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;
            const { id: userId } = jwt.verify(token, config.accessTokenSecret) as { id: string };

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Will stop via update'));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const putRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.update, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send(
                    mapToUpdateJobPayload(createRes.body.data, {
                        schedule: {
                            type: createRes.body.data.schedule.type,
                            startDate: createRes.body.data.schedule.startDate,
                            endDate: createRes.body.data.schedule.endDate,
                            status: constants.status.schedule.stopped,
                        },
                    })
                );

            expect(putRes.status).toBe(200);
            expect(putRes.body.data.userId).toBe(userId);
            expect(putRes.body.data.schedule.status).toBe(constants.status.schedule.stopped);
        });

        it('[HTTP-JOBS-UPD-004] rejects update while the job delegate is running', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('put-running@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithoutSchedulePayload('Running guard'));
            expect(createRes.status).toBe(201);
            const payload = mapToUpdateJobPayload(createRes.body.data, { name: 'Race update' });

            await expectBusinessLogicBlockWhilePossiblyRunning(() =>
                agent
                    .put(mapToJobUrl(constants.routes.jobs.update, createRes.body.data.id))
                    .set('Authorization', `Bearer ${token}`)
                    .send(payload)
            );
        });

        it('[HTTP-JOBS-UPD-006] returns conflict when updating a job name to another owned job name', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('unq-update@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const firstJob = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('First job'));
            expect(firstJob.status).toBe(201);

            const secondJob = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Second job'));
            expect(secondJob.status).toBe(201);

            const putRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.update, secondJob.body.data.id))
                .set('Authorization', `Bearer ${token}`)
                .send(mapToUpdateJobPayload(secondJob.body.data, { name: 'First job' }));

            expect(putRes.status).toBe(409);
            expectErrorEnvelope(putRes.body, ErrorCode.CONFLICT_ERROR);
        });

        it('[HTTP-JOBS-UPD-007] rejects an invalid update body', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('put-invalid@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Validate update'));
            expect(createRes.status).toBe(201);

            const putRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.update, createRes.body.data.id))
                .set('Authorization', `Bearer ${token}`)
                .send({
                    ...mapToUpdateJobPayload(createRes.body.data),
                    schedule: {
                        status: constants.status.schedule.idle,
                        type: 'daily',
                        startDate: new Date(Date.now() - 86_400_000).toISOString(),
                        endDate: null,
                    },
                });

            expect(putRes.status).toBe(400);
            expect(putRes.body.code).toBe(ErrorCode.VALIDATION_ERROR);
            expect(Array.isArray(putRes.body.issues)).toBe(true);
        });
    });

    describe(`DELETE ${constants.routes.jobs.delete}`, () => {
        it('[HTTP-JOBS-DEL-001] / [HTTP-JOBS-DEL-003] deletes the owned job; follow-up GET is 404', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('delete-happy@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('To delete'));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const delRes = await agent
                .delete(mapToJobUrl(constants.routes.jobs.delete, jobId))
                .set('Authorization', `Bearer ${token}`);

            expect(delRes.status).toBe(200);
            expect(delRes.body.data.id).toBe(jobId);
            expectSuccessEnvelope(delRes.body);

            const getRes = await agent
                .get(mapToJobUrl(constants.routes.jobs.getById, jobId))
                .set('Authorization', `Bearer ${token}`);
            expect(getRes.status).toBe(404);
            expect(getRes.body.code).toBe(ErrorCode.NOT_FOUND_ERROR);
        });

        it('[HTTP-JOBS-DEL-002] rejects delete while the job delegate is running', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('delete-running@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithoutSchedulePayload('Running delete guard'));
            expect(createRes.status).toBe(201);

            await expectBusinessLogicBlockWhilePossiblyRunning(() =>
                agent
                    .delete(mapToJobUrl(constants.routes.jobs.delete, createRes.body.data.id))
                    .set('Authorization', `Bearer ${token}`)
            );
        });
    });

    describe(`PUT ${constants.routes.jobs.changeScheduleStatus}`, () => {
        it('[HTTP-JOBS-SSC-001] sets status to stopped and leaves other job fields unchanged', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('ssc-stop@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Stop me'));
            expect(createRes.status).toBe(201);
            const before = createRes.body.data;
            const jobId = before.id as string;

            const putRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.changeScheduleStatus, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'stopped' });

            expect(putRes.status).toBe(200);
            expect(putRes.body.data.schedule.status).toBe(constants.status.schedule.stopped);
            expect(putRes.body.data.name).toBe(before.name);
            expect(putRes.body.data.tools).toEqual(before.tools);
            expect(putRes.body.data.schedule.type).toBe(before.schedule.type);
            expect(putRes.body.data.schedule.startDate).toBe(before.schedule.startDate);
            expect(putRes.body.data.schedule.endDate).toBe(before.schedule.endDate);
            expectSuccessEnvelope(putRes.body);

            const getRes = await agent
                .get(mapToJobUrl(constants.routes.jobs.getById, jobId))
                .set('Authorization', `Bearer ${token}`);
            expect(getRes.status).toBe(200);
            expect(getRes.body.data.schedule.status).toBe(constants.status.schedule.stopped);
        });

        it('[HTTP-JOBS-SSC-002] reactivates a stopped schedule to idle', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('ssc-restart@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const alignedStart = new Date(Date.now() + INTEGRATION_JOB_START_DELAY_MS);
            alignedStart.setSeconds(0, 0);
            const startDate = alignedStart.toISOString();

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    ...mapToJobWithSchedulePayload('Restart me'),
                    schedule: { status: constants.status.schedule.idle, type: 'daily', startDate, endDate: null },
                });
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const stopRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.changeScheduleStatus, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send({ status: constants.status.schedule.stopped });
            expect(stopRes.status).toBe(200);

            const idleRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.changeScheduleStatus, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send({ status: constants.status.schedule.idle });

            expect(idleRes.status).toBe(200);
            expect(idleRes.body.data.schedule.status).toBe(constants.status.schedule.idle);
        });

        it('[HTTP-JOBS-SSC-003] rejects when requested status already matches persisted status', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('ssc-duplicate@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Already idle'));
            expect(createRes.status).toBe(201);

            const putRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.changeScheduleStatus, createRes.body.data.id))
                .set('Authorization', `Bearer ${token}`)
                .send({ status: constants.status.schedule.idle });

            expect(putRes.status).toBe(422);
            expect(putRes.body.code).toBe(ErrorCode.BUSINESS_LOGIC_ERROR);
        });

        it('[HTTP-JOBS-SSC-004] rejects when the job has no schedule', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('ssc-no-schedule@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Scheduled then cleared'));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const updateRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.update, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send(mapToUpdateJobPayload(createRes.body.data, { schedule: null }));
            expect(updateRes.status).toBe(200);

            const putRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.changeScheduleStatus, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send({ status: constants.status.schedule.stopped });

            expect(putRes.status).toBe(422);
            expect(putRes.body.code).toBe(ErrorCode.BUSINESS_LOGIC_ERROR);
        });

        it('[HTTP-JOBS-SSC-005] rejects the change while the job delegate is running', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('ssc-running@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithoutSchedulePayload('Running guard SSC'));
            expect(createRes.status).toBe(201);

            await expectBusinessLogicBlockWhilePossiblyRunning(() =>
                agent
                    .put(mapToJobUrl(constants.routes.jobs.changeScheduleStatus, createRes.body.data.id))
                    .set('Authorization', `Bearer ${token}`)
                    .send({ status: constants.status.schedule.stopped })
            );
        });

        it('[HTTP-JOBS-SSC-006] rejects activate when recurring endDate is past', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('ssc-expired-end@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Expired end', { status: constants.status.schedule.stopped }));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            await updatePersistedJobSchedule(jobId, {
                type: 'daily',
                startDate: new Date(Date.now() - 14 * 86_400_000).toISOString(),
                endDate: new Date(Date.now() - 86_400_000).toISOString(),
                status: constants.status.schedule.stopped,
            });

            const putRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.changeScheduleStatus, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send({ status: constants.status.schedule.idle });

            expect(putRes.status).toBe(422);
            expect(putRes.body.code).toBe(ErrorCode.BUSINESS_LOGIC_ERROR);
        });

        it('[HTTP-JOBS-SSC-007] rejects activate when once startDate is past', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('ssc-once-past@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(
                    mapToJobWithSchedulePayload('Once past', {
                        status: constants.status.schedule.stopped,
                        type: 'once',
                        endDate: null,
                    })
                );
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            await updatePersistedJobSchedule(jobId, {
                type: 'once',
                startDate: new Date(Date.now() - 86_400_000).toISOString(),
                endDate: null,
                status: constants.status.schedule.stopped,
            });

            const putRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.changeScheduleStatus, jobId))
                .set('Authorization', `Bearer ${token}`)
                .send({ status: constants.status.schedule.idle });

            expect(putRes.status).toBe(422);
            expect(putRes.body.code).toBe(ErrorCode.BUSINESS_LOGIC_ERROR);
        });

        it('[HTTP-JOBS-SSC-009] rejects bodies without a valid idle or stopped status', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('ssc-validation@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Validate status'));
            expect(createRes.status).toBe(201);
            const url = mapToJobUrl(constants.routes.jobs.changeScheduleStatus, createRes.body.data.id);

            const missingStatus = await agent.put(url).set('Authorization', `Bearer ${token}`).send({});
            expect(missingStatus.status).toBe(400);
            expect(missingStatus.body.code).toBe(ErrorCode.VALIDATION_ERROR);

            const invalidStatus = await agent
                .put(url)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'running' });
            expect(invalidStatus.status).toBe(400);
            expect(invalidStatus.body.code).toBe(ErrorCode.VALIDATION_ERROR);
        });
    });

    describe(`POST ${constants.routes.jobs.retrySchedule}`, () => {
        it('[HTTP-JOBS-RTY-001] retries an idle schedule; persisted status stays idle', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('rty-idle@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Retry idle'));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const rtyRes = await agent
                .post(mapToJobUrl(constants.routes.jobs.retrySchedule, jobId))
                .set('Authorization', `Bearer ${token}`);

            expect(rtyRes.status).toBe(200);
            expect(rtyRes.body.data.schedule.status).toBe(constants.status.schedule.idle);
            expectSuccessEnvelope(rtyRes.body);
        });

        it('[HTTP-JOBS-RTY-002] retries a stopped schedule; status stays stopped', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('rty-stopped@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Retry stopped', { status: constants.status.schedule.stopped }));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const rtyRes = await agent
                .post(mapToJobUrl(constants.routes.jobs.retrySchedule, jobId))
                .set('Authorization', `Bearer ${token}`);

            expect(rtyRes.status).toBe(200);
            expect(rtyRes.body.data.schedule.status).toBe(constants.status.schedule.stopped);
        });

        it('[HTTP-JOBS-RTY-004] rejects retry when the job has no schedule', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('rty-no-schedule@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Clear then retry'));
            expect(createRes.status).toBe(201);

            const updateRes = await agent
                .put(mapToJobUrl(constants.routes.jobs.update, createRes.body.data.id))
                .set('Authorization', `Bearer ${token}`)
                .send(mapToUpdateJobPayload(createRes.body.data, { schedule: null }));
            expect(updateRes.status).toBe(200);

            const rtyRes = await agent
                .post(mapToJobUrl(constants.routes.jobs.retrySchedule, createRes.body.data.id))
                .set('Authorization', `Bearer ${token}`);

            expect(rtyRes.status).toBe(422);
            expect(rtyRes.body.code).toBe(ErrorCode.BUSINESS_LOGIC_ERROR);
        });

        it('[HTTP-JOBS-RTY-005] rejects retry while the job delegate is running', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('rty-running@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithoutSchedulePayload('Running retry guard'));
            expect(createRes.status).toBe(201);

            await expectBusinessLogicBlockWhilePossiblyRunning(() =>
                agent
                    .post(mapToJobUrl(constants.routes.jobs.retrySchedule, createRes.body.data.id))
                    .set('Authorization', `Bearer ${token}`)
            );
        });

        it('[HTTP-JOBS-RTY-006] rejects idle retry when recurring endDate is past', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('rty-expired-end@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Retry expired end'));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            await updatePersistedJobSchedule(jobId, {
                type: 'daily',
                startDate: new Date(Date.now() - 14 * 86_400_000).toISOString(),
                endDate: new Date(Date.now() - 86_400_000).toISOString(),
                status: constants.status.schedule.idle,
            });

            const rtyRes = await agent
                .post(mapToJobUrl(constants.routes.jobs.retrySchedule, jobId))
                .set('Authorization', `Bearer ${token}`);

            expect(rtyRes.status).toBe(422);
            expect(rtyRes.body.code).toBe(ErrorCode.BUSINESS_LOGIC_ERROR);
        });

        it('[HTTP-JOBS-RTY-007] rejects idle retry when once startDate is past', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('rty-once-past@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Retry once past', { type: 'once', endDate: null }));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            await updatePersistedJobSchedule(jobId, {
                type: 'once',
                startDate: new Date(Date.now() - 86_400_000).toISOString(),
                endDate: null,
                status: constants.status.schedule.idle,
            });

            const rtyRes = await agent
                .post(mapToJobUrl(constants.routes.jobs.retrySchedule, jobId))
                .set('Authorization', `Bearer ${token}`);

            expect(rtyRes.status).toBe(422);
            expect(rtyRes.body.code).toBe(ErrorCode.BUSINESS_LOGIC_ERROR);
        });
    });

    describe(`POST ${constants.routes.jobs.run}`, () => {
        it('[HTTP-JOBS-RUN-001] runs an owned job that is not running and returns the job id', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('run-idle@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Run on demand'));
            expect(createRes.status).toBe(201);

            const jobId = createRes.body.data.id as string;
            const delegator = Delegator.getInstance();

            try {
                const runRes = await agent
                    .post(mapToJobUrl(constants.routes.jobs.run, jobId))
                    .set('Authorization', `Bearer ${token}`);

                expect(runRes.status).toBe(200);
                expect(runRes.body.data.jobId).toBe(jobId);
                expectSuccessEnvelope(runRes.body);
            } finally {
                delegator.cancel(jobId);
                delegator.runningJobs.delete(jobId);
            }
        });

        it('[HTTP-JOBS-RUN-002] rejects run when the job is already running', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('run-running@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Already running'));
            expect(createRes.status).toBe(201);

            const job = createRes.body.data;
            const jobId = job.id as string;
            const aborter = new Aborter();
            const delegator = Delegator.getInstance();

            delegator.runningJobs.set(jobId, {
                payload: {
                    jobId,
                    userId: job.userId,
                    tools: job.tools,
                    scheduleType: job.schedule?.type ?? null,
                },
                aborter,
            });

            try {
                const runRes = await agent
                    .post(mapToJobUrl(constants.routes.jobs.run, jobId))
                    .set('Authorization', `Bearer ${token}`);

                expect(runRes.status).toBe(422);
                expect(runRes.body.success).toBe(false);
                expect(runRes.body.code).toBe(ErrorCode.BUSINESS_LOGIC_ERROR);
            } finally {
                delegator.runningJobs.delete(jobId);
            }
        });
    });

    describe(`POST ${constants.routes.jobs.stop}`, () => {
        it('[HTTP-JOBS-STP-001] stops an owned running job and returns the job id', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('stop-running@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Stop while running'));
            expect(createRes.status).toBe(201);

            const job = createRes.body.data;
            const jobId = job.id as string;
            const aborter = new Aborter();
            const delegator = Delegator.getInstance();

            delegator.runningJobs.set(jobId, {
                payload: {
                    jobId,
                    userId: job.userId,
                    tools: job.tools,
                    scheduleType: job.schedule?.type ?? null,
                },
                aborter,
            });

            try {
                const stopRes = await agent
                    .post(mapToJobUrl(constants.routes.jobs.stop, jobId))
                    .set('Authorization', `Bearer ${token}`);

                expect(stopRes.status).toBe(200);
                expect(stopRes.body.data.jobId).toBe(jobId);
                expectSuccessEnvelope(stopRes.body);
                expect(aborter.cancelled).toBe(true);
            } finally {
                delegator.runningJobs.delete(jobId);
            }
        });

        it('[HTTP-JOBS-STP-002] rejects stop when the job is not running', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('stop-idle@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Not running'));
            expect(createRes.status).toBe(201);

            const stopRes = await agent
                .post(mapToJobUrl(constants.routes.jobs.stop, createRes.body.data.id))
                .set('Authorization', `Bearer ${token}`);

            expect(stopRes.status).toBe(422);
            expect(stopRes.body.success).toBe(false);
            expect(stopRes.body.code).toBe(ErrorCode.BUSINESS_LOGIC_ERROR);
        });
    });

    describe(`GET ${constants.routes.jobs.streamAll}`, () => {
        it('[HTTP-JOBS-STR-001] / [HTTP-JOBS-STR-002] opens SSE with an aggregated connect snapshot', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('sse-user@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Stream scheduled'));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;

            const stream = await readJobsAggregatedStream(agent, token);

            expect(stream.status).toBe(200);
            expect(stream.headers['content-type']).toContain('text/event-stream');
            expect(stream.headers['cache-control']).toBe('no-cache, no-transform');
            expect(stream.headers.connection).toBe('keep-alive');
            expect(stream.headers['x-accel-buffering']).toBe('no');

            expect(stream.aggregated.data.type).toBe(constants.events.jobs.jobsAggregated);
            expect(stream.aggregated.data.userId).toBe(createRes.body.data.userId);
            expect(stream.aggregated.data.runningJobs).toEqual([]);
            expect(stream.aggregated.data.scheduledJobs).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        jobId,
                        status: constants.status.schedule.idle,
                        nextRun: expect.any(String),
                        lastRun: null,
                    }),
                ])
            );
        });

        it('[HTTP-JOBS-STR-002] / [FR-JOBS-OWN-001] aggregated snapshot excludes another user’s scheduled jobs', async () => {
            const owner = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('sse-owner@example.com'));
            expect(owner.status).toBe(200);
            const ownerToken = owner.body.data as string;

            const other = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('sse-other@example.com'));
            expect(other.status).toBe(200);
            const otherToken = other.body.data as string;

            const ownerCreate = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send(mapToJobWithSchedulePayload('Owner scheduled'));
            expect(ownerCreate.status).toBe(201);
            const ownerJobId = ownerCreate.body.data.id as string;

            const otherCreate = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${otherToken}`)
                .send(mapToJobWithSchedulePayload('Other scheduled'));
            expect(otherCreate.status).toBe(201);
            const otherJobId = otherCreate.body.data.id as string;

            const stream = await readJobsAggregatedStream(agent, ownerToken);

            expect(stream.aggregated.data.userId).toBe(ownerCreate.body.data.userId);

            const scheduledJobIds = (
                (stream.aggregated.data.scheduledJobs as Array<{ jobId: string }> | undefined) ?? []
            ).map(job => job.jobId);
            expect(scheduledJobIds).toContain(ownerJobId);
            expect(scheduledJobIds).not.toContain(otherJobId);
        });

        it('[HTTP-JOBS-STR-003] streams scheduled-jobs after schedule status change', async () => {
            const registerResponse = await agent
                .post(constants.routes.auth.register)
                .send(mapToRegisterPayload('sse-live-schedule@example.com'));
            expect(registerResponse.status).toBe(200);
            const token = registerResponse.body.data as string;

            const createRes = await agent
                .post(constants.routes.jobs.create)
                .set('Authorization', `Bearer ${token}`)
                .send(mapToJobWithSchedulePayload('Live schedule stream'));
            expect(createRes.status).toBe(201);
            const jobId = createRes.body.data.id as string;
            const userId = createRes.body.data.userId as string;

            const stream = await readJobsStreamUntilMatch(agent, token, {
                afterConnect: async () => {
                    const stopRes = await agent
                        .put(mapToJobUrl(constants.routes.jobs.changeScheduleStatus, jobId))
                        .set('Authorization', `Bearer ${token}`)
                        .send({ status: constants.status.schedule.stopped });
                    expect(stopRes.status).toBe(200);
                },
                match: event =>
                    event.event === constants.events.jobs.jobsScheduled &&
                    event.data.userId === userId &&
                    Array.isArray(event.data.scheduledJobs) &&
                    (event.data.scheduledJobs as Array<{ jobId: string; status: string }>).some(
                        job => job.jobId === jobId && job.status === constants.status.schedule.stopped
                    ),
            });

            expect(stream.status).toBe(200);
            expect(stream.matched.data.type).toBe(constants.events.jobs.jobsScheduled);
            expect(stream.matched.data.userId).toBe(userId);
            expect(stream.matched.data.scheduledJobs).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        jobId,
                        status: constants.status.schedule.stopped,
                    }),
                ])
            );
        });
    });
});
