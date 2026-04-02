import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import { createUserInterfaceSlice } from './slices/ui';
import { createUserSlice } from './slices/user';
import { Store } from './store.types';

export const useStore = create<Store>()(
    devtools((set, get, store) => ({
        ...createUserSlice(set, get, store),
        ...createUserInterfaceSlice(set, get, store),
    }))
);
