/**
 * Maximum characters persisted on {@link ExecutionScrapedItem} `text` per listing.
 * Keeps execution documents within BSON limits and aligns with future LLM input budgets;
 * see docs/job-pipeline-plan.md (listing text cap).
 */
const MAX_LISTING_TEXT_CHARS = 32_000;

const TOTAL_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

export default { MAX_LISTING_TEXT_CHARS, TOTAL_ATTEMPTS, RETRY_DELAY_MS };
