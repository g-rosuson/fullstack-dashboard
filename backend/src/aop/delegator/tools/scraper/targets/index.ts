import jobIchTarget from './job-ich';
import jobsChTarget from './jobs-ch';

/**
 * Target registry. Keys are camelCase versions of the kebab-case target names
 * declared in the `scraperToolTargetNameSchema` enum.
 */
const targetRegistry = {
    jobsCh: jobsChTarget,
    jobIch: jobIchTarget,
} as const;

export default targetRegistry;
