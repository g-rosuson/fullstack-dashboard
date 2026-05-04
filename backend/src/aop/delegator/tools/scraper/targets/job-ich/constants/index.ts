/**
 * jobich.ch target constants.
 *
 * Selectors derived from the rendered DOM at:
 * https://jobich.ch/?q=frontend+developer&canton=AG#search
 */
const constants = {
    selectors: {
        /**
         * Container that holds the search results table.
         * Markup: `<div class="table-wrap">...<table>...<tr class="clickable-row">...</table></div>`
         */
        resultsContainer: 'div.table-wrap',

        /**
         * A single clickable job row inside the results table.
         */
        jobRow: 'tr.clickable-row',

        /**
         * The "Show more" / load-next-batch button below the table.
         * Multiple `.btn` elements exist on the page, so we filter by text.
         * Playwright supports the `:has-text(...)` engine pseudo-class.
         */
        showMoreButton: 'button.btn:has-text("Show more")',

        /**
         * The overlay that appears after clicking a job row.
         * Markup: `<div class="vacancy-card">...</div>`
         */
        overlayContainer: 'div.vacancy-card',

        /**
         * Job title element inside the overlay.
         * Markup: `<div class="vacancy-card-header"><h2>...</h2></div>`
         */
        titleSelector: 'div.vacancy-card-header h2',

        /**
         * Job description container inside the overlay.
         * Markup: `<div class="vacancy-card-desc"><div>... text with <br> ...</div></div>`
         * Selecting the inner div directly so we can walk its text/<br> children.
         */
        descriptionSelector: 'div.vacancy-card-desc > div',

        /**
         *
         */
        sourceUrl: 'div.vacancy-card-actions > a.btn.search',

        /**
         * The two metadata blocks inside the overlay:
         *   <div class="vacancy-card-meta">    -> Company / Location / Source / Posted
         *   <div class="vacancy-card-tags">    -> Industry / work-mode / contract / etc.
         */
        metaSelector: 'div.vacancy-card-meta',
        tagsSelector: 'div.vacancy-card-tags',

        /**
         * Sub-classes used during meta/tag parsing to derive labels.
         */
        meta: {
            sourceClass: 'source',
        },
        tags: {
            industryClass: 'tag-industry',
        },
    },
    configuration: {
        /**
         * Base URL — the search page accepts `?q=<query>&canton=<XX>#search`.
         */
        baseUrl: 'https://jobich.ch/',

        /**
         * Keyword prefix that signals a canton filter (e.g. `canton:AG`).
         * The remaining keywords are joined into the `q` query parameter.
         */
        cantonKeywordPrefix: 'canton:',

        /**
         * Delay between "Show more" clicks to let new rows render.
         */
        showMoreLoadDelayMs: 1500,

        /**
         * Default labels used positionally for `vacancy-card-meta` spans when
         * class-based detection (`<strong>` -> Company, `.source` -> Source)
         * doesn't apply. The remaining positions (Location at index 1,
         * Posted at index 3) fall back to these.
         */
        metaLabels: ['Company', 'Location', 'Source', 'Posted'] as const,
    },
} as const;

export default constants;
