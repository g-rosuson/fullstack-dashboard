import type { ToolRegistry } from './types';

import Email from './email';
import Scraper from './scraper';

const toolRegistry: ToolRegistry = {
    scraper: new Scraper(),
    email: new Email(),
};

export default toolRegistry;
