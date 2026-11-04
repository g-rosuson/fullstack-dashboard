import { ReactNode } from 'react';

import Conversation from './conversation/Conversation';
import Theme from './theme/Theme';

const Store = ({ children }: { children: ReactNode }) => {
    return (
        <Theme>
            <Conversation>{children}</Conversation>
        </Theme>
    );
};

export default Store;
