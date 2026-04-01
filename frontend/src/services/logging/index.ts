/**
 * Logs an error to the console when developing.
 */
const error = (error: Error) => {
    const isDeveloping = window.location.hostname === 'localhost';

    if (isDeveloping) {
        console.error(error);
    }
};

/**
 * Logs a warning to the console when developing.
 */
const warning = (message: string) => {
    const isDeveloping = window.location.hostname === 'localhost';

    if (isDeveloping) {
        console.warn(message);
    }
};

const logging = {
    error,
    warning,
};

export default logging;
