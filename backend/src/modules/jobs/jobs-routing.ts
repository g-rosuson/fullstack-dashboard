import { Router } from 'express';

import { forwardSyncError } from 'aop/http/middleware/sync';

import { createJob, deleteJob, getAllJobs, getJob, streamJobs, updateJob } from './jobs-controller';
import { validateIdQueryParams, validatePaginationQueryParams, validatePayload } from './jobs-middleware';

import constants from 'shared/constants';

// Determine router
const router = Router();

// Determine routes
router.post(constants.routes.jobs.create, validatePayload, createJob);
router.get(constants.routes.jobs.getAll, forwardSyncError(validatePaginationQueryParams), getAllJobs);
router.get(constants.routes.jobs.getById, forwardSyncError(validateIdQueryParams), getJob);
router.put(
    constants.routes.jobs.update,
    forwardSyncError(validatePayload),
    forwardSyncError(validateIdQueryParams),
    updateJob
);
router.delete(constants.routes.jobs.delete, forwardSyncError(validateIdQueryParams), deleteJob);
router.get(constants.routes.jobs.streamAll, forwardSyncError(streamJobs));

export default router;
