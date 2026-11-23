import type { Conversation, ConversationTurn } from '@/shared/types/conversation';

import { openTurn, openTurnIndex } from './index';

const turn = (overrides: Partial<ConversationTurn> = {}): ConversationTurn => ({
    turnId: 'turn-1',
    prompt: 'Hello',
    streamEvents: [],
    persistedEvents: [],
    ...overrides,
});

const conversation = (turns: ConversationTurn[]): Conversation => ({
    conversationId: 'conversation-1',
    status: 'processing',
    turns,
});

describe('open turn', () => {
    it('[CLIENT-MCP-CNV-002] / [FR-MCP-CNV-004] returns the turn that is still being answered', () => {
        const stored = conversation([
            turn({ turnId: 'turn-1', finishedAt: '2026-11-04T00:00:01.000Z' }),
            turn({ turnId: 'turn-2' }),
        ]);

        expect(openTurnIndex(stored)).toBe(1);
        expect(openTurn(stored)?.turnId).toBe('turn-2');
    });

    it('returns none when the conversation is missing or every turn has ended', () => {
        const finished = conversation([turn({ finishedAt: '2026-11-04T00:00:01.000Z' })]);
        const stopped = conversation([turn({ end: 'stopped' })]);
        const failed = conversation([turn({ end: 'error' })]);

        expect(openTurn(undefined)).toBeUndefined();
        expect(openTurnIndex(undefined)).toBe(-1);
        expect(openTurn(finished)).toBeUndefined();
        expect(openTurn(stopped)).toBeUndefined();
        expect(openTurn(failed)).toBeUndefined();
        expect(openTurnIndex(finished)).toBe(-1);
        expect(openTurnIndex(stopped)).toBe(-1);
        expect(openTurnIndex(failed)).toBe(-1);
    });
});
