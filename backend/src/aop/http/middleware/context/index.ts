import authenticateContextMiddleware from './authenticate-context';
import dbContextMiddleware from './db-context';
import delegatorContextMiddleware from './delegator-context';
import emitterContextMiddleware from './emitter-context';
import schedulerContextMiddleware from './scheduler-context';

const contextResourceMiddleware = [
    dbContextMiddleware,
    schedulerContextMiddleware,
    delegatorContextMiddleware,
    emitterContextMiddleware,
];

export { authenticateContextMiddleware };
export default contextResourceMiddleware;
