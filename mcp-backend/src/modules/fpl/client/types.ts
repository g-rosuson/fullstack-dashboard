/**
 * Operator PingOne session for this process.
 * `refreshToken` is set only after PingOne rotates the env value.
 * `accessTokenExpiresAt` is epoch milliseconds, already reduced by the skew.
 */
interface Session {
    refreshToken: string | undefined;
    accessToken: string | undefined;
    accessTokenExpiresAt: number;
}

export type { Session };
