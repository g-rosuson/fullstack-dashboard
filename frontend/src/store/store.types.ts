import { UserInterfaceSlice } from './slices/ui/ui.types';
import { UserSlice } from './slices/user/user.types';

export type Store = UserSlice & UserInterfaceSlice;
