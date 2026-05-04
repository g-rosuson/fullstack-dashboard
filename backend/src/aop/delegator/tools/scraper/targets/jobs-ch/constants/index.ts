const constants = {
    selectors: {
        itemSelector: '[data-cy="job-link"]',
        resultsContainer: '[aria-label="Job list"]',
        titleSelector: '[data-cy="vacancy-title"]',
        descriptionSelector: '[data-cy="vacancy-description"]',
        companyNameSelector: '[data-cy="company-link"]',
        vacancyLogoSelector: '[data-cy="vacancy-logo"]',
        infoSelector: '[data-cy="vacancy-info"]',
        companyNameParsing: {
            span: 'span',
            svg: 'svg',
            label: 'Company',
        },
        informationParsing: {
            list: 'ul',
            listItem: 'li',
            span: 'span',
            svg: 'svg',
        },
        descriptionParsing: {
            allSpans: 'p > strong > span, p > span, ul > li > span',
            titleContainer: 'p > strong',
            paragraph: 'p',
            listItem: 'ul > li',
            strong: 'strong',
        },
    },
    configuration: {
        baseUrl: 'https://www.jobs.ch/en/vacancies/',
        detailUrlPrefix: 'https://www.jobs.ch/en/vacancies/detail/',
    },
} as const;

export default constants;
