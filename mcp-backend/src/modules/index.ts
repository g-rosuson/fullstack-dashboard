import fpl from './fpl';
import whatsapp from './whatsapp';

import type { Module } from './types';

const list: readonly Module[] = [whatsapp, fpl];

const modules = {
    list,
};

export default modules;
