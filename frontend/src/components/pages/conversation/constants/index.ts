const constants = {
    toast: {
        createConversationErrorTitle: 'Conversation creation error',
        createConversationErrorDescription: 'An error occurred while creating the conversation.',
        promptErrorTitle: 'Prompt error',
        promptErrorDescription: 'An error occurred while sending the prompt.',
        stopErrorTitle: 'Stop error',
        stopErrorDescription: 'An error occurred while stopping the prompt.',
        fetchConversationErrorTitle: 'Conversation fetch error',
        fetchConversationErrorDescription: 'An error occurred while fetching the conversation.',
    },
    composer: {
        maxLength: 280,
        label: 'Prompt composer',
        placeholder: 'Enter prompt...',
        send: 'Send prompt',
        stop: 'Stop prompt',
    },
    error: {
        createConversation: 'Error while creating conversation',
    },
    /**
     * Id of the turn shown before the server returns the real turn id.
     */
    initialTurnId: 'initial-turn',
    /**
     * Marks the prompt that should sit on the top of the visible chat.
     */
    pinnedPromptAttribute: 'data-pinned-prompt',
} as const;

export default constants;
