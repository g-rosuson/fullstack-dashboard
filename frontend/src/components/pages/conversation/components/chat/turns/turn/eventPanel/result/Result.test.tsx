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
        const { container } = render(<Result event={toolEvent('{"city":"Tokyo"}')} />);

        expect(resultText(container)).toBe('{\n  "city": "Tokyo"\n}');
    });

    it('leaves a sentence from a succeeded tool unchanged', () => {
        const { container } = render(<Result event={toolEvent('The sky is clear.')} />);

        expect(resultText(container)).toBe('The sky is clear.');
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

        expect(resultText(container)).toBe('weather://alerts\n[\n  "rain",\n  "sun"\n]');
    });
});
