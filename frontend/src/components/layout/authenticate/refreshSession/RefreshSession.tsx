import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/ui-app/button/Button';

import constants from './constants';
import { Props } from './RefreshSession.types';
import api from '@/api';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import config from '@/config';
import logging from '@/services/logging';
import { jwtPayloadSchema } from '@/shared/schemas/jwt';
import { useUserSelection } from '@/store/selectors/user';
import utils from '@/utils';

const RefreshSession = ({ open, close }: Props) => {
    // Store selectors
    const userSelectors = useUserSelection();

    // State
    const [countdown, setCountdown] = useState(constants.time.logoutTimeout);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refs
    const hasRefreshedSession = useRef(false);
    const isLoggingOut = useRef(false);
    const countdownTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
    const resetCountdownTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Router
    const navigate = useNavigate();

    /**
     * Resets "countdown" with a delay to prevent content flash.
     */
    const onClose = () => {
        resetCountdownTimeoutId.current = setTimeout(() => {
            countdownTimeoutId.current = null;
            hasRefreshedSession.current = false;
            isLoggingOut.current = false;
            setCountdown(constants.time.logoutTimeout);
        }, constants.time.resetStateTimeout);

        close?.();
    };

    /**
     * - Gets a new "accessToken" from the "refreshAccessToken" endpoint and
     *   sets it in the store when the httpOnly "refreshToken" cookie is valid.
     * - Reset the "accessToken" in the store and navigates the user to the
     *   login page when the httpOnly "refreshToken" cookie is not valid.
     */
    const renewSession = async () => {
        try {
            setIsSubmitting(true);

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

            hasRefreshedSession.current = true;

            setIsSubmitting(false);

            onClose();
        } catch (error) {
            logging.error(error as Error);

            // When the "refreshAccessToken" endpoint throws an error,
            // reset the "accessToken" in the store and navigate to
            // login page
            userSelectors.clearUser();
            navigate(config.routes.login);
        }
    };

    /**
     * Calls the "logout" endpoint when an "accessToken" is set in the store,
     * and clears the user object in the store and navigates to the login route
     */
    const logout = useCallback(async () => {
        try {
            setIsSubmitting(true);

            if (userSelectors.accessToken) {
                await api.service.resources.authentication.logout();
            }
        } catch (error) {
            logging.error(error as Error);
        } finally {
            userSelectors.clearUser();
            navigate(config.routes.login);
        }
    }, [navigate, userSelectors]);

    /**
     * - Logs the user out when the "countdown" reaches zero.
     * - Starts a one-second interval when the "countdown" is greater than zero,
     *   decrementing the "countdown" every second.
     * - Clears the interval when the component unmounts or when the countdown stops.
     */
    useEffect(() => {
        // Log the user out when:
        // - The modal is open
        // - The countdown reaches zero
        // - The user is not already being logged out
        if (open && countdown === 0 && !isLoggingOut.current) {
            isLoggingOut.current = true;
            logout();
            return;
        }

        // Decrement the countdown when:
        // - The modal is open
        // - The countdown is greater than zero
        // - The session is not being refreshed
        if (open && countdown > 0 && !hasRefreshedSession.current) {
            countdownTimeoutId.current = setTimeout(() => {
                setCountdown(prevState => prevState - 1);
            }, constants.time.timeoutDuration);
        }

        return () => {
            if (typeof countdownTimeoutId.current === 'number') {
                clearTimeout(countdownTimeoutId.current);
            }

            if (typeof resetCountdownTimeoutId.current === 'number') {
                clearTimeout(resetCountdownTimeoutId.current);
            }
        };
    }, [countdown, logout, open]);

    return (
        <Dialog open={open}>
            <DialogContent
                showCloseButton={false}
                onEscapeKeyDown={e => e.preventDefault()}
                onInteractOutside={e => e.preventDefault()}
                className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>{constants.labels.refreshSessionModal.title}</DialogTitle>
                    <DialogDescription>
                        Your session has expired, please refresh it within <b>{constants.time.logoutTimeout}</b> seconds
                        to avoid being logged out.
                    </DialogDescription>
                </DialogHeader>

                <p className="text-sm text-foreground">
                    You will be automatically logged out in: <b data-testid="countdown">{countdown}</b> seconds
                </p>

                <DialogFooter>
                    <Button
                        testId="primary-button"
                        label={constants.labels.refreshSessionModal.confirmBtn}
                        onClick={renewSession}
                        isLoading={isSubmitting}
                    />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default RefreshSession;
