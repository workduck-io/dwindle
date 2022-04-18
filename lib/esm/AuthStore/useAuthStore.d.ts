import { CognitoUser, ICognitoUserPoolData } from 'amazon-cognito-identity-js';
export interface UserCred {
    email: string;
    userId: string;
    token: string;
    expiry: number;
    url: string;
    username: string;
}
export interface AuthStoreState {
    userPool: ICognitoUserPoolData | undefined;
    setUserPool: (userPool: ICognitoUserPoolData) => void;
    email: string | undefined;
    user: CognitoUser | undefined;
    setUser: (userPool: CognitoUser) => void;
    userCred: UserCred | undefined;
    getUserCred: () => UserCred | undefined;
    setUserCred: (userCred: UserCred) => void;
    setEmail: (email: string) => void;
    clearStore: () => void;
}
declare const useAuthStore: import("zustand").UseBoundStore<AuthStoreState, import("zustand").StoreApi<AuthStoreState>>;
export default useAuthStore;
