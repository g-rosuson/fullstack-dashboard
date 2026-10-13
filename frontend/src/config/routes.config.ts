const conversationsRoutes = '/conversations';

const routes = {
    root: '/',
    register: '/register',
    login: '/login',
    jobs: '/jobs',

    conversations: {
        base: conversationsRoutes,
        create: `${conversationsRoutes}/create`,
        conversation: `${conversationsRoutes}/:conversationId`,
    },
};

export default routes;
