import DropdownMenu from '@/components/blocks/dropdownMenu/DropdownMenu';

import type { AvatarProps } from './Avatar.types';

import { Avatar as AvatarPrimitive, AvatarFallback } from '@/components/ui/avatar';

/**
 * Composes the shadcn avatar with a product content model: email identity and account actions.
 */
const Avatar = ({ email, actions }: AvatarProps) => {
    const firstLetter = email.toUpperCase()[0];

    const trigger = (
        <AvatarPrimitive aria-label="User avatar" className="cursor-pointer transition-opacity hover:opacity-90">
            <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                {firstLetter}
            </AvatarFallback>
        </AvatarPrimitive>
    );

    return <DropdownMenu items={actions} trigger={trigger} />;
};

export default Avatar;

export type { AvatarProps } from './Avatar.types';
