const constants = {
    toast: {
        createConversationErrorTitle: 'Conversation creation error',
        createConversationErrorDescription: 'An error occurred while creating the conversation.',
        promptErrorTitle: 'Prompt error',
        promptErrorDescription: 'An error occurred while sending the prompt.',
        fetchConversationErrorTitle: 'Conversation fetch error',
        fetchConversationErrorDescription: 'An error occurred while fetching the conversation.',
    },
    error: {
        createConversation: 'Error while creating conversation',
    },
} as const;

export default constants;
