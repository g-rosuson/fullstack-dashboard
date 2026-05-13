import request from 'supertest';

import { MongoClientManager } from 'aop/db/mongo/client';
import { Scheduler } from 'aop/scheduler';

import type { Express } from 'express';

import server from 'server';

/**
 * Builds the real Express app (Mongo connect, indexes, job reschedule, middleware, routes).
 */
const initServer = async (): Promise<Express> => {
    return server.init();
};

/**
 * Deletes all cron jobs.
 */
const deleteCronJobs = async (): Promise<void> => {
    const scheduler = Scheduler.getInstance();
    for (const job of scheduler.allJobs) {
        scheduler.delete(job.jobId);
    }
};

/**
 * Clears all collections.
 */
const clearCollections = async (): Promise<void> => {
    const manager = MongoClientManager.getInstance();
    const db = await manager.connect();
    const collections = await db.collections();

    await Promise.all(collections.map(collection => collection.deleteMany({})));
};

/**
 * Disconnects from MongoDB.
 */
const disconnectMongo = async (): Promise<void> => {
    const manager = MongoClientManager.getInstance();
    await manager.disconnect();
};

/**
 * Supertest client bound to `app` (no listening port).
 */
const getAgent = (app: Express) => request(app);

export { initServer, getAgent, deleteCronJobs, clearCollections, disconnectMongo };
