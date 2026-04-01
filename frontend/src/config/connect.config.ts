const connectConfig = {
    backend: {
        dev: {
            url: 'http://localhost:1000' as const,
        },
        prod: {
            url: 'https://my-url' as const,
        },
    },
    frontend: {
        dev: {
            url: 'http://localhost:5173' as const,
        },
        prod: {
            url: 'https://my-url' as const,
        },
    },
};

export default connectConfig;
