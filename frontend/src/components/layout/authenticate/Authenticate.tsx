import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Spinner from '../../ui-prev/spinner/Spinner';
import Dashboard from '../dashboard/Dashboard';
import RefreshSessionModal from './refreshSession/RefreshSession';

import api from '@/api';
import config from '@/config';
import logging from '@/services/logging';
import { jwtPayloadSchema } from '@/shared/schemas/jwt';
import { useUserSelection } from '@/store/selectors/user';
import utils from '@/utils';

const Authenticate = () => {
    // Store selectors
    const userSelectors = useUserSelection();

    // State
    const [isRefreshSessionModalOpen, setIsRefreshSessionModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Refs
    const hasMountedRef = useRef(false);

    // Hooks
    const navigate = useNavigate();

    /**
     * Toggles the "Refresh session" modal visibility.
     */
    const toggleRefreshSessionModal = useCallback(() => {
        setIsRefreshSessionModalOpen(prevState => !prevState);
    }, []);

    /**
     * - Renews the "accessToken" when its invalid or missing.
     * - Re-routes the user to the login page when the renewal is unsuccessful.
     */
    const renewAccessToken = useCallback(async () => {
        try {
            const response = await api.service.resources.authentication.refreshAccessToken();

            const decoded = utils.jwt.decode(response.data);

            const result = jwtPayloadSchema.safeParse(decoded);

            if (!result.success) {
                // TODO: Add to sentry
                // TODO: Create label
                logging.warning('Access token structure invalid, redirecting to login...');
                userSelectors.clearUser();
                navigate(config.routes.login);
                return;
            }

            const userPayload = {
                accessToken: response.data,
                ...result.data,
            };

            userSelectors.changeUser(userPayload);

            hasMountedRef.current = true;

            setIsLoading(false);
        } catch (error) {
            logging.error(error as Error);

            // When the "refreshAccessToken" endpoint
            // throws an error, navigate to login page
            navigate(config.routes.login);
        }
    }, [navigate, userSelectors]);

    /**
     * - Creates a timeout which is triggered when the accessToken in the store expires.
     * - When the timeout is triggered, it opens a modal which allows the user to renew the
     *   accessToken/session. If no action is taken or the refreshToken cookie is invalid,
     *   the user is logged out.
     */
    useEffect(() => {
        if (!userSelectors.accessToken) {
            return;
        }

        if (!isLoading) {
            setIsLoading(true);
        }

        const decoded = utils.jwt.decode(userSelectors.accessToken);

        // Current time in ms
        const currentTime = Date.now();

        // JWT expiry time in ms
        const jwtExpiry = (decoded?.exp || 0) * 1000;

        // Deduct the expiry token date from the current time,
        // to create the setTimout duration
        const timeUntilRenewal = jwtExpiry - currentTime;

        // Create a timout that triggers a modal that prompts
        // the user to renew the accessToken when it expires
        const renewSessionTimeout = setTimeout(toggleRefreshSessionModal, timeUntilRenewal);

        hasMountedRef.current = true;

        setIsLoading(false);

        return () => {
            clearTimeout(renewSessionTimeout);
        };
    }, [isLoading, userSelectors.accessToken, toggleRefreshSessionModal]);

    /**
     * - Attempts to refresh the "accessToken" when it's not
     *   set and the component has not mounted.
     */
    useEffect(() => {
        if (!userSelectors.accessToken && !hasMountedRef.current) {
            renewAccessToken();
        }
    }, [renewAccessToken, userSelectors.accessToken]);

    const authComponent = (
        <>
            <Dashboard />

            <RefreshSessionModal open={isRefreshSessionModalOpen} close={toggleRefreshSessionModal} />
        </>
    );

    return isLoading ? <Spinner /> : authComponent;
};

export default Authenticate;
