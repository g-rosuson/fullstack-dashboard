import server from './server';
import { loadConfig } from './config/env/env.ts';

// TODO: System prompts for modules.
// TODO: Example: FPL: Outputs hard to read tables and a table for current team which we dont need.
async function main() {
    const config = loadConfig();
    await server.start(config);
}

void main();
