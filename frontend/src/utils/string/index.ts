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
const capitalize = <T extends string>(str: T): Capitalize<T> => {
    return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>;
};

/**
 * Replaces every `{placeholder}` token in a string with the given value.
 *
 * @param template - The string containing `{placeholder}` tokens.
 * @param value - The value to insert in place of each token.
 * @returns The string with placeholders replaced.
 *
 * @example
 * replace('Confirm action for {identifier}?', 'abc')
 * // returns 'Confirm action for abc?'
 */
const replace = (template: string, value: string): string => {
    return template.replace(/\{[^{}]+\}/g, value);
};

const string = {
    capitalize,
    replace,
};

export default string;
