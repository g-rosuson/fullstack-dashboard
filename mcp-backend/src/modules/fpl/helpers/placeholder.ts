/**
 * Replaces each `{name}` in `text` with the matching placeholder.
 * A name with no placeholder is left as written.
 */
function replacePlaceholder(text: string, placeholders: Record<string, string | number>): string {
    return text.replace(/\{(\w+)\}/g, (marker, name: string) => {
        const value = placeholders[name];

        if (value === undefined) {
            return marker;
        }

        return String(value);
    });
}

export { replacePlaceholder };
