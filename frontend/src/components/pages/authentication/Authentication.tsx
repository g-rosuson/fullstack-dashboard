import { type ChangeEvent, type SubmitEvent as ReactSubmitEvent, useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import PasswordValidator from './passwordValidator/PasswordValidator';
import Button from '@/components/blocks/button/Button';
import Card from '@/components/blocks/card/Card';
import Flex from '@/components/blocks/flex/Flex';
import Form from '@/components/blocks/form/Form';
import Text from '@/components/blocks/text/Text';

import type { LoginUserInput, RegisterUserInput } from '@/_types/_gen';
import type { FormField, FormGroup } from '@/components/blocks/form/Form.types';

import constants from './constants';
import api from '@/api';
import config from '@/config';
import { CustomError } from '@/services/error';
import logging from '@/services/logging';
import { jwtPayloadSchema } from '@/shared/schemas/jwt';
import { useConversationSelection } from '@/store/selectors/conversation';
import { useUserSelection } from '@/store/selectors/user';
import utils from '@/utils';

const Authentication = () => {
    // Store selectors
    const userSelectors = useUserSelection();
    const { clearConversation } = useConversationSelection();

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
    const isRegisterActive = config.features.isRegistrationEnabled && location.pathname === config.routes.register;

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
    const onSubmit = async (event: ReactSubmitEvent<HTMLFormElement>) => {
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

                // Clear the session store objects
                userSelectors.clearUser();
                clearConversation();

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

    // Login fields
    const loginFields: FormField[] = [
        {
            type: 'email',
            name: 'email',
            label: constants.labels.input.email.label,
            value: email,
            placeholder: constants.labels.input.email.placeholder,
            onChange: onInputChange,
            required: true,
        },
        {
            type: 'password',
            name: 'password',
            label: constants.labels.input.password.label,
            value: password,
            placeholder: constants.labels.input.password.placeholder,
            onChange: onInputChange,
            required: true,
        },
    ];

    // Register fields
    const registerFields: FormField[] = [
        {
            type: 'text',
            name: 'firstName',
            label: constants.labels.input.firstName.label,
            value: firstName,
            placeholder: constants.labels.input.firstName.placeholder,
            onChange: onInputChange,
            required: true,
        },
        {
            type: 'text',
            name: 'lastName',
            label: constants.labels.input.lastName.label,
            value: lastName,
            placeholder: constants.labels.input.lastName.placeholder,
            onChange: onInputChange,
            required: true,
        },
        ...loginFields,
        {
            type: 'password',
            name: 'confirmationPassword',
            label: constants.labels.input.confirmPassword.label,
            value: confirmationPassword,
            placeholder: constants.labels.input.confirmPassword.placeholder,
            onChange: onInputChange,
            required: true,
        },
    ];

    // Groups
    const groups: FormGroup[] = [
        {
            fields: isRegisterActive ? registerFields : loginFields,
            children: isRegisterActive ? (
                <PasswordValidator
                    password={password}
                    confirmationPassword={confirmationPassword}
                    onChange={onPasswordChange}
                />
            ) : undefined,
        },
    ];

    // Labels
    const heading = isRegisterActive ? constants.labels.heading.register : constants.labels.heading.login;
    const buttonLabel = isRegisterActive ? constants.labels.button.register : constants.labels.button.login;
    const authModeLinkLabel = isRegisterActive ? constants.labels.links.login : constants.labels.links.register;
    const route = isRegisterActive ? config.routes.login : config.routes.register;
    const description = isRegisterActive ? 'Create your account to get started.' : 'Sign in to your account.';

    return (
        <Flex direction="column" justify="center" align="center" className="min-h-svh p-md">
            <Card
                title={heading}
                description={description}
                minWidth="sm"
                footer={
                    config.features.isRegistrationEnabled ? (
                        <Flex justify="center">
                            <Link to={route}>
                                <Text size="sm" variant="foreground">
                                    {authModeLinkLabel}
                                </Text>
                            </Link>
                        </Flex>
                    ) : undefined
                }>
                <Form ariaLabel="Authentication form" groups={groups} onSubmit={onSubmit}>
                    <Button
                        type="submit"
                        label={buttonLabel}
                        isLoading={isLoading}
                        disabled={isRegisterActive && isPasswordValid === false}
                        fullWidth
                    />
                </Form>
            </Card>
        </Flex>
    );
};

export default Authentication;
