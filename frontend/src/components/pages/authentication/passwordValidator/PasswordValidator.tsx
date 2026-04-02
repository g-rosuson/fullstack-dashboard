import { memo, useEffect, useState } from 'react';
import clsx from 'clsx';
import { Check } from 'lucide-react';

import constants from './constants';
import { Props } from './PasswordValidator.types';
import utils from '@/utils';

const PasswordValidator = ({ password, confirmationPassword, hidden, onChange }: Props) => {
    const validatorClassName = 'flex flex-col gap-1 mb-2 rounded-lg border bg-surface p-3';
    const itemClassName = 'flex items-center';
    const circleClassName = 'mr-2.5 rounded-full border bg-background transition-colors w-5 h-5';
    const validCircleClassName = `${circleClassName} bg-success animate-[fade-in_0.4s]`;
    const iconClassName = 'w-full h-full';
    const textClassName = 'text-xs';

    // State
    const [isValid, setIsValid] = useState(false);

    // Determine whether the password is valid
    const hasSpecialCharacter = utils.regex.hasSpecialCharacter(password);
    const hasLowercase = utils.regex.hasLowercaseCharacter(password);
    const hasUppercase = utils.regex.hasUppercaseCharacter(password);
    const hasNumber = utils.regex.hasNumber(password);
    const hasValidLength = password?.length >= 8;

    // Confirm that password match
    const passwordsMatch = !!password && password === confirmationPassword ? true : false;

    /**
     * Check if the password has changed from being invalid to valid
     * or the other way around and pass the new state to the parent.
     */
    useEffect(() => {
        if (
            passwordsMatch &&
            hasSpecialCharacter &&
            hasLowercase &&
            hasUppercase &&
            hasNumber &&
            hasValidLength &&
            !isValid
        ) {
            setIsValid(true);
            onChange(true);
        }

        if (
            (!passwordsMatch ||
                !hasSpecialCharacter ||
                !hasLowercase ||
                !hasUppercase ||
                !hasNumber ||
                !hasValidLength) &&
            isValid
        ) {
            setIsValid(false);
            onChange(false);
        }
    }, [hasLowercase, hasUppercase, hasNumber, hasSpecialCharacter, hasValidLength, isValid, passwordsMatch, onChange]);

    // Determine validation options
    const validationItems = [
        {
            text: constants.labels.lowerCase,
            isValid: hasLowercase,
        },
        {
            text: constants.labels.upperCase,
            isValid: hasUppercase,
        },
        {
            text: constants.labels.number,
            isValid: hasNumber,
        },
        {
            text: constants.labels.specialCharacter,
            isValid: hasSpecialCharacter,
        },
        {
            text: constants.labels.eightCharacters,
            isValid: hasValidLength,
        },
        {
            text: constants.labels.passwordsMatch,
            isValid: passwordsMatch,
        },
    ];

    if (hidden) {
        return null;
    }

    return (
        <div className={validatorClassName}>
            {validationItems.map(({ text, isValid }, index) => (
                <div className={itemClassName} key={index}>
                    <div className={clsx(isValid ? validCircleClassName : circleClassName)}>
                        <div hidden={!isValid}>
                            <Check className={iconClassName} />
                        </div>
                    </div>

                    <span className={textClassName}>{text}</span>
                </div>
            ))}
        </div>
    );
};

export default memo(PasswordValidator);
