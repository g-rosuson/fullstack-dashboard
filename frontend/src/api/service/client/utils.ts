/**
 * Constructs a full API URL from the given path.
 */
const buildUrl = (path: string) => `${window.metadata.backendRootUrl}/api/${path}`;

export { buildUrl };
