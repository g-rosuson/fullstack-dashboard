import whatsapp from "./whatsapp";

import type { Module } from "./types";

const list: readonly Module[] = [whatsapp];

const modules = {
    list,
};

export default modules;
