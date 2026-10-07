import { Request, Response } from 'express';

import { InputValidationException } from 'aop/exceptions/errors/validation';

import { validateIdParam, validatePermissionInput, validatePromptInput } from '../mcp-middleware';

/**
 * Verification: unit proofs for MCP body and path gates.
 * A busy conversation, an unknown id, and a permit that does not match the ask are decided later.
 * @see docs/specs/architecture/http/mcp/prompt.md
 * @see docs/specs/architecture/http/mcp/selection.md
 * @see docs/specs/architecture/http/mcp/context.md
 */

describe('mcp-middleware', () => {
    describe('validatePromptInput', () => {
        describe('[HTTP-MCP-PRG-007]', () => {
            it('calls next with conversationId, prompt, and optional turnIds', () => {
                const mockNext = vi.fn();
                const conversationId = 'conversation-1';
                const prompt = 'Say hi';
                const turnIds = ['turn-1'];
                const request = {
                    body: { conversationId, prompt, turnIds, extra: true },
                } as Request;

                validatePromptInput(request, {} as Response, mockNext);

                expect(mockNext).toHaveBeenCalledOnce();
                expect(request.body).toEqual({ conversationId, prompt, turnIds });
            });
        });

        describe('[HTTP-MCP-CTX-002]', () => {
            it('allows an omitted turnIds list', () => {
                const mockNext = vi.fn();
                const request = {
                    body: { conversationId: 'conversation-1', prompt: 'Say hi' },
                } as Request;

                validatePromptInput(request, {} as Response, mockNext);

                expect(mockNext).toHaveBeenCalledOnce();
                expect(request.body).toEqual({ conversationId: 'conversation-1', prompt: 'Say hi' });
            });

            it('allows an empty turnIds list', () => {
                const mockNext = vi.fn();
                const request = {
                    body: { conversationId: 'conversation-1', prompt: 'Say hi', turnIds: [] },
                } as Request;

                validatePromptInput(request, {} as Response, mockNext);

                expect(mockNext).toHaveBeenCalledOnce();
                expect(request.body.turnIds).toEqual([]);
            });
        });

        it('rejects a prompt body that is missing a prompt', () => {
            const mockNext = vi.fn();
            const request = {
                body: { conversationId: 'conversation-1' },
            } as Request;

            expect(() => validatePromptInput(request, {} as Response, mockNext)).toThrow(InputValidationException);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('validatePermissionInput', () => {
        describe('[HTTP-MCP-SEL-003]', () => {
            it('calls next with domain, name, and kind', () => {
                const mockNext = vi.fn();
                const domain = 'whatsapp';
                const name = 'send';
                const kind = 'tool';
                const request = {
                    body: { domain, name, kind, extra: true },
                } as Request;

                validatePermissionInput(request, {} as Response, mockNext);

                expect(mockNext).toHaveBeenCalledOnce();
                expect(request.body).toEqual({ domain, name, kind });
            });
        });

        it('rejects a kind that is not tool or resource', () => {
            const mockNext = vi.fn();
            const request = {
                body: { domain: 'whatsapp', name: 'send', kind: 'prompt' },
            } as Request;

            expect(() => validatePermissionInput(request, {} as Response, mockNext)).toThrow(InputValidationException);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('validateIdParam', () => {
        it('calls next with a non-empty id', () => {
            const mockNext = vi.fn();
            const id = 'prompt-1';
            const request = {
                params: { id, extra: 'no' },
            } as unknown as Request;

            validateIdParam(request, {} as Response, mockNext);

            expect(mockNext).toHaveBeenCalledOnce();
            expect(request.params).toEqual({ id });
        });

        it('rejects an empty id', () => {
            const mockNext = vi.fn();
            const request = {
                params: { id: '' },
            } as unknown as Request;

            expect(() => validateIdParam(request, {} as Response, mockNext)).toThrow(InputValidationException);
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
