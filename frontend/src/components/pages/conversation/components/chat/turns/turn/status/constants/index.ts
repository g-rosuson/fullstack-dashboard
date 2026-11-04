const constants = {
    status: {
        sending: 'Sending prompt...',
        selecting: 'Selecting resources...',
        permission: 'Grant model access to "{resource}"?',
        calling: 'Calling: "{lastEventName}" resource...',
        callingRefused: 'The "{lastEventName}" resource was refused',
        callingFailed: 'The "{lastEventName}" resource failed',
        callingSucceeded: 'The "{lastEventName}" resource succeeded',
        callingProcessing: 'The "{lastEventName}" resource is processing',
        saving: 'Saving the conversation...',
        error: 'An error occurred',
        stopped: 'The conversation was stopped',
        answered: 'The conversation was answered',
    },
};

export default constants;
