import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, afterEach, beforeAll } from 'vitest';

import constants from './constants';
import RefreshSession from './RefreshSession';
import api from '@/api';
import config from '@/config';
import { UserStore } from '@/store/slices/user/user.types';

/**
 * A parent root component that manages the "RefreshSession" modal state.
 */
const Root = () => {
    const [isOpen, setIsOpen] = useState(true);

    const toggleModal = () => {
        setIsOpen(prevState => !prevState);
    };

    return (
        <div>
            <h2>Root route</h2>
            <RefreshSession open={isOpen} close={toggleModal} />
        </div>
    );
};

/**
 * Renders the "RefreshSession" component into the JS-DOM and returns testing utilities.
 */
const renderComponent = () => {
    return render(
        <MemoryRouter initialEntries={[config.routes.root]}>
            <Routes>
                <Route path={config.routes.root} element={<Root />} />
                <Route path={config.routes.login} element={<div>Login page</div>} />
            </Routes>
        </MemoryRouter>
    );
};

describe('RefreshSession modal component', () => {
    // Hoist mock variables since vi.mock is hoisted under the hood
    const mockUser = vi.hoisted<UserStore>(() => ({
        firstName: null,
        lastName: null,
        accessToken: null,
        email: null,
        id: null,
    }));
    const mockChangeUser = vi.hoisted(() => vi.fn());
    const mockClearUser = vi.hoisted(() => vi.fn());

    // Mock store
    vi.mock('../../../../store/selectors/user', async () => ({
        useUserSelection: vi.fn(() => ({
            ...mockUser,
            changeUser: mockChangeUser,
            clearUser: mockClearUser,
        })),
    }));

    // Mock jwt utils
    vi.mock('utils', async () => ({
        default: {
            jwt: {
                decode: vi.fn(() => ({
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'email@email.com',
                    id: 'id',
                })),
            },
        },
    }));

    // Mock logout timeout duration
    const mockLogoutTimeout = constants.time.logoutTimeout;

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

    it('initializes countdown to the correct value', () => {
        renderComponent();

        const countdownElement = screen.getByTestId('countdown');

        expect(countdownElement).toHaveTextContent(mockLogoutTimeout.toString());
    });

    it('decrements countdown every second', async () => {
        vi.useFakeTimers();

        renderComponent();

        const countdownElement = screen.getByTestId('countdown');

        // Simulate 1 second passing
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        // Assert the countdown has decreased by 1 second
        expect(countdownElement).toHaveTextContent(`${mockLogoutTimeout - 1}`);

        // Simulate another second passing
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        // Assert the countdown has decreased by 2 seconds
        expect(countdownElement).toHaveTextContent(`${mockLogoutTimeout - 2}`);

        vi.useRealTimers();
    });

    it('executes the logout flow when countdown reaches 0', async () => {
        vi.useFakeTimers();

        // Determine mock response and spy
        const mockResponse = {
            success: true,
            data: undefined,
            meta: {
                timestamp: new Date(),
            },
        };

        const logoutSpy = vi.spyOn(api.service.resources.authentication, 'logout').mockResolvedValue(mockResponse);

        // Mock a truthy access token so the logout flow is executed
        mockUser.accessToken = 'access.token';

        renderComponent();

        // Simulate 90 seconds by advancing one second at
        // a time and ensuring React processes each tick
        for (let i = 0; i < mockLogoutTimeout; i++) {
            await act(async () => {
                vi.advanceTimersByTime(1000);
            });
        }

        // Assert logout was called
        expect(logoutSpy).toHaveBeenCalledOnce();

        // Assert that the store.user.clearUser function was called without a payload
        expect(mockClearUser).toHaveBeenCalledWith();

        // Assert the user was redirected to the login page
        expect(screen.getByText('Login page')).toBeInTheDocument();

        vi.useRealTimers();
    });

    it('session is refreshed when user presses confirm and the modal automatically closes afterwards', async () => {
        renderComponent();

        const modal = screen.getByRole('dialog');

        // Determine mock response and spy
        const mockResponse = {
            success: true,
            data: 'mock-access-token',
            meta: {
                timestamp: new Date(),
            },
        };

        const refreshSessionSpy = vi
            .spyOn(api.service.resources.authentication, 'refreshAccessToken')
            .mockResolvedValue(mockResponse);

        // Simulate session refresh when confirm button is clicked
        const refreshSessionButton = within(modal).getByTestId('primary-button');
        await userEvent.click(refreshSessionButton);

        expect(refreshSessionSpy).toHaveBeenCalledOnce();

        // expected changeUser() payload
        const expectedPayload = {
            accessToken: 'mock-access-token',
            firstName: 'John',
            lastName: 'Doe',
            email: 'email@email.com',
            id: 'id',
        };

        // Assert store.user,changeUser function was called with the correct payload
        expect(mockChangeUser).toHaveBeenCalledWith(expectedPayload);

        waitFor(() => {
            expect(modal).not.toBeInTheDocument();
        });
    });

    it('navigates to the login page when the renew session endpoint throws an error', async () => {
        renderComponent();

        const modal = screen.getByRole('dialog');

        const mockError = new Error('Refreshing token failed');
        const refreshSessionSpy = vi
            .spyOn(api.service.resources.authentication, 'refreshAccessToken')
            .mockRejectedValue(mockError);

        // Simulate session refresh when confirm button is clicked
        await act(async () => {
            const refreshSessionButton = within(modal).getByTestId('primary-button');
            await userEvent.click(refreshSessionButton);
        });

        // Assert logout was called
        expect(refreshSessionSpy).toHaveBeenCalledOnce();

        // Assert store.user.clearUser function was called without payload
        expect(mockClearUser).toHaveBeenCalledWith();

        // Assert the user was redirected to the login page
        expect(screen.getByText('Login page')).toBeInTheDocument();
    });
});
