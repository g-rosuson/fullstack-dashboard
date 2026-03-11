import { NavLink } from 'react-router-dom';
import { useUserInterfaceSelection } from 'store/selectors/ui';

import Button from 'components/UI/button/Button';
import { Home, SidebarClose, Suitcase } from 'components/UI/icons/Icons';

import config from 'config';    

import styling from './Sidebar.module.scss';

const Sidebar = () => {
    // Store selectors
    const { isSidebarOpen, toggleSidebar } = useUserInterfaceSelection();

    
    /**
     * Returns a CSS link class based on whether the
     * corresponding link path is active or idle.
     */
    const getLinkClass = ({ isActive }: { isActive: boolean }) => {
        if (isActive) {
            return styling.linkActive;
        }

        return styling.link;
    }


    // Determine side-bar items
    const sidebarNavItems = [
        {
            label: 'Home',
            icon: <Home thick/>,
            route: config.routes.root
        },
        {
            label: 'Jobs',
            icon: <Suitcase thick/>,
            route: config.routes.jobs
        }
    ];  


    return (
        <aside
            data-testid="sidebar"
            className={isSidebarOpen ? styling.open : styling.close}
            aria-hidden={isSidebarOpen === false}
            aria-label='Sidebar'
        >
            <div className={styling.header}>
                <Button
                    testId='close-sidebar-btn'
                    icon={<SidebarClose thick/>}
                    ariaLabel='Close sidebar'
                    onClick={toggleSidebar}
                    inline
                />
            </div>
           
            <nav>
                <ul className={styling.wrapper}>
                    {sidebarNavItems.map(item => (
                        <li key={item.label}>
                            <NavLink to={item.route} className={getLinkClass}>
                                <div className={styling.icon}>{item.icon}</div>

                                <span className={styling.label}>
                                    {item.label}
                                </span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;