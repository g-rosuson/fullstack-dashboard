import { BrowserRouter } from 'react-router-dom';

import AppSetup from '@/components/container/appSetup/AppSetup';
import Routes from '@/components/routing/routes/Routes';

import './stylesheets/global.css';

// TODO: Go over test strategy, are we relying to much on test-id's?
// TODO: - Avoid userEvent.click (not recommended)?
const App = () => {
    return (
        <AppSetup>
            <BrowserRouter>
                <Routes />
            </BrowserRouter>
        </AppSetup>
    );
};

export default App;
