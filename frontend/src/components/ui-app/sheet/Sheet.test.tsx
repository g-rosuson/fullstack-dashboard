import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';

import type { SheetProps } from './Sheet.types';
import type { ReactNode } from 'react';

import Sheet from './Sheet';

/**
 * Renders Sheet into the JS-DOM with sensible defaults for controlled open state.
 */
const renderSheet = (props: Partial<SheetProps> & { children?: ReactNode } = {}) => {
    const onOpenChange = props.onOpenChange ?? vi.fn();

    return render(
        <Sheet
            open={props.open ?? true}
            onOpenChange={onOpenChange}
            className={props.className}
            width={props.width}
            enableForm={props.enableForm}
            onFormSubmit={props.onFormSubmit}
            onPrimaryButtonClick={props.onPrimaryButtonClick}
            isSubmitting={props.isSubmitting}
            primaryButtonLabel={props.primaryButtonLabel}>
            {props.children ?? <h2>Sheet content</h2>}
        </Sheet>
    );
};

describe('Sheet component: visibility', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('does not surface a dialog when open is false', () => {
        renderSheet({ open: false });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows the dialog and main content when open is true', () => {
        renderSheet({
            open: true,
            children: <p>Job details panel</p>,
        });

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(within(dialog).getByText('Job details panel')).toBeInTheDocument();
    });
});

describe('Sheet component: footer and primary action', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('shows a primary action labelled from primaryButtonLabel', () => {
        renderSheet({ primaryButtonLabel: 'Save changes' });

        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
    });

    it('does not render a labelled primary button when primaryButtonLabel is omitted', () => {
        renderSheet({ primaryButtonLabel: undefined });

        const dialog = screen.getByRole('dialog');
        expect(within(dialog).queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
    });
});

describe('Sheet component: form vs button mode', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('uses a submit primary action inside a form when enableForm is true', async () => {
        const onFormSubmit = vi.fn(() => Promise.resolve());

        renderSheet({
            enableForm: true,
            primaryButtonLabel: 'Create',
            onFormSubmit,
        });

        const dialog = screen.getByRole('dialog');
        const submit = within(dialog).getByRole('button', { name: 'Create' });

        expect(submit).toHaveAttribute('type', 'submit');
        expect(submit.closest('form')).toBeInstanceOf(HTMLFormElement);

        await userEvent.click(submit);

        await waitFor(() => {
            expect(onFormSubmit).toHaveBeenCalledTimes(1);
        });
    });

    it('uses a button primary action and invokes onPrimaryButtonClick when enableForm is false', async () => {
        const onPrimaryButtonClick = vi.fn();

        renderSheet({
            enableForm: false,
            primaryButtonLabel: 'Continue',
            onPrimaryButtonClick,
        });

        const dialog = screen.getByRole('dialog');
        const button = within(dialog).getByRole('button', { name: 'Continue' });

        expect(button.closest('form')).toBeNull();
        expect(button).toHaveAttribute('type', 'button');

        await userEvent.click(button);

        expect(onPrimaryButtonClick).toHaveBeenCalledTimes(1);
    });
});

describe('Sheet component: submitting state', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('shows loading feedback and disables the primary action while submitting', () => {
        renderSheet({
            enableForm: true,
            primaryButtonLabel: 'Save',
            isSubmitting: true,
            onFormSubmit: vi.fn(() => Promise.resolve()),
        });

        const dialog = screen.getByRole('dialog');
        const submit = within(dialog).getByRole('button', { name: 'Loading' });

        expect(submit).toBeDisabled();
        expect(submit).toHaveAttribute('type', 'submit');
        expect(within(submit).getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    });

    it('restores the primary label after submitting finishes', async () => {
        const onOpenChange = vi.fn();
        const onFormSubmit = vi.fn(() => Promise.resolve());

        const { rerender } = render(
            <Sheet
                open
                onOpenChange={onOpenChange}
                enableForm
                primaryButtonLabel="Save"
                isSubmitting
                onFormSubmit={onFormSubmit}>
                <h2>Sheet content</h2>
            </Sheet>
        );

        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByRole('button', { name: 'Loading' })).toBeDisabled();

        rerender(
            <Sheet
                open
                onOpenChange={onOpenChange}
                enableForm
                primaryButtonLabel="Save"
                isSubmitting={false}
                onFormSubmit={onFormSubmit}>
                <h2>Sheet content</h2>
            </Sheet>
        );

        await waitFor(() => {
            const submit = within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' });
            expect(submit).toBeEnabled();
            expect(within(submit).queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument();
        });
    });
});

describe('Sheet component: controlled open', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('requests to close when the user activates the sheet close control', async () => {
        const onOpenChange = vi.fn();
        renderSheet({ onOpenChange, primaryButtonLabel: 'Done' });

        const dialog = screen.getByRole('dialog');
        await userEvent.click(within(dialog).getByRole('button', { name: /close/i }));

        await waitFor(() => {
            expect(onOpenChange).toHaveBeenCalledWith(false);
        });
    });
});
