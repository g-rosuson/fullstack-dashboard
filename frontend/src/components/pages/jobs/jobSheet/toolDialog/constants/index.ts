const initialScraperTool = {
    keyword: '',
    keywords: [],
    maxPages: 0,
    targets: [],
    type: 'scraper' as const,
    toolId: undefined,
};

const initialEmailTool = {
    subject: '',
    body: '',
    targets: [],
    type: 'email' as const,
    toolId: undefined,
};

const constants = {
    initialScraperTool,
    initialEmailTool,
};

export default constants;
