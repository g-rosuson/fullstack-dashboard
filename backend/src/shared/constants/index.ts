const constants = {
    events: {
        jobs: {
            targetFinished: 'job-target-finished' as const,
            runningJobs: 'running-jobs' as const,
            jobFinished: 'job-finished' as const,
            jobFailed: 'job-failed' as const,
        },
    },
};

export default constants;
