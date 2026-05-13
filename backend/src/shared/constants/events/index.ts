const events = {
    jobs: {
        targetFinished: 'job-target-finished',
        runningJobs: 'running-jobs',
        jobFinished: 'job-finished',
        jobFailed: 'job-failed',
    },
} as const;

export default events;
