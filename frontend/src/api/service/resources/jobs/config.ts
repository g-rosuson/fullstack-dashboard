const domain = 'jobs/';

const config = {
    path: {
        create: domain + 'create',
        update: domain + 'update/',
        delete: domain + 'delete/',
        getById: domain + 'get/',
        getAll: domain + 'get-all',
        streamAll: domain + 'stream-all',
    },
};

export default config;
