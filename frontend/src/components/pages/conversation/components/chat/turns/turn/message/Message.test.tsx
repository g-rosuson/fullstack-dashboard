import { render, screen } from '@testing-library/react';

import Message from './Message';

describe('Message: answer text', () => {
    it('[CLIENT-MCP-ANS-002] / [FR-MCP-ANS-002] keeps a prompt as typed', () => {
        render(<Message message={{ turnId: 'turn-1-prompt', prompt: '# Title' }} />);

        expect(screen.getByText('# Title')).toBeInTheDocument();
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('[CLIENT-MCP-ANS-001] / [FR-MCP-ANS-001] shows an answer heading', () => {
        render(<Message message={{ turnId: 'turn-1-answer', answer: '## Title' }} />);

        expect(screen.getByRole('heading', { level: 2, name: 'Title' })).toBeInTheDocument();
    });
});
