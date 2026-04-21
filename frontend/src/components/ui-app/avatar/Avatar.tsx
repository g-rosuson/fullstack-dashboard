import DropdownMenu from '../dropdownMenu/DropdownMenu';

import { Props } from './Avatar.types';
import { Avatar as ShadcnAvatar, AvatarFallback } from '@/components/ui/avatar';

const Avatar = ({ email, actions }: Props) => {
    // Determine the first letter of the email
    const firstLetter = email.toUpperCase()[0];

    // Determine the trigger
    const trigger = (
        <ShadcnAvatar aria-label="User avatar" className="cursor-pointer transition-opacity hover:opacity-90">
            <AvatarFallback className="bg-primary text-l font-semibold text-primary-foreground">
                {firstLetter}
            </AvatarFallback>
        </ShadcnAvatar>
    );

    return <DropdownMenu dropdownItems={actions} trigger={trigger} />;
};

export default Avatar;
