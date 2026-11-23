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
 * @returns 'Confirm action for abc?'
 */
const replace = (template: string, value: string): string => {
    return template.replace(/\{[^{}]+\}/g, value);
};

/**
 * Replaces every `{placeholder}` token in a string with the given value.
 *
 * @param template - The string containing `{placeholder}` tokens.
 * @param values - The values to insert in place of each token.
 * @returns The string with placeholders replaced.
 *
 * @example
 * replacePlaceholders('Allow model to call "{name}" from domain "{domain}" with the following arguments: {arguments}?', { name: 'example', domain: 'example.com', arguments: '{"key":"value"}' })
 * @returns 'Allow model to call "example" from domain "example.com" with the following arguments: {"key":"value"}?'
 */
const replacePlaceholders = (template: string, values: Record<string, string>): string => {
    return template.replace(/\{([^{}]+)\}/g, (token, key: string) => values[key] ?? token);
};

/**
 * Pretty-prints a JSON object or array.
 * A sentence, or a JSON string, number, or boolean, stays as written.
 *
 * @param text - The text to format.
 * @returns The pretty-printed JSON, or the original text.
 *
 * @example
 * prettyPrintJson('{"city":"Tokyo"}')
 * @returns '{\n  "city": "Tokyo"\n}'
 */
const prettyPrintJson = (text: string): string => {
    try {
        const value: unknown = JSON.parse(text.trim());

        if (value !== null && typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }
    } catch {
        // The text is not JSON.
    }

    return text;
};

const string = {
    capitalize,
    replace,
    replacePlaceholders,
    prettyPrintJson,
};

export default string;
