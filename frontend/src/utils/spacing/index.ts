const variables = {
    xs: '--spacing-xs',
    sm: '--spacing-sm',
    md: '--spacing-md',
    lg: '--spacing-lg',
    xl: '--spacing-xl',
} as const;

type SpacingToken = keyof typeof variables;

/**
 * Resolves a root spacing token to pixels.
 * Rem lengths are multiplied by the root font size so the result can be added to element measurements.
 */
const measure = (token: SpacingToken): number => {
    const root = getComputedStyle(document.documentElement);
    const raw = root.getPropertyValue(variables[token]).trim();
    const amount = parseFloat(raw);

    if (Number.isNaN(amount)) {
        return 0;
    }

    if (raw.endsWith('rem')) {
        return amount * parseFloat(root.fontSize);
    }

    return amount;
};

const spacing = {
    measure,
};

export default spacing;
