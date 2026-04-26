const connectConfig = {
    backend: {
        url: import.meta.env.VITE_BACKEND_URL as string,
    },
    frontend: {
        url: import.meta.env.VITE_FRONTEND_URL as string,
    },
};

export default connectConfig;
