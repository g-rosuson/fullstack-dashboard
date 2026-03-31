import { useStore } from '@/store';

export const useUserSelection = () => ({
    accessToken: useStore((store) => store.accessToken),
    firsName: useStore((store) => store.firstName),
    lastName: useStore((store) => store.lastName),
    email: useStore((store) => store.email),
    id: useStore((store) => store.id),
    changeUser: useStore((store) => store.changeUser),
    clearUser: useStore((store) => store.clearUser)
});