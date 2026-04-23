import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ConfirmationDialogProps } from './ConfirmationDialog.types';

import ConfirmationDialog from './ConfirmationDialog';

/**
 * Renders ConfirmationDialog into the JS-DOM with sensible defaults.
 */
const renderDialog = (props: Partial<ConfirmationDialogProps> = {}) => {
    const onOpenChange = props.onOpenChange ?? vi.fn();
    const onConfirm = props.onConfirm ?? vi.fn(() => Promise.resolve());

    const view = render(
        <ConfirmationDialog
            open={props.open ?? true}
            onOpenChange={onOpenChange}
            title={props.title ?? 'Confirm action'}
            description={props.description}
            confirmLabel={props.confirmLabel}
            confirmVariant={props.confirmVariant}
            onConfirm={onConfirm}
        />
    );

    return { ...view, onOpenChange, onConfirm };
};

describe('ConfirmationDialog component', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('what the user sees', () => {
        it('does not expose a dialog in the accessibility tree when open is false', () => {
            renderDialog({ open: false });

            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('shows the title as the dialog heading when open', () => {
            const title = 'Delete this item?';
            renderDialog({ title });

            const dialog = screen.getByRole('dialog');
            expect(within(dialog).getByRole('heading', { name: title })).toBeInTheDocument();
        });

        it('shows description copy only after the description prop is provided', () => {
            const onOpenChange = vi.fn();
            const onConfirm = vi.fn(() => Promise.resolve());
            const description = 'Please confirm you understand the consequences.';

            const { rerender } = render(
                <ConfirmationDialog open onOpenChange={onOpenChange} title="Proceed?" onConfirm={onConfirm} />
            );

            expect(screen.queryByText(description)).not.toBeInTheDocument();

            rerender(
                <ConfirmationDialog
                    open
                    onOpenChange={onOpenChange}
                    title="Proceed?"
                    description={description}
                    onConfirm={onConfirm}
                />
            );

            const dialog = screen.getByRole('dialog');
            expect(within(dialog).getByText(description)).toBeInTheDocument();
        });

        it('names the primary action "Confirm" unless confirmLabel overrides it', () => {
            renderDialog();

            const dialog = screen.getByRole('dialog');
            expect(within(dialog).getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
        });

        it('uses confirmLabel for the accessible name of the primary action', () => {
            renderDialog({ confirmLabel: 'Delete forever' });

            const dialog = screen.getByRole('dialog');
            expect(within(dialog).getByRole('button', { name: 'Delete forever' })).toBeInTheDocument();
        });
    });

    describe('user actions', () => {
        it('invokes onConfirm when the user activates the primary action', async () => {
            const { onConfirm } = renderDialog();
            const dialog = screen.getByRole('dialog');

            await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

            await waitFor(() => {
                expect(onConfirm).toHaveBeenCalledTimes(1);
            });
        });

        it('requests to close when the user cancels', async () => {
            const onOpenChange = vi.fn();
            renderDialog({ onOpenChange });
            const dialog = screen.getByRole('dialog');

            await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

            await waitFor(() => {
                expect(onOpenChange).toHaveBeenCalledWith(false);
            });
        });
    });

    describe('while confirmation is in progress', () => {
        it('surfaces loading feedback and blocks both actions until the operation finishes', async () => {
            let finish!: () => void;
            const confirmPromise = new Promise<void>(resolve => {
                finish = resolve;
            });

            renderDialog({
                confirmLabel: 'Save',
                onConfirm: vi.fn(() => confirmPromise),
            });

            const dialog = screen.getByRole('dialog');
            const confirmButton = within(dialog).getByRole('button', { name: 'Save' });
            const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' });

            await userEvent.click(confirmButton);

            expect(await within(dialog).findByRole('status', { name: 'Loading' })).toBeInTheDocument();
            expect(cancelButton).toBeDisabled();
            expect(confirmButton).toBeDisabled();

            finish();

            await waitFor(() => {
                expect(within(dialog).queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument();
            });

            expect(within(dialog).getByRole('button', { name: 'Save' })).toBeEnabled();
            expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled();
        });

        it('ends loading and re-enables actions when confirmation fails so the user can retry', async () => {
            const { onConfirm } = renderDialog({
                onConfirm: vi.fn(() => Promise.reject(new Error('Network error'))),
            });

            const dialog = screen.getByRole('dialog');

            await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));

            await waitFor(() => {
                expect(onConfirm).toHaveBeenCalled();
                expect(within(dialog).queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument();
            });

            expect(within(dialog).getByRole('button', { name: 'Confirm' })).toBeEnabled();
            expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeEnabled();
        });
    });
});
