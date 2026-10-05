/**
 * Hostnames treated as loopback for Host checks and the default allowlist.
 */
const LOOPBACK_HOSTS = ["localhost", "127.0.0.1", "::1"] as const;

export { LOOPBACK_HOSTS };
