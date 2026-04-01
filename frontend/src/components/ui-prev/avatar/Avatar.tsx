import { Props } from './Avatar.types';
import { Avatar as ShadcnAvatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Avatar = ({ email, actions }: Props) => {
    const firstLetter = email.toUpperCase()[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                data-testid="avatar"
                aria-label="user avatar"
                className="rounded-full focus:outline-1 focus:outline-primary focus:outline-offset-1">
                <ShadcnAvatar className="cursor-pointer transition-opacity hover:opacity-90">
                    <AvatarFallback className="bg-primary text-xl font-semibold text-primary-foreground">
                        {firstLetter}
                    </AvatarFallback>
                </ShadcnAvatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {actions.map(({ label, icon, action }) => (
                    <DropdownMenuItem key={label} onClick={action}>
                        {icon}
                        {label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default Avatar;
