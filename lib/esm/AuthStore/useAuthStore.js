import create from 'zustand';
import { persist } from 'zustand/middleware';
var useAuthStore = create(persist(function (set, get) { return ({
    userPool: undefined,
    user: undefined,
    userCred: undefined,
    email: undefined,
    setUserPool: function (userPool) { return set({ userPool: userPool }); },
    setUser: function (user) { return set({ user: user }); },
    setEmail: function (email) { return set({ email: email }); },
    getUserCred: function () {
        var uCred = get().userCred;
        return uCred;
    },
    setUserCred: function (userCred) {
        set({ userCred: userCred });
    },
    clearStore: function () {
        return set({
            user: undefined,
            userCred: undefined,
            email: undefined,
        });
    },
}); }, { name: 'auth-aws' }));
export default useAuthStore;
