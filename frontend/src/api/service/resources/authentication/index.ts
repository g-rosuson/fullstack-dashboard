import client from '../../client';
import config from './config';
import { AccessToken, LoginUserInput, RegisterUserInput } from '@/_types/_gen';
import { ApiResponse } from '@/_types/infrastructure';

/**
 * Retrieves a new access-token when a valid http only
 * refresh token cookie is sent to the backend end-point.
 */
const refreshAccessToken = async () => {
    return await client.get<ApiResponse<AccessToken>>(config.path.refresh);
};

/**
 * Creates a new user and retrieves an access-token when valid credentials
 * are sent to the register backend endpoint.
 */
const register = async (credentials: RegisterUserInput) => {
    return await client.post<ApiResponse<AccessToken>, RegisterUserInput>(config.path.register, credentials);
};

/**
 * Retrieves a new access-token when valid credentials are sent
 * to the login backend endpoint.
 */
const login = async (credentials: LoginUserInput) => {
    return await client.post<ApiResponse<AccessToken>, LoginUserInput>(config.path.login, credentials);
};

/**
 * Logs out the current user by sending the http only refresh token cookie
 * to the logout backend endpoint.
 */
const logout = async () => {
    return await client.post<ApiResponse>(config.path.logout);
};

const resources = {
    refreshAccessToken,
    register,
    logout,
    login,
};

export default resources;
