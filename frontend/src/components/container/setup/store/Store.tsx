import { ReactNode } from 'react';

import Chat from './chat/Chat';
import Theme from './theme/Theme';

const Store = ({ children }: { children: ReactNode }) => {
    return (
        <Theme>
            <Chat>{children}</Chat>
        </Theme>
    );
};

export default Store;
