import { Toaster } from '@/components/blocks/toast/Toast';
import AppSetup from '@/components/container/appSetup/AppSetup';
import Router from '@/components/routing/router/Router';

import './stylesheets/global.css';

// TODO: Use css vars and TW utils for breakpoints

// TODO: How do we handle variant ('success' | 'destructive' | 'warning' | 'primary' | 'muted' etc) mapping/typing?

// TODO: Look into autoCapitalize prop for title/heading components
// TODO: Only use "Title" naming for title/heading components?
// TODO: Radix uses "as" to render the correct heading tag, use this approach?

// TODO: Refine color palette's in dark and light mode

// TODO: Implement a strategy to handle content shift in modals and sheets
// TODO: - Always pop out instead of fade?

// TODO: Go over test strategy, are we relying to much on test-id's?
// TODO: - Avoid userEvent.click (not recommended)?
const App = () => {
    return (
        <AppSetup>
            <Toaster>
                <Router />
            </Toaster>
        </AppSetup>
    );
};

export default App;
