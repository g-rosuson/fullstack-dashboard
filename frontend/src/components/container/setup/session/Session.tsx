import { Fragment, ReactNode, useEffect, useRef, useState } from 'react';

import RefreshModal from './refreshModal/RefreshModal';

import { useUserSelection } from '@/store/selectors/user';
import utils from '@/utils';

// TODO: Redo testing from a-z using ID's etc

const Session = ({ children }: { children: ReactNode }) => {
    // State
    const [state, setState] = useState({
        isRefreshSessionModalOpen: false,
    });

    // Ref
    const hasMountedRef = useRef(false);

    // Store
    const userSelectors = useUserSelection();

    /**
     * Toggles the "Refresh session" modal visibility.
     */
    const toggleRefreshSessionModal = () => {
        setState(prevState => ({
            ...prevState,
            isRefreshSessionModalOpen: !prevState.isRefreshSessionModalOpen,
        }));
    };

    /**
     * - Creates a timeout which is triggered when the accessToken in the store expires.
     * - When the timeout is triggered, it opens a modal which allows the user to renew the
     *   accessToken/session. If no action is taken or the refreshToken cookie is invalid,
     *   the user is logged out.
     */
    useEffect(() => {
        if (!userSelectors.accessToken || hasMountedRef.current) {
            return;
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

        setState(prevState => ({
            ...prevState,
            isLoading: false,
        }));

        return () => {
            clearTimeout(renewSessionTimeout);
        };
    }, [userSelectors.accessToken]);

    return (
        <Fragment>
            {children}

            <RefreshModal open={state.isRefreshSessionModalOpen} close={toggleRefreshSessionModal} />
        </Fragment>
    );
};

export default Session;
