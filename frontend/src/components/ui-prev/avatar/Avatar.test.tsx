import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Avatar from './Avatar';
import { Props } from './Avatar.types';

/**
 * Renders the avatar with the given props into the JS-DOM and returns testing utilities.
 */
const setupAvatar = ({ email, onClick }: Props) => {
    return render(<Avatar email={email} onClick={onClick}/>);
};

describe('Avatar component', () => {
    const mockEmail = 'email@domain.com';
    let onClickMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        onClickMock = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('its a HTML button element', () => {
        const { getByRole } = setupAvatar({ email: mockEmail, onClick: onClickMock });
        expect(getByRole('button')).toBeInstanceOf(HTMLButtonElement);
    });

    it('its has an appropriate aria-label', () => {
        const { getByRole } = setupAvatar({ email: mockEmail, onClick: onClickMock });
        const button = getByRole('button');
        expect(button).toHaveAttribute('aria-label', 'user avatar');
    });

    it('renders and capitalizes the first letter of the email', () => {
        const { getByRole } = setupAvatar({ email: mockEmail, onClick: onClickMock });
        expect(getByRole('button')).toHaveTextContent('E');
    });

    it('invokes the "onClick" callback function when clicked', async () => {
        const { getByRole } = setupAvatar({ email: mockEmail, onClick: onClickMock });
        await userEvent.click(getByRole('button'));
        expect(onClickMock).toHaveBeenCalledTimes(1);
    })
});