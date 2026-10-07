const basePath = '/api';

const authDomain = '/auth';
const jobsDomain = '/jobs';
const docsDomain = '/docs';
const mcpDomain = '/mcp';

const routes = {
    docs: {
        openapi: basePath + docsDomain + '/openapi',
    },
    auth: {
        register: basePath + authDomain + '/register',
        login: basePath + authDomain + '/login',
        logout: basePath + authDomain + '/logout',
        refresh: basePath + authDomain + '/refresh',
    },
    jobs: {
        create: basePath + jobsDomain + '/create',
        changeScheduleStatus: basePath + jobsDomain + '/change-schedule-status/:id',
        retrySchedule: basePath + jobsDomain + '/retry-schedule/:id',
        run: basePath + jobsDomain + '/run/:id',
        stop: basePath + jobsDomain + '/stop/:id',
        update: basePath + jobsDomain + '/update/:id',
        delete: basePath + jobsDomain + '/delete/:id',
        getById: basePath + jobsDomain + '/get/:id',
        getAll: basePath + jobsDomain + '/get-all',
        streamAll: basePath + jobsDomain + '/stream-all',
    },
    mcp: {
        stream: basePath + mcpDomain + '/stream',
        createConversation: basePath + mcpDomain + '/conversations',
        listConversations: basePath + mcpDomain + '/conversations',
        getConversation: basePath + mcpDomain + '/conversations/:id',
        deleteConversation: basePath + mcpDomain + '/conversations/:id',
        startPrompt: basePath + mcpDomain + '/prompt',
        permitPrompt: basePath + mcpDomain + '/prompt/:id/permit',
        refusePrompt: basePath + mcpDomain + '/prompt/:id/refuse',
        stopPrompt: basePath + mcpDomain + '/prompt/:id/stop',
    },
};

export default routes;
