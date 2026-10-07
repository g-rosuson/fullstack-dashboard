const events = {
    jobs: {
        jobsAggregated: 'jobs-aggregated',
        jobsRunning: 'jobs-running',
        jobsScheduled: 'jobs-scheduled',
        jobTargetFinished: 'job-target-finished',
        jobFinished: 'job-finished',
        jobFailed: 'job-failed',
        jobCancelled: 'job-cancelled',
    },
    mcp: {
        selecting: 'selecting',
        permission: 'permission',
        call: 'call',
        answering: 'answering',
        answer: 'answer',
        error: 'error',
        stopped: 'stopped',
    },
} as const;

export default events;
