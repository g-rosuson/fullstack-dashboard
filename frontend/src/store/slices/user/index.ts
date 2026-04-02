import { StateCreator } from 'zustand';

import { Store } from '../../store.types';
import { UserStore } from '../user/user.types';
import initUser from './user.state';
import { UserSlice } from './user.types';

export const createUserSlice: StateCreator<Store, [], [], UserSlice> = set => ({
    ...initUser,
    changeUser: (user: UserStore) => set(() => user),
    clearUser: () => set(() => initUser),
});
