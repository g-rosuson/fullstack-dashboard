import type { TurnWithMessages } from '../types';
import type { ConversationTurn } from '@/shared/types/conversation';

const mapToTurns = (turns: ConversationTurn[]): TurnWithMessages[] => {
    return turns.map(turn => ({
        turnId: turn.turnId || '',
        messages: [
            {
                turnId: `${turn.turnId}-prompt`,
                prompt: turn.prompt,
            },
            ...(turn.answer
                ? [
                      {
                          turnId: `${turn.turnId}-answer`,
                          answer: turn.answer,
                      },
                  ]
                : []),
        ],
        streamEvents: turn.streamEvents,
        persistedEvents: turn.persistedEvents,
    }));
};

const mappers = {
    mapToTurns,
};

export default mappers;
