import { Theme } from '@/shared/types/theme';

type UserInterface = {
    theme: Theme;
    isSidebarOpen: boolean;
};

interface UserInterfaceSlice extends UserInterface {
    changeTheme: (theme: Theme) => void;
    setSidebarOpen: (open: boolean) => void;
}

export type { UserInterface, UserInterfaceSlice };
