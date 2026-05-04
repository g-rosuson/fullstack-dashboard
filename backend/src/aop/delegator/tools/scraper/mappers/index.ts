/**
 * Re-checks scraper inputs at mapping time as a defensive runtime guard before delegator execution.
 * This complements request-level validation in `backend/src/modules/jobs/validators/jobs-validators.ts`.
 * Cross-field constraints are kept out of Zod `.refine()`/`.superRefine()` to preserve schema composability
 * (`spread`/`extend`) without changing schema signatures, so we enforce those guarantees again at runtime here.
 */

/**
 * Maps the keywords from the target and tool to a single array.
 * @param targetKeywords - The keywords from the target.
 * @param toolKeywords - The keywords from the tool.
 * @returns The mapped keywords.
 */
const mapToKeywords = (targetKeywords: string[] | undefined, toolKeywords: string[] | undefined) => {
    const isTargetKeywordsMissing = !Array.isArray(targetKeywords) || targetKeywords.length === 0;
    const isToolKeywordsMissing = !Array.isArray(toolKeywords) || toolKeywords.length === 0;

    if (isTargetKeywordsMissing && isToolKeywordsMissing) {
        return null;
    }

    return [...(toolKeywords || []), ...(targetKeywords || [])];
};

/**
 * Maps the max pages from the target and tool to a single number.
 * @param targetMaxPages - The max pages from the target.
 * @param toolMaxPages - The max pages from the tool.
 * @returns The mapped max pages.
 */
const mapToMaxPages = (targetMaxPages: number | undefined, toolMaxPages: number | undefined) => {
    const isValidMaxPages = (value: number | undefined) => typeof value === 'number' && value >= 0;

    if (!isValidMaxPages(targetMaxPages) && !isValidMaxPages(toolMaxPages)) {
        return null;
    }

    return isValidMaxPages(targetMaxPages) ? targetMaxPages : toolMaxPages;
};

const mappers = {
    mapToKeywords,
    mapToMaxPages,
};

export default mappers;
