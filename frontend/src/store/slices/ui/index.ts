import { StateCreator } from 'zustand';

import { Store } from '../../store.types';
import { UserInterfaceSlice } from './ui.types';
import { Theme } from '@/shared/types/theme';

export const createUserInterfaceSlice: StateCreator<Store, [], [], UserInterfaceSlice> = set => {
    return {
        theme: 'dark',
        isSidebarOpen: true,
        setSidebarOpen: (open: boolean) => set(() => ({ isSidebarOpen: open })),
        changeTheme: (theme: Theme) => set(() => ({ theme })),
    };
};
