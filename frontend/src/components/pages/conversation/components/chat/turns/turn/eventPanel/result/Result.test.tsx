import { render } from '@testing-library/react';

import Result from './Result';
import {
    McpCallEventType,
    McpPersistedCallSucceededResourceEventKind,
    McpPersistedCallSucceededResourceEventStatus,
    McpPersistedCallSucceededToolEventKind,
    McpPersistedCallSucceededToolEventStatus,
    type McpPersistedPromptEvent,
} from '@/_types/_gen';

/**
 * A succeeded tool call whose result text is the given string.
 */
const toolEvent = (text: string): McpPersistedPromptEvent => ({
    type: McpCallEventType.call,
    status: McpPersistedCallSucceededToolEventStatus.succeeded,
    domain: 'weather',
    name: 'get_weather',
    kind: McpPersistedCallSucceededToolEventKind.tool,
    arguments: { city: 'Tokyo' },
    result: {
        content: [{ type: 'text', text }],
    },
});

/**
 * The pre that holds a succeeded result.
 */
const resultText = (container: HTMLElement) => container.querySelector('pre')?.textContent;

describe('Result', () => {
    it('pretty-prints JSON object text from a succeeded tool', () => {
        const text = '{"city":"Tokyo"}';
        const { container } = render(<Result event={toolEvent(text)} />);
        const result = resultText(container);

        expect(result).toContain('city');
        expect(result).toContain('Tokyo');
        expect(result).not.toBe(text);
    });

    it('leaves a sentence from a succeeded tool unchanged', () => {
        const sentence = 'The sky is clear.';
        const { container } = render(<Result event={toolEvent(sentence)} />);

        expect(resultText(container)).toBe(sentence);
    });

    it('pretty-prints JSON array text from a succeeded resource', () => {
        const event: McpPersistedPromptEvent = {
            type: McpCallEventType.call,
            status: McpPersistedCallSucceededResourceEventStatus.succeeded,
            domain: 'weather',
            name: 'alerts',
            kind: McpPersistedCallSucceededResourceEventKind.resource,
            arguments: {},
            result: {
                contents: [{ uri: 'weather://alerts', text: '["rain","sun"]' }],
            },
        };

        const { container } = render(<Result event={event} />);
        const result = resultText(container);

        expect(result).toContain('weather://alerts');
        expect(result).toContain('rain');
        expect(result).toContain('sun');
        expect(result).not.toContain('["rain","sun"]');
    });
});
