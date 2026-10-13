import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';

import type { SheetProps } from './Sheet';
import type { ReactNode, SubmitEvent as ReactSubmitEvent } from 'react';

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
            title={props.title ?? 'Sheet title'}
            description={props.description}
            headerActions={props.headerActions}
            className={props.className}
            formId={props.formId}
            onPrimaryButtonClick={props.onPrimaryButtonClick}
            isSubmitting={props.isSubmitting}
            primaryButtonLabel={props.primaryButtonLabel}
            side={props.side}
            width={props.width}>
            {props.children ?? <p>Sheet content</p>}
        </Sheet>
    );
};

describe('Sheet block: visibility', () => {
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

describe('Sheet block: footer and primary action', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('[CLIENT-UI-ACT-001] / [FR-UI-ACT-001] shows a primary action labelled from primaryButtonLabel', () => {
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

describe('Sheet block: form vs button mode', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('[CLIENT-UI-ACT-003] / [FR-UI-ACT-003] uses a button primary action and invokes onPrimaryButtonClick when formId is omitted', async () => {
        const onPrimaryButtonClick = vi.fn();

        renderSheet({
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

    it('[CLIENT-UI-ACT-003] / [FR-UI-ACT-003] associates the primary action with an external form id without wrapping a sheet form', async () => {
        const onFormSubmit = vi.fn((event: ReactSubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            return Promise.resolve();
        });

        render(
            <Sheet open onOpenChange={vi.fn()} title="Create job" formId="job-form" primaryButtonLabel="Create">
                <form id="job-form" aria-label="Job form" onSubmit={onFormSubmit}>
                    <input name="name" />
                </form>
            </Sheet>
        );

        const dialog = screen.getByRole('dialog');
        const submit = within(dialog).getByRole('button', { name: 'Create' });

        expect(submit).toHaveAttribute('type', 'submit');
        expect(submit).toHaveAttribute('form', 'job-form');
        expect(submit.closest('form')).toBeNull();

        await userEvent.click(submit);

        await waitFor(() => {
            expect(onFormSubmit).toHaveBeenCalledTimes(1);
        });
    });
});

describe('Sheet block: submitting state', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('[CLIENT-UI-ACT-002] / [FR-UI-ACT-002] shows loading feedback and disables the primary action while submitting', () => {
        renderSheet({
            formId: 'job-form',
            primaryButtonLabel: 'Save',
            isSubmitting: true,
        });

        const dialog = screen.getByRole('dialog');
        const submit = within(dialog).getByRole('button', { name: /save/i });

        expect(submit).toBeDisabled();
        expect(submit).toHaveAttribute('type', 'submit');
        expect(submit).toHaveAttribute('aria-busy', 'true');
        expect(within(submit).getByRole('status', { name: 'Loading' })).toBeInTheDocument();
        expect(within(submit).getByText('Save')).toBeInTheDocument();
    });

    it('[CLIENT-UI-ACT-002] / [FR-UI-ACT-002] restores the primary label after submitting finishes', async () => {
        const onOpenChange = vi.fn();

        const { rerender } = render(
            <Sheet
                open
                onOpenChange={onOpenChange}
                title="Edit job"
                formId="job-form"
                primaryButtonLabel="Save"
                isSubmitting>
                <p>Sheet content</p>
            </Sheet>
        );

        const dialog = screen.getByRole('dialog');
        const submitting = within(dialog).getByRole('button', { name: /save/i });
        expect(submitting).toBeDisabled();
        expect(within(submitting).getByRole('status', { name: 'Loading' })).toBeInTheDocument();

        rerender(
            <Sheet
                open
                onOpenChange={onOpenChange}
                title="Edit job"
                formId="job-form"
                primaryButtonLabel="Save"
                isSubmitting={false}>
                <p>Sheet content</p>
            </Sheet>
        );

        await waitFor(() => {
            const submit = within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' });
            expect(submit).toBeEnabled();
            expect(within(submit).queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument();
        });
    });
});

describe('Sheet block: controlled open', () => {
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

describe('Sheet block: width', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('defaults left and right sheets to the sm width token', () => {
        renderSheet();

        expect(screen.getByRole('dialog')).toHaveClass('sm:max-w-sm');
    });

    it('applies the requested width token on left and right sheets', () => {
        renderSheet({ width: 'lg' });

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveClass('sm:max-w-lg');
        expect(dialog).not.toHaveClass('sm:max-w-sm');
    });

    it('does not apply width tokens on top and bottom sheets', () => {
        renderSheet({ side: 'top', width: 'lg' });

        expect(screen.getByRole('dialog')).not.toHaveClass('sm:max-w-lg');
    });
});

describe('Sheet block: header', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('[CLIENT-UI-TTL-003] / [FR-UI-TTL-001] names the dialog from the required title', () => {
        renderSheet({ title: 'Create job' });

        const dialog = screen.getByRole('dialog', { name: 'Create job' });
        expect(within(dialog).getByRole('heading', { name: 'Create job' })).toBeInTheDocument();
    });

    it('renders trailing header actions next to the title', () => {
        renderSheet({
            title: 'Nightly scrape',
            headerActions: <button type="button">Job actions</button>,
        });

        const dialog = screen.getByRole('dialog', { name: 'Nightly scrape' });
        expect(within(dialog).getByRole('button', { name: 'Job actions' })).toBeInTheDocument();
    });

    it('exposes an optional description to assistive tech without showing it', () => {
        renderSheet({
            title: 'Job details',
            description: 'Schedule and execution information for this job.',
        });

        const dialog = screen.getByRole('dialog', { name: 'Job details' });
        expect(dialog).toHaveAccessibleDescription('Schedule and execution information for this job.');
        expect(within(dialog).getByText('Schedule and execution information for this job.')).toHaveClass('sr-only');
    });
});
