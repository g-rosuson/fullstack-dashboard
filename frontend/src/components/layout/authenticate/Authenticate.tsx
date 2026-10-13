import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Spinner from '@/components/blocks/spinner/Spinner';
import Setup from '@/components/container/setup/Setup';

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
    const [isLoading, setIsLoading] = useState(false);

    // Refs
    const hasMountedRef = useRef(false);

    // Hooks
    const navigate = useNavigate();

    /**
     * - Renews the "accessToken" when its invalid or missing.
     * - Re-routes the user to the login page when the renewal is unsuccessful.
     */
    const renewAccessToken = useCallback(async () => {
        try {
            setIsLoading(true);

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
     * - Attempts to refresh the "accessToken" when it's not
     *   set and the component has not mounted.
     */
    useEffect(() => {
        if (!userSelectors.accessToken && !hasMountedRef.current) {
            renewAccessToken();
        }
    }, [renewAccessToken, userSelectors.accessToken]);

    //  Determine spinner component
    const SpinnerView = (
        <div className="flex min-h-svh items-center justify-center p-md">
            <Spinner className="size-8" />
        </div>
    );

    return isLoading ? SpinnerView : <Setup />;
};

export default Authenticate;
