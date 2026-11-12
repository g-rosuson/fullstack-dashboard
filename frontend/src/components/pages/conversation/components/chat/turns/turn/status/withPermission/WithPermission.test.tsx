import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { constants as toastConstants } from '@/components/blocks/toast/Toast';

import constants from './constants';
import WithPermission from './WithPermission';
import { McpPermissionInputKind } from '@/_types/_gen';
import api from '@/api';
import { CustomError } from '@/services/error';
import logging from '@/services/logging';

const promptId = 'prompt-1';
const domain = 'weather';
const name = 'get_weather';
const kind = McpPermissionInputKind.tool;
const resourceArguments = { city: 'Tokyo' };

const toastAdd = vi.hoisted(() => vi.fn());

vi.mock('@/api', () => ({
    default: {
        service: {
            resources: {
                mcp: {
                    permit: vi.fn(),
                    refuse: vi.fn(),
                },
            },
        },
    },
}));

vi.mock('@/components/blocks/toast/Toast', async importOriginal => {
    const actual = await importOriginal<typeof import('@/components/blocks/toast/Toast')>();

    return {
        ...actual,
        toast: {
            ...actual.toast,
            add: toastAdd,
        },
    };
});

vi.mock('@/services/logging', () => ({
    default: {
        error: vi.fn(),
    },
}));

/**
 * A promise the test settles when the permission response should arrive.
 */
const deferred = <T,>() => {
    // The parameter name is only the type of the resolver.
    // eslint-disable-next-line no-unused-vars
    let resolve: (value: T) => void = () => undefined;
    const promise = new Promise<T>(res => {
        resolve = res;
    });

    return { promise, resolve };
};

const renderAsk = () => {
    return render(
        <WithPermission
            promptId={promptId}
            domain={domain}
            name={name}
            kind={kind}
            resourceArguments={resourceArguments}
        />
    );
};

describe('WithPermission', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('[CLIENT-MCP-PRG-002] / [FR-MCP-SEL-010] shows the domain, name, and arguments', () => {
        renderAsk();

        const argumentParts = Object.entries(resourceArguments).flatMap(([key, value]) => [key, String(value)]);

        expect(
            screen.getByText(content => [domain, name, ...argumentParts].every(part => content.includes(part)))
        ).toBeInTheDocument();
    });

    it('[CLIENT-MCP-SEL-001] allows the open tool', async () => {
        const user = userEvent.setup();
        vi.mocked(api.service.resources.mcp.permit).mockResolvedValue({
            success: true,
            data: { promptId },
            meta: { timestamp: new Date('2026-11-05T00:00:00.000Z') },
        });

        renderAsk();
        await user.click(screen.getByRole('button', { name: constants.label.allow }));

        expect(api.service.resources.mcp.permit).toHaveBeenCalledWith(promptId, { domain, name, kind });
        expect(api.service.resources.mcp.refuse).not.toHaveBeenCalled();
    });

    it('[CLIENT-MCP-SEL-002] refuses the open tool', async () => {
        const user = userEvent.setup();
        vi.mocked(api.service.resources.mcp.refuse).mockResolvedValue({
            success: true,
            data: { promptId },
            meta: { timestamp: new Date('2026-11-05T00:00:00.000Z') },
        });

        renderAsk();
        await user.click(screen.getByRole('button', { name: constants.label.deny }));

        expect(api.service.resources.mcp.refuse).toHaveBeenCalledWith(promptId, { domain, name, kind });
        expect(api.service.resources.mcp.permit).not.toHaveBeenCalled();
    });

    it('disables both actions while the request is in flight', async () => {
        const user = userEvent.setup();
        const pending = deferred<Awaited<ReturnType<typeof api.service.resources.mcp.permit>>>();
        vi.mocked(api.service.resources.mcp.permit).mockReturnValue(pending.promise);

        renderAsk();
        await user.click(screen.getByRole('button', { name: constants.label.allow }));

        expect(screen.getByRole('button', { name: `Loading ${constants.label.allow}` })).toBeDisabled();
        expect(screen.getByRole('button', { name: constants.label.deny })).toBeDisabled();

        pending.resolve({
            success: true,
            data: { promptId },
            meta: { timestamp: new Date('2026-11-05T00:00:00.000Z') },
        });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: constants.label.deny })).toBeEnabled();
        });
    });

    it('shows an error when the request fails', async () => {
        const user = userEvent.setup();
        const error = new CustomError('The ask is no longer open');
        vi.mocked(api.service.resources.mcp.permit).mockRejectedValue(error);

        renderAsk();
        await user.click(screen.getByRole('button', { name: constants.label.allow }));

        expect(logging.error).toHaveBeenCalledWith(error);
        expect(toastAdd).toHaveBeenCalledWith({
            title: constants.toast.errorTitle,
            description: error.message,
            type: toastConstants.type.error,
        });
        expect(screen.getByRole('button', { name: constants.label.allow })).toBeEnabled();
    });
});
