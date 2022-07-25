"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var zustand_1 = __importDefault(require("zustand"));
var middleware_1 = require("zustand/middleware");
var useAuthStore = (0, zustand_1.default)((0, middleware_1.persist)(function (set, get) { return ({
    userPool: undefined,
    // user: undefined,
    userCred: undefined,
    email: undefined,
    setUserPool: function (userPool) { return set({ userPool: userPool }); },
    // setUser: (user) => set({ user }),
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
            // user: undefined,
            userCred: undefined,
            email: undefined,
        });
    },
}); }, { name: 'auth-aws' }));
exports.default = useAuthStore;
