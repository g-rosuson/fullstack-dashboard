import Session from './session/Session';
import Store from './store/Store';
import Stream from './stream/Stream';
import Dashboard from '@/components/layout/dashboard/Dashboard';

const Setup = () => {
    return (
        <Session>
            <Store>
                <Stream>
                    <Dashboard />
                </Stream>
            </Store>
        </Session>
    );
};

export default Setup;
