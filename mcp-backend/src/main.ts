import server from "./server";
import { loadConfig } from "./config/env/env.ts";

async function main() {
    const config = loadConfig();
    await server.start(config);
}

void main();
