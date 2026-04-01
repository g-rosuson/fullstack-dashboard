import { Outlet } from 'react-router-dom';

import Sidebar from '../sidebar/Sidebar';
import TopBar from '../topBar/TopBar';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useUserInterfaceSelection } from '@/store/selectors/ui';

const Dashboard = () => {
    const { isSidebarOpen, setSidebarOpen } = useUserInterfaceSelection();

    const wrapperClassName = 'overflow-y-auto';
    const outletClassName = 'ml-4';

    return (
        <SidebarProvider open={isSidebarOpen} onOpenChange={setSidebarOpen}>
            <Sidebar />

            <SidebarInset className={wrapperClassName}>
                <TopBar />

                <section className={outletClassName}>
                    <Outlet />
                </section>
            </SidebarInset>
        </SidebarProvider>
    );
};

export default Dashboard;
