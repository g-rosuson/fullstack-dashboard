const conversationsRoute = '/conversations';

/**
 * Builds the URL for a conversation.
 *
 * @param conversationId - The ID of the conversation.
 * @returns The URL for the conversation.
 */
const buildConversationUrl = (conversationId: string) => {
    return `${conversationsRoute}/${conversationId}`;
};

const routes = {
    root: '/',
    register: '/register',
    login: '/login',
    jobs: '/jobs',

    conversations: {
        base: conversationsRoute,
        create: `${conversationsRoute}/create`,
        conversation: `${conversationsRoute}/:conversationId`,
    },
};

export { routes, buildConversationUrl };
