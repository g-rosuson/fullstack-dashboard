// Routes
const JOBS_DOMAIN = '/jobs';

const CREATE_JOB_ROUTE = JOBS_DOMAIN + '/create';
const DELETE_JOB_ROUTE = JOBS_DOMAIN + '/delete/:id';
const UPDATE_JOB_ROUTE = JOBS_DOMAIN + '/update/:id';
const GET_JOB_ROUTE = JOBS_DOMAIN + '/get/:id';
const GET_ALL_JOBS_ROUTE = JOBS_DOMAIN + '/get-all';
const GET_STREAM_JOBS_ROUTE = JOBS_DOMAIN + '/stream-all';

export {
    CREATE_JOB_ROUTE,
    DELETE_JOB_ROUTE,
    UPDATE_JOB_ROUTE,
    GET_JOB_ROUTE,
    GET_ALL_JOBS_ROUTE,
    GET_STREAM_JOBS_ROUTE,
};
