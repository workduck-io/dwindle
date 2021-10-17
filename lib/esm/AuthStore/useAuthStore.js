import create from 'zustand';
import { persist } from 'zustand/middleware';
var useAuthStore = create(persist(function (set) { return ({
    userPool: undefined,
    user: undefined,
    userCred: undefined,
    setUserPool: function (userPool) { return set({ userPool: userPool }); },
    setUser: function (user) { return set({ user: user }); },
    setUserCred: function (userCred) { return set({ userCred: userCred }); },
}); }, { name: 'auth-aws' }));
export default useAuthStore;
