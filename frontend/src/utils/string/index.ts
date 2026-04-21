/**
 * Capitalizes the first letter of a string.
 *
 * @param str - The string to capitalize.
 * @returns The capitalized string.
 *
 * @example
 * capitalize('hello') // returns 'Hello'
 * capitalize('world') // returns 'World'
 * capitalize('') // returns ''
 * capitalize(null) // returns ''
 */
const capitalize = (str?: unknown): string => {
    if (typeof str !== 'string' || str.length === 0) {
        return '';
    }

    return str.charAt(0).toUpperCase() + str.slice(1);
};

const string = {
    capitalize,
};

export default string;
