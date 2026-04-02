declare global {
    interface Window {
        metadata: {
            backendRootUrl: 'http://localhost:1000' | 'https://my-url';
        };
    }
}

// This is necessary to make the file a module
export {};
