import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';

import authenticationRoutes from 'modules/auth/auth-routing';
import documentationRoute from 'modules/docs/docs-routing';
import jobsRoutes from 'modules/jobs/jobs-routing';
import mcpRoutes from 'modules/mcp/mcp-routing';

import { exceptionsMiddleware } from 'aop/exceptions';
import http from 'aop/http';

import config from 'config';

import { initializeDatabase } from './server-initialize-db';

// TODO: Move schema enum we use for validation to constants e.g. if (persistedSchedule.type === cronJobTypeSchema.enum.once)

// TODO: What is cursor indexing? And what should be ignored?

// TODO: Add schedule type to constants and integrate into all logic and tests?

// TODO: Add strongly typed controller responses

// TODO: Add job pipeline information streaming

// TODO: Production: Look into capping the maxPages for the scraper tool

// TODO: Look into this:
// TODO: (node:25) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
// TODO: (Use `node --trace-deprecation ...` to show where the warning was created)

const init = async () => {
    const REQ_BODY_LIMIT = '6mb';
    const server = express();

    await initializeDatabase();

    server.use(cors({ credentials: true, origin: config.clientUrl }));
    server.use(cookieParser());
    server.use(express.urlencoded({ limit: REQ_BODY_LIMIT, extended: true }));
    server.use(express.json({ limit: REQ_BODY_LIMIT }));

    // Add context to request
    server.use(http.context.middleware.resources);

    // Public routes:
    // Documentation
    server.use(documentationRoute);

    // Authentication
    server.use(authenticationRoutes);

    // Private routes:
    // Authenticate middleware
    server.use(http.context.middleware.authenticate);

    // Jobs
    server.use(jobsRoutes);

    // MCP
    server.use(mcpRoutes);

    // Exception middleware
    server.use(exceptionsMiddleware());

    return server;
};

const server = {
    init,
};

export default server;
