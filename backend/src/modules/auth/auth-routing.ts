import { Router } from 'express';

import { loginLimiter, refreshLimiter, registerLimiter } from '../shared/middleware/rate-limiter';
import validateUserInput from '../shared/middleware/validate-user-input';
import { login, logout, register, renewAccessToken } from './auth-controller';
import { validateAuthenticationInput, validateRefreshToken } from './auth-middleware';

import constants from 'shared/constants';

// Determine router
const router = Router();

// Determine routes
router.post(constants.routes.auth.login, loginLimiter, validateUserInput, validateAuthenticationInput, login);
router.post(constants.routes.auth.register, registerLimiter, validateUserInput, validateAuthenticationInput, register);
router.post(constants.routes.auth.logout, validateRefreshToken, logout);
router.get(constants.routes.auth.refresh, refreshLimiter, validateRefreshToken, renewAccessToken);

export default router;
