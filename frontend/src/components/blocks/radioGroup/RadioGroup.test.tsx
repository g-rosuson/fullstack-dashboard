import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach } from 'vitest';

import RadioGroup from './RadioGroup';

const items = [
    { value: 'idle', label: 'Active', description: 'The job can run' },
    { value: 'paused', label: 'Paused' },
] as const;

type StatusValue = (typeof items)[number]['value'];

const defaultProps = {
    label: 'Status',
    name: 'status',
    value: 'idle' as StatusValue,
    items,
    onChange: vi.fn(),
};

const stubResizeObserver = () => {
    class ResizeObserverMock {
        observe() {}
        unobserve() {}
        disconnect() {}
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
};

const renderRadioGroup = (props: Partial<typeof defaultProps> & { disabled?: boolean; error?: string } = {}) => {
    const { onChange, ...rest } = props;
    return render(<RadioGroup<StatusValue> {...defaultProps} {...rest} onChange={onChange ?? defaultProps.onChange} />);
};

describe('RadioGroup block: label', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it('[CLIENT-UI-FRM-002] / [FR-UI-FRM-002] names the group and each option from its label', () => {
        stubResizeObserver();
        renderRadioGroup();

        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Active' })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: 'Paused' })).toBeInTheDocument();
    });

    it('shows an optional description with an option', () => {
        stubResizeObserver();
        renderRadioGroup();

        expect(screen.getByText('The job can run')).toBeInTheDocument();
    });
});

describe('RadioGroup block: value', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it('checks the option that matches value', () => {
        stubResizeObserver();
        renderRadioGroup({ value: 'paused' });

        expect(screen.getByRole('radio', { name: 'Paused' })).toBeChecked();
        expect(screen.getByRole('radio', { name: 'Active' })).not.toBeChecked();
    });

    it('calls onChange with the chosen value', async () => {
        stubResizeObserver();
        const onChange = vi.fn();
        renderRadioGroup({ onChange });

        await userEvent.click(screen.getByRole('radio', { name: 'Paused' }));

        expect(onChange).toHaveBeenCalledWith('paused');
    });
});

describe('RadioGroup block: invalid and disabled', () => {
    afterEach(() => {
        vi.clearAllMocks();
        vi.unstubAllGlobals();
    });

    it('[CLIENT-UI-FRM-003] / [FR-UI-FRM-003] shows a field error and marks the group invalid', () => {
        stubResizeObserver();
        renderRadioGroup({ error: 'Pick a status' });

        expect(screen.getByRole('alert')).toHaveTextContent('Pick a status');
        expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-invalid', 'true');
    });

    it('[CLIENT-UI-ACT-004] / [FR-UI-ACT-004] prevents interaction when disabled is true', () => {
        stubResizeObserver();
        renderRadioGroup({ disabled: true });

        expect(screen.getByRole('radio', { name: 'Active' })).toBeDisabled();
        expect(screen.getByRole('radio', { name: 'Paused' })).toBeDisabled();
    });
});
