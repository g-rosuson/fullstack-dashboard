import { BrowserRouter } from 'react-router-dom';

import AppSetup from '@/components/container/appSetup/AppSetup';
import Routes from '@/components/routing/routes/Routes';

import './stylesheets/global.css';

const App = () => {
    return (
        <AppSetup>
            <BrowserRouter>
                <Routes/>
            </BrowserRouter>
        </AppSetup>
    );
}

export default App;