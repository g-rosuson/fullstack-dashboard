/**
 * Maximum characters persisted on {@link ExecutionScraperToolTargetListing} `text` per listing.
 * Keeps execution documents within BSON limits and aligns with future LLM input budgets;
 * see docs/job-pipeline-plan.md (listing text cap).
 */
const maxListingTextLength = 32_000;

/**
 * Total attempts to scrape a listing.
 */
const totalAttempts = 3;

/**
 * Retry delay in milliseconds.
 */
const retryDelayMs = 1000;

/**
 * Minimum length of the listing text to be considered valid.
 */
const minTextLength = 200;

const listing = {
    totalAttempts,
    retryDelayMs,
    minTextLength,
    maxListingTextLength,
};

/**
 * Error messages and codes for different types of errors.
 */
const error = {
    unknownTarget: {
        code: 'UNKNOWN_TARGET',
        message: 'Unknown target',
    },
    invalidConfiguration: {
        code: 'INVALID_CONFIGURATION',
        message: 'Invalid configuration',
    },
    invalidKeywords: {
        code: 'INVALID_KEYWORDS',
        message: 'Invalid keywords',
    },
    invalidMaxPages: {
        code: 'INVALID_MAX_PAGES',
        message: 'Invalid max pages',
    },
    invalidMinTextLength: {
        code: 'INVALID_MIN_TEXT_LENGTH',
        message: 'Invalid min text length',
    },
    invalidTotalAttempts: {
        code: 'INVALID_TOTAL_ATTEMPTS',
        message: 'Invalid total attempts',
    },
    invalidRetryDelayMs: {
        code: 'INVALID_RETRY_DELAY_MS',
        message: 'Invalid retry delay ms',
    },
    invalidListing: {
        code: 'LISTING_ERROR',
    },
    invalidTitle: {
        code: 'EMPTY_TITLE',
    },
    invalidText: {
        code: 'TEXT_TOO_SHORT',
    },
    invalidKeywordsInContent: {
        code: 'KEYWORDS_NOT_IN_TITLE_OR_TEXT',
    },
    navigationFailed: {
        code: 'NAVIGATION_FAILED',
        message: 'Navigation failed',
    },
    scrapeFailed: {
        code: 'SCRAPE_FAILED',
        message: 'Scrape failed',
    },
    targetFailed: {
        code: 'TARGET_FAILED',
        message: 'Target failed',
    },
};

/**
 * Summary of the scraper tool target.
 */
const summary = {
    total: 0,
    passed: 0,
    rejected: 0,
    reasonCounts: {},
};

const constants = {
    listing,
    summary,
    error,
};

export default constants;
