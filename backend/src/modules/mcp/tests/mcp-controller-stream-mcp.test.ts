import { Mock } from 'vitest';

import { streamMcp } from '../mcp-controller';

import constants from 'shared/constants';

import type { Request, Response } from 'express';

/**
 * Verification: unit proofs for the MCP prompt stream (cite HTTP IDs).
 * The runner emits the events. This controller opens the stream, replays an open permission, and forwards this user's events.
 * @see docs/specs/architecture/http/mcp/prompt.md
 */

const { mockGetOpenPermissionsForUser } = vi.hoisted(() => ({
    mockGetOpenPermissionsForUser: vi.fn(() => [] as Array<Record<string, unknown>>),
}));

vi.mock('aop/mcp/runner', () => ({
    PromptRunner: {
        getInstance: () => ({
            getOpenPermissionsForUser: mockGetOpenPermissionsForUser,
        }),
    },
}));

const mockResponseWrite = vi.fn();
const mockResponseFlushHeaders = vi.fn();
const mockResponseSetHeader = vi.fn();
const mockResponseFlush = vi.fn();
const mockResponse = {
    write: mockResponseWrite,
    flushHeaders: mockResponseFlushHeaders,
    setHeader: mockResponseSetHeader,
    flush: mockResponseFlush,
} as unknown as Response;
const mockRequestOn = vi.fn();
const mockEmitterOn = vi.fn();
const mockEmitterOff = vi.fn();

const userId = 'user-id-1';
const otherUserId = 'user-id-2';

const openPermission = {
    type: constants.events.mcp.permission,
    promptId: 'prompt-1',
    userId,
    domain: 'whatsapp',
    name: 'send',
    kind: 'tool',
    arguments: { text: 'hi' },
};

const mockRequest = {
    context: {
        user: { id: userId },
        emitter: {
            on: mockEmitterOn,
            off: mockEmitterOff,
        },
    },
    on: mockRequestOn,
} as unknown as Request;

/**
 * Parses SSE writes into event/data pairs. Comment padding is ignored.
 *
 * @param mockWrite The response `write` mock
 * @returns Events in write order
 */
const parseSSE = (mockWrite: Mock) => {
    const raw = mockWrite.mock.calls.map(call => call[0]).join('');

    return raw
        .split('\n\n')
        .filter(Boolean)
        .flatMap(chunk => {
            const lines = chunk.split('\n').filter(line => line !== '' && !line.startsWith(':'));

            if (lines.length === 0) {
                return [];
            }

            const eventLine = lines.find(line => line.startsWith('event: '));
            const dataLine = lines.find(line => line.startsWith('data: '));

            if (!eventLine || !dataLine) {
                return [];
            }

            return [
                {
                    event: eventLine.replace('event: ', ''),
                    data: JSON.parse(dataLine.replace('data: ', '')) as Record<string, unknown>,
                },
            ];
        });
};

/**
 * The listener registered for one MCP event type.
 *
 * @param eventName Event the controller subscribed to
 * @returns The handler passed to `emitter.on`
 */
const listenerFor = (eventName: string) => {
    const call = mockEmitterOn.mock.calls.find(([name]) => name === eventName);

    // eslint-disable-next-line no-unused-vars
    return call?.[1] as (event: Record<string, unknown>) => void;
};

describe('mcp-controller streamMcp', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetOpenPermissionsForUser.mockReturnValue([openPermission]);
        streamMcp(mockRequest, mockResponse);
    });

    describe('[HTTP-MCP-PRG-001]', () => {
        it('opens an SSE stream', () => {
            expect(mockResponseSetHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
            expect(mockResponseSetHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache, no-transform');
            expect(mockResponseSetHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
            expect(mockResponseSetHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
            expect(mockResponseFlushHeaders).toHaveBeenCalled();
            expect(mockResponseFlush).toHaveBeenCalled();
        });

        it('primes WebKit with an SSE comment that does not dispatch an empty frame', () => {
            const firstWrite = mockResponseWrite.mock.calls[0]?.[0] as string;

            expect(firstWrite.startsWith(':')).toBe(true);
            expect(firstWrite.endsWith('\n\n')).toBe(false);
            expect(firstWrite.length).toBeGreaterThanOrEqual(2048);
        });

        it('detaches every prompt listener when the connection closes', () => {
            const closeHandler = mockRequestOn.mock.calls[0][1] as () => void;

            closeHandler();

            expect(mockEmitterOff).toHaveBeenCalledWith(constants.events.mcp.selecting, expect.any(Function));
            expect(mockEmitterOff).toHaveBeenCalledWith(constants.events.mcp.permission, expect.any(Function));
            expect(mockEmitterOff).toHaveBeenCalledWith(constants.events.mcp.call, expect.any(Function));
            expect(mockEmitterOff).toHaveBeenCalledWith(constants.events.mcp.answering, expect.any(Function));
            expect(mockEmitterOff).toHaveBeenCalledWith(constants.events.mcp.answer, expect.any(Function));
            expect(mockEmitterOff).toHaveBeenCalledWith(constants.events.mcp.error, expect.any(Function));
            expect(mockEmitterOff).toHaveBeenCalledWith(constants.events.mcp.stopped, expect.any(Function));
        });
    });

    describe('[HTTP-MCP-PRG-009]', () => {
        it('replays each open permission for this user', () => {
            expect(mockGetOpenPermissionsForUser).toHaveBeenCalledWith(userId);
            expect(parseSSE(mockResponseWrite)).toEqual([
                {
                    event: constants.events.mcp.permission,
                    data: openPermission,
                },
            ]);
        });

        it('does not write a prompt event for a different user', () => {
            const writesBefore = mockResponseWrite.mock.calls.length;

            listenerFor(constants.events.mcp.selecting)({
                type: constants.events.mcp.selecting,
                promptId: 'prompt-2',
                userId: otherUserId,
            });

            expect(mockResponseWrite.mock.calls.length).toBe(writesBefore);
        });
    });

    describe('[FR-MCP-OWN-001]', () => {
        it('forwards a prompt event when it belongs to this user', () => {
            const selecting = {
                type: constants.events.mcp.selecting,
                promptId: 'prompt-1',
                userId,
            };

            listenerFor(constants.events.mcp.selecting)(selecting);

            expect(parseSSE(mockResponseWrite).at(-1)).toEqual({
                event: constants.events.mcp.selecting,
                data: selecting,
            });
        });
    });
});
