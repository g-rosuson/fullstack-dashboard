import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import EventPanel from './EventPanel';
import {
    McpPersistedPermissionEventKind,
    McpPersistedPermissionEventType,
    type McpPersistedPromptEvent,
} from '@/_types/_gen';

const event: McpPersistedPromptEvent = {
    type: McpPersistedPermissionEventType.permission,
    domain: 'weather',
    name: 'get_weather',
    kind: McpPersistedPermissionEventKind.tool,
    arguments: { city: 'Tokyo' },
};

describe('EventPanel', () => {
    it('pretty-prints argument objects', async () => {
        const { container } = render(<EventPanel composerHeight={0} events={[event]} />);

        await userEvent.click(screen.getByRole('button', { name: 'Events (1)' }));

        expect(container.querySelector('pre')?.textContent).toBe('{\n  "city": "Tokyo"\n}');
    });
});
