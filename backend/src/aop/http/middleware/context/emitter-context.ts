import { Emitter } from 'aop/emitter';
import { EmitterContext } from 'aop/emitter/context';

import type { NextFunction, Request, Response } from 'express';

/**
 * Injects the emitter context into the request lifecycle.
 * @param req Express request object
 * @param _res Express response object
 * @param next Express next function
 */
const emitterContextMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
    const emitterInstance = Emitter.getInstance();
    req.context.emitter = new EmitterContext(emitterInstance);

    next();
};

export default emitterContextMiddleware;
