import { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import PasswordValidator from './passwordValidator/PasswordValidator';
import Button from '@/components/ui-prev/button/Button';
import Input from '@/components/ui-prev/input/Input';

import type { LoginUserInput, RegisterUserInput } from '@/_types/_gen';

import constants from './constants';
import api from '@/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import config from '@/config';
import { CustomError } from '@/services/error';
import logging from '@/services/logging';
import { jwtPayloadSchema } from '@/shared/schemas/jwt';
import { useUserSelection } from '@/store/selectors/user';
import utils from '@/utils';

const Authentication = () => {
    // Store selectors
    const userSelectors = useUserSelection();

    // State
    const [state, setState] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmationPassword: '',
        isLoading: false,
        isPasswordValid: false,
    });

    const { firstName, lastName, email, password, confirmationPassword, isLoading, isPasswordValid } = state;

    // Hooks
    const location = useLocation();
    const navigate = useNavigate();

    // Flags
    const isRegisterActive = location.pathname === config.routes.register;

    /**
     * Sets the input field changes in the state.
     */
    const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;

        setState(prevState => ({
            ...prevState,
            [name]: value,
        }));
    };

    /**
     * Determine whether password is valid when the register form is active.
     * Wrap in useCallback so the reference is stable across renders, preventing
     * PasswordValidator's useEffect from re-firing on every render cycle.
     */
    const onPasswordChange = useCallback((isPasswordValid: boolean) => {
        setState(prevState => ({
            ...prevState,
            isPasswordValid,
        }));
    }, []);

    /**
     * Sets the access-token and its decoded content in the store on login and register.
     */
    const onSubmit = async (event: FormEvent) => {
        try {
            event.preventDefault();

            setState(prevState => ({ ...prevState, isLoading: true }));

            let response;

            // User is registering
            if (isRegisterActive) {
                const registerPayload: RegisterUserInput = {
                    email,
                    password,
                    firstName,
                    lastName,
                    confirmationPassword,
                };

                response = await api.service.resources.authentication.register(registerPayload);
            } else {
                // User is logging in
                const loginPayload: LoginUserInput = {
                    email,
                    password,
                };

                response = await api.service.resources.authentication.login(loginPayload);
            }

            // Decode the access-token jwt
            const decoded = utils.jwt.decode(response.data);

            // Determing if the parsed jwt payload adhears to the schema
            const parsedJwt = jwtPayloadSchema.safeParse(decoded);

            // Log, send issue to Sentry, clear the store and
            // route to "/login" if jwt payload is malformed
            if (!parsedJwt.success) {
                // TODO: Add to sentry
                logging.warning('Access token structure invalid, redirecting to login...');

                // TODO: Notify user

                // Clear user store
                // * Note: We might need to reset other parts of the store as it grows
                userSelectors.clearUser();

                // Navigate to the "/login route"
                navigate(config.routes.login);
                return;
            }

            // Set payload in store
            const userPayload = {
                accessToken: response.data,
                ...parsedJwt.data,
            };

            userSelectors.changeUser(userPayload);
        } catch (error) {
            if (error instanceof CustomError) {
                console.log(error.issues);
            }

            logging.error(error as Error);
        } finally {
            setState(prevState => ({ ...prevState, isLoading: false }));
        }
    };

    /**
     * Navigate to root when an "accessToken" is set and valid.
     */
    useEffect(() => {
        if (userSelectors.accessToken && utils.jwt.isValid(userSelectors.accessToken)) {
            navigate(config.routes.root);
        }
    }, [navigate, userSelectors.accessToken]);

    // Determine partial form (Login)
    const partialFormContent = (
        <>
            <Input
                label={constants.labels.input.email.label}
                type="email"
                name="email"
                value={email}
                placeholder={constants.labels.input.email.placeholder}
                onChange={onInputChange}
                testId="email-input"
                required
            />

            <Input
                label={constants.labels.input.password.label}
                type="password"
                name="password"
                value={password}
                placeholder={constants.labels.input.password.placeholder}
                onChange={onInputChange}
                testId="password-input"
                required
            />
        </>
    );

    // Determine full form content (Register)
    const fullFormContent = (
        <>
            <Input
                label={constants.labels.input.firstName.label}
                type="text"
                name="firstName"
                value={firstName}
                placeholder={constants.labels.input.firstName.placeholder}
                onChange={onInputChange}
                testId="first-name-input"
                required
            />

            <Input
                label={constants.labels.input.lastName.label}
                type="text"
                name="lastName"
                value={lastName}
                placeholder={constants.labels.input.lastName.placeholder}
                onChange={onInputChange}
                testId="last-name-input"
                required
            />

            {partialFormContent}

            <Input
                label={constants.labels.input.confirmPassword.label}
                type="password"
                name="confirmationPassword"
                value={confirmationPassword}
                placeholder={constants.labels.input.confirmPassword.placeholder}
                onChange={onInputChange}
                testId="password-confirmation-input"
                required
            />

            <PasswordValidator
                password={password}
                confirmationPassword={state.confirmationPassword}
                onChange={onPasswordChange}
            />
        </>
    );

    const heading = isRegisterActive ? constants.labels.heading.register : constants.labels.heading.login;
    const buttonLabel = isRegisterActive ? constants.labels.button.register : constants.labels.button.login;
    const authModeLinkLabel = isRegisterActive ? constants.labels.links.login : constants.labels.links.register;
    const route = isRegisterActive ? config.routes.login : config.routes.register;
    const description = isRegisterActive ? 'Create your account to get started' : 'Sign in to your account';

    return (
        <div className="flex min-h-svh items-center justify-center p-4">
            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle>{heading}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>

                <CardContent>
                    <form className="flex flex-col gap-3" data-testid="auth-form" onSubmit={onSubmit}>
                        {isRegisterActive ? fullFormContent : partialFormContent}

                        <Button
                            testId="auth-submit-button"
                            type="submit"
                            label={buttonLabel}
                            variant="primary"
                            isLoading={isLoading}
                            disabled={isRegisterActive && isPasswordValid === false}
                        />
                    </form>
                </CardContent>

                <CardFooter className="justify-center text-sm text-foreground">
                    <Link to={route}>{authModeLinkLabel}</Link>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Authentication;
