/**
 * Indexes `items` by `id`. Later duplicates overwrite earlier ones.
 */
function byId<Item extends { id: number }>(items: readonly Item[]): Map<number, Item> {
    return new Map(items.map((item) => [item.id, item]));
}

export { byId };
