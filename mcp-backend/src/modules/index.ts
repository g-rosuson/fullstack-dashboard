import echo from "./echo";

import type { Module } from "./types";

const list: readonly Module[] = [echo];

const modules = {
    list,
};

export default modules;
