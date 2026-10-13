import config from '@/config';

/**
 * Constructs a full API URL from the given path.
 */
const buildUrl = (path: string) => `${config.connect.backend.url}/api/${path}`;

export { buildUrl };
