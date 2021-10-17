import { CognitoUser, ICognitoUserPoolData } from 'amazon-cognito-identity-js';
export interface UserCred {
    email: string;
    token: string;
    expiry: number;
    url: string;
}
export interface AuthStoreState {
    userPool: ICognitoUserPoolData | undefined;
    setUserPool: (userPool: ICognitoUserPoolData) => void;
    user: CognitoUser | undefined;
    setUser: (userPool: CognitoUser) => void;
    userCred: UserCred | undefined;
    setUserCred: (userCred: UserCred) => void;
}
declare const useAuthStore: import("zustand").UseStore<AuthStoreState>;
export default useAuthStore;
