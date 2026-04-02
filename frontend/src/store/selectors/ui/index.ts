import { useStore } from '@/store';

export const useUserInterfaceSelection = () => ({
    theme: useStore(store => store.theme),
    isSidebarOpen: useStore(store => store.isSidebarOpen),
    setSidebarOpen: useStore(store => store.setSidebarOpen),
    changeTheme: useStore(store => store.changeTheme),
});
