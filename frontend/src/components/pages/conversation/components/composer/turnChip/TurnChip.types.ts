type AttachedTurn = {
    turnId: string;
    prompt: string;
};

type TurnChipProps = {
    turn: AttachedTurn;
    // eslint-disable-next-line no-unused-vars
    onAttachedTurnClick: (turnId: string) => void;
    // eslint-disable-next-line no-unused-vars
    onRemoveTurn: (turnId: string) => void;
};

export type { AttachedTurn, TurnChipProps };
