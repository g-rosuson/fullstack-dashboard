const constants = {
    status: {
        sending: 'Sending prompt...',
        answering: 'Model is answering with the resource results...',
        selecting: 'Selecting resources...',
        permission: 'Grant model access to "{name}" from domain "{domain}" with the following arguments: {arguments}?',
        calling: 'Calling: "{lastEventName}" resource...',
        callingRefused: 'The "{lastEventName}" resource was refused',
        callingFailed: 'The "{lastEventName}" resource failed',
        callingSucceeded: 'The "{lastEventName}" resource succeeded',
        callingProcessing: 'Processing "{lastEventName}" resource...',
        saving: 'Saving the conversation...',
        error: 'An error occurred',
        stopped: 'The conversation was stopped',
    },
};

export default constants;
