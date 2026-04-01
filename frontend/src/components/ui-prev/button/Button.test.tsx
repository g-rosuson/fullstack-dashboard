import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Home } from '@/components/ui-prev/icons/Icons';

import Button from './Button';
import { BaseProps } from './Button.types';

/**
 * Renders the button with the given props into the JS-DOM and returns testing utilities.
 */
const renderButton = (baseProps?: Partial<BaseProps>, withIcon = false) => {
    const iconOrLabelProps = withIcon ? { icon: <Home />, ariaLabel: 'Icon button' } : { label: 'Button label' };

    return render(<Button testId="button" onClick={() => null} {...iconOrLabelProps} {...baseProps} />);
};

describe('Button component', () => {
    let onClickMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onClickMock = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // Test if the correct HTML button element is used
    it('its a HTML button element', () => {
        const { getByRole } = renderButton();
        expect(getByRole('button')).toBeInstanceOf(HTMLButtonElement);
    });

    // Test "aria-label" attribute
    it('sets "aria-label" with the "ariaLabel" prop when using an icon', () => {
        const { getByRole } = renderButton({}, true);
        expect(getByRole('button')).toHaveAttribute('aria-label', 'Icon button');
    });

    // Test the "aria-disabled" attribute
    it('sets "aria-disabled" to true when the disabled prop is true', () => {
        const { getByRole } = renderButton({ disabled: true });
        expect(getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('sets "aria-disabled" to true when the isLoading prop is true', () => {
        const { getByRole } = renderButton({ isLoading: true });
        expect(getByRole('button')).toHaveAttribute('aria-disabled', 'true');
    });

    // Test the "aria-busy" attribute
    it('sets "aria-busy" to true when the isLoading prop is true', () => {
        const { getByRole } = renderButton({ isLoading: true });
        expect(getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('sets "aria-busy" to false when the isLoading prop is false', () => {
        const { getByRole } = renderButton({ isLoading: false });
        expect(getByRole('button')).toHaveAttribute('aria-busy', 'false');
    });

    // Test the "aria-hidden" attribute
    it('sets "aria-hidden" to true when the hidden prop is true', () => {
        const { container } = renderButton({ hidden: true });
        const button = container.querySelector('button');
        expect(button).toHaveAttribute('aria-hidden', 'true');
    });

    it('sets "aria-hidden" to false when the hidden prop is false', () => {
        const { getByRole } = renderButton({ hidden: false });
        expect(getByRole('button')).toHaveAttribute('aria-hidden', 'false');
    });

    // Test the "label" prop
    it('renders the label', () => {
        const { getByRole } = renderButton();
        const button = getByRole('button');
        const label = within(button).getByText('Button label');
        expect(label).toHaveTextContent('Button label');
    });

    // Test the "icon" prop
    it('renders the icon when the "icon" prop is provided', () => {
        const { getByRole } = renderButton({}, true);
        const button = getByRole('button');
        const icon = within(button).getByTestId('icon');
        expect(icon).toBeInTheDocument();
    });

    // Test the "disabled" prop
    it('is disabled when "disabled" is true', () => {
        const { getByRole } = renderButton({ disabled: true });
        expect(getByRole('button')).toBeDisabled();
    });

    it('is enabled when "disabled" is false', () => {
        const { getByRole } = renderButton({ disabled: false });
        expect(getByRole('button')).not.toBeDisabled();
    });

    it('is enabled when "disabled" is undefined', () => {
        const { getByRole } = renderButton();
        expect(getByRole('button')).not.toBeDisabled();
    });

    // Test the "hidden" prop
    it('is hidden when "hidden" is true', () => {
        const { queryByRole } = renderButton({ hidden: true });
        expect(queryByRole('button')).toBeNull();
    });

    it('is visible when "hidden" is false', () => {
        const { getByRole } = renderButton({ hidden: false });
        expect(getByRole('button')).toBeVisible();
    });

    it('is visible when "hidden" is undefined', () => {
        const { getByRole } = renderButton();
        expect(getByRole('button')).toBeVisible();
    });

    // Test the "isLoading" prop
    it('shows spinner when "isLoading" is true', () => {
        const { container } = renderButton({ isLoading: true });
        const spinner = within(container).getByTestId('spinner');
        expect(spinner).toBeInTheDocument();
    });

    it('does not render children when "isLoading" is true', () => {
        const { container } = renderButton({ isLoading: true });
        expect(within(container).queryByText('Children')).toBeNull();
    });

    it('does not invoke the "onClick" callback function when "isLoading" is true', async () => {
        const { getByRole } = renderButton({ isLoading: true, onClick: onClickMock });
        await userEvent.click(getByRole('button'));
        expect(onClickMock).not.toHaveBeenCalled();
    });

    it('invokes the "onClick" callback function when "isLoading" is false', async () => {
        const { getByRole } = renderButton({ isLoading: false, onClick: onClickMock });
        await userEvent.click(getByRole('button'));
        expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    it('invokes the "onClick" callback function when "isLoading" is undefined', async () => {
        const { getByRole } = renderButton({ onClick: onClickMock });
        await userEvent.click(getByRole('button'));
        expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    // Test the "type" prop
    it('applies the "type" prop correctly', () => {
        const { getByRole } = renderButton({ type: 'reset' });
        expect(getByRole('button')).toHaveProperty('type', 'reset');
    });

    it('submits the form when type="submit"', async () => {
        const handleSubmitMock = vi.fn();

        render(
            <form onSubmit={handleSubmitMock}>
                <Button label="Button label" type="submit" onClick={() => null} />
            </form>
        );

        await userEvent.click(screen.getByRole('button'));
        expect(handleSubmitMock).toHaveBeenCalledTimes(1);
    });
});
