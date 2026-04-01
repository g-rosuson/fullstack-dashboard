import { Props } from './Avatar.types';

const Avatar = ({ email, onClick }: Props) => {
    const firstLetter = email.toUpperCase()[0];
    const avatarClassName =
        'inline-flex items-center justify-center rounded-full bg-primary px-3 py-3 transition-colors duration-200 hover:bg-primary/90 focus:outline-1 focus:outline-primary focus:outline-offset-1';
    const labelClassName = 'text-xl font-semibold text-primary-foreground';

    return (
        <button className={avatarClassName} data-testid="avatar" aria-label="user avatar" onClick={onClick}>
            <span className={labelClassName}>{firstLetter}</span>
        </button>
    );
};

export default Avatar;
