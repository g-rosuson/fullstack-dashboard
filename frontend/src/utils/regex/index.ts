/**
 * Tests if the given string has a special character within the ASCII range.
 */
const hasSpecialCharacter = (string: string) => new RegExp(/[`!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]/).test(string);

/**
 * This regex test will match with any lower letter in the ASCII range.
 */
const hasLowercaseCharacter = (string: string) => new RegExp(/[a-z]/).test(string);

/**
 * This regex test will match with any upper letter in the ASCII range.
 */
const hasUppercaseCharacter = (string: string) => new RegExp(/[A-Z]/).test(string);

/**
 * Tests if the given string contains a number.
 */
const hasNumber = (string: string) => new RegExp(/\d+/).test(string);

const regex = {
    hasSpecialCharacter,
    hasLowercaseCharacter,
    hasUppercaseCharacter,
    hasNumber,
};

export default regex;
