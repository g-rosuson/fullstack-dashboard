import string from './index';

describe('string utils', () => {
    it('capitalizes the first letter and leaves the rest unchanged', () => {
        const word = 'hELLO';
        const result = string.capitalize(word);

        expect(result.charAt(0)).toBe(word.charAt(0).toUpperCase());
        expect(result.slice(1)).toBe(word.slice(1));
        expect(string.capitalize('')).toBe('');
    });

    it('replaces every placeholder with the same value and keeps the surrounding text', () => {
        const value = 'abc';
        const result = string.replace('before {one} middle {two} after', value);

        expect(result).toBe(`before ${value} middle ${value} after`);
        expect(string.replace('before after', value)).toBe('before after');
    });

    it('fills named placeholders and leaves an unknown token in place', () => {
        const values = { name: 'get_weather', domain: 'weather', empty: '' };
        const result = string.replacePlaceholders('{name} from {domain} {missing} {empty}', values);

        expect(result).toContain(values.name);
        expect(result).toContain(values.domain);
        expect(result).toContain('{missing}');
        expect(result).not.toContain('{name}');
        expect(result).not.toContain('{domain}');
        expect(result).not.toContain('{empty}');
    });

    it('pretty-prints a JSON object or array and parses back to the same value', () => {
        const object = { city: 'Tokyo' };
        const list = ['Tokyo'];
        const formattedObject = string.prettyPrintJson(`  ${JSON.stringify(object)}  `);
        const formattedList = string.prettyPrintJson(JSON.stringify(list));

        expect(JSON.parse(formattedObject)).toEqual(object);
        expect(JSON.parse(formattedList)).toEqual(list);
        expect(formattedObject).not.toBe(JSON.stringify(object));
        expect(formattedList).not.toBe(JSON.stringify(list));
    });

    it('leaves a sentence and JSON primitives as written', () => {
        const sentence = '  not json  ';

        expect(string.prettyPrintJson(sentence)).toBe(sentence);
        expect(string.prettyPrintJson('"hello"')).toBe('"hello"');
        expect(string.prettyPrintJson('1')).toBe('1');
        expect(string.prettyPrintJson('true')).toBe('true');
        expect(string.prettyPrintJson('null')).toBe('null');
    });
});
