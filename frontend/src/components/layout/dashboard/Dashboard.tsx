import { Outlet } from 'react-router-dom';

import Sidebar from '../sidebar/Sidebar';
import TopBar from '../topBar/TopBar';

const Dashboard = () => {
    const containerClassName = 'flex overflow-hidden';
    const wrapperClassName = 'flex-1 overflow-y-auto';
    const outletClassName = 'ml-4';

    return (
        <div className={containerClassName}>
            <Sidebar />

            <main className={wrapperClassName}>
                <TopBar />

                <section className={outletClassName}>
                    <Outlet />
                </section>
            </main>
        </div>
    );
};

export default Dashboard;
