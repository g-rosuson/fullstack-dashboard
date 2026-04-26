declare global {
    interface Window {
        metadata: {
            backendRootUrl: string;
        };
    }
}

// This is necessary to make the file a module
export {};
