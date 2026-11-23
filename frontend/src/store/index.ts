import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { createConversationSlice } from './slices/conversation';
import { createUserInterfaceSlice } from './slices/ui';
import { createUserSlice } from './slices/user';
import { Store } from './store.types';

// TODO: Look into skip ...state in set.
// https://zustand.docs.pmnd.rs/learn/guides/immutable-state-and-merging.html#immutable-state-and-merging

export const useStore = create<Store>()(
    devtools((set, get, store) => ({
        ...createUserSlice(set, get, store),
        ...createUserInterfaceSlice(set, get, store),
        ...createConversationSlice(set, get, store),
    }))
);
