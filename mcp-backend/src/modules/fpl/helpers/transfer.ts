/**
 * Free transfers still available. A null limit reports 0.
 */
function freeTransfers(limit: number | null, made: number): number {
    if (limit === null) {
        return 0;
    }

    return Math.max(0, limit - made);
}

export { freeTransfers };
