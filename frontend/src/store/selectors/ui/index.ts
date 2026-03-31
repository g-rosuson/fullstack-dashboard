import { useStore } from '@/store';

export const useUserInterfaceSelection = () => ({
    theme: useStore(store => store.theme),
    isSidebarOpen: useStore(store => store.isSidebarOpen),
    toggleSidebar: useStore(store => store.toggleSidebar),
    changeTheme: useStore(store => store.changeTheme)
});