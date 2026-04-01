import { jwtDecode } from 'jwt-decode';

import logging from '@/services/logging';

/**
 * Determines whether the given JWT is valid.
 */
const isValid = (token: string) => {
    try {
        const decoded = jwtDecode(token);

        // Current time in seconds
        const currentTime = Math.floor(Date.now() / 1000);

        // When the timestamp exists, compare it to the current time
        return decoded.exp ? decoded.exp > currentTime : false;
    } catch (error) {
        logging.error(error as Error);
        return false;
    }
};

/**
 * Decodes the given JWT.
 */
const decode = (token: string) => {
    try {
        return jwtDecode(token);
    } catch (error) {
        logging.error(error as Error);
        return null;
    }
};

const jwt = {
    isValid,
    decode,
};

export default jwt;
