import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, Mock } from 'vitest';

import Authenticate from './Authenticate';
import api from '@/api';
import config from '@/config';
import { UserStore } from '@/store/slices/user/user.types';

/**
 * Renders the "Authenticated" component into the JS-DOM and returns testing utilities.
 */
const renderComponent = () => {
    return render(
        <MemoryRouter initialEntries={[config.routes.root]}>
            <Routes>
                <Route element={<Authenticate />}>
                    <Route path={config.routes.root} element={<div>Protected route</div>} />
                </Route>

                <Route path={config.routes.login} element={<div>Login page</div>} />
            </Routes>
        </MemoryRouter>
    );
};

describe('Authenticate component', () => {
    // Hoist mock variables since vi.mock is hoisted under the hood
    const mockUser = vi.hoisted<UserStore>(() => ({
        accessToken: null,
        firstName: null,
        lastName: null,
        email: null,
        id: null,
    }));
    const mockChangeUser = vi.hoisted(() => vi.fn());

    // Mock store
    vi.mock('@/store/selectors/user', async () => ({
        useUserSelection: vi.fn(() => ({
            ...mockUser,
            changeUser: mockChangeUser,
        })),
    }));

    // Mock api
    vi.mock('@/api', () => ({
        // Default exported modules should be wrapped in a "default" object
        // https://vitest.dev/api/vi.html#vi-mock
        default: {
            service: {
                resources: {
                    authentication: {
                        refreshAccessToken: vi.fn(),
                    },
                },
            },
        },
    }));

    // Mock logging service
    const mockErrorLogging = vi.hoisted(() => vi.fn());

    vi.mock('@/services/logging', () => ({
        default: {
            error: mockErrorLogging,
        },
    }));

    // Mock JWT service
    vi.mock('@/utils/jwt', () => ({
        default: {
            decode: vi.fn(() => ({
                firstName: 'John',
                lastName: 'Doe',
                email: 'email@email.com',
                id: 'id',
                // Mock JWT expiration time to be 5 seconds in the future
                exp: Math.floor((Date.now() + 5000) / 1000),
            })),
        },
    }));

    /**
     * Create the modal root for the "RefreshSessionModal" modal to be rendered into.
     */
    beforeAll(() => {
        const modalRoot = document.createElement('div');
        modalRoot.id = 'modal';
        document.body.appendChild(modalRoot);
    });

    /**
     * Reset mocked functions and variables after each test.
     */
    afterEach(() => {
        vi.clearAllMocks();
        mockUser.accessToken = null;
        mockUser.email = null;
        mockUser.id = null;
    });

    /**
     * Remove the modal root after all tests to ensure a clean test environment.
     */
    afterAll(() => {
        const modalRoot = document.getElementById('modal');

        if (modalRoot) {
            modalRoot.remove();
        }
    });

    it('renders authenticated component when access token is successfully refreshed', async () => {
        const mockAccessTokenResponse = 'mock-access-token';

        // Mock successful API response
        const mockUserResponseData = {
            accessToken: 'mock-access-token',
            firstName: 'John',
            lastName: 'Doe',
            email: 'email@email.com',
            id: 'id',
        };

        (api.service.resources.authentication.refreshAccessToken as Mock).mockResolvedValue({
            data: mockAccessTokenResponse,
        });

        renderComponent();

        // Assert that:
        // - The store.user.changeUser function was called with the correct payload
        // - The user was redirected to the protected route
        await waitFor(() => {
            expect(mockChangeUser).toHaveBeenCalledWith(mockUserResponseData);

            expect(screen.getByText('Protected route')).toBeInTheDocument();
        });
    });

    it('does not call "refreshAccessToken" endpoint when accessToken is set', async () => {
        mockUser.accessToken = 'valid.jwt.token';

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Protected route')).toBeInTheDocument();
            expect(api.service.resources.authentication.refreshAccessToken).not.toHaveBeenCalled();
        });
    });

    it('navigates to "/login" route when the "refreshAccessToken" endpoints throws an error', async () => {
        const mockError = new Error('Refreshing token failed');
        (api.service.resources.authentication.refreshAccessToken as Mock).mockRejectedValue(mockError);

        renderComponent();

        // Assert that:
        // - Error was logged
        // - The user was redirected to the login page
        await waitFor(() => {
            expect(mockErrorLogging).toHaveBeenCalledWith(mockError);
            expect(screen.getByText('Login page')).toBeInTheDocument();
        });
    });

    it('opens the refresh session modal when the access token is expired', async () => {
        // Inform vitest we use mocked time
        vi.useFakeTimers();

        // Mock a truthy access token so the useEffect hook runs
        mockUser.accessToken = 'access.token';

        renderComponent();

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        vi.useRealTimers();
    });
});
