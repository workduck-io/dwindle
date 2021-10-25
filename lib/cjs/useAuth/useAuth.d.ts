import { ICognitoUserPoolData, ClientMetadata } from 'amazon-cognito-identity-js';
import { UserCred } from '../AuthStore/useAuthStore';
export declare function wrapErr<T>(f: (result: T) => void): (err: any, result: T) => void;
declare const useAuth: () => {
    initCognito: (poolData: ICognitoUserPoolData) => string | undefined;
    signIn: (email: string, password: string) => Promise<UserCred>;
    signUp: (email: string, password: string) => Promise<{
        email: string;
    }>;
    verifySignUp: (code: string, metadata?: ClientMetadata) => Promise<any>;
    resendCode: () => Promise<string>;
    forgotPassword: () => void;
    verifyForgotPassword: () => void;
    getUserDetails: () => {
        email: string;
    } | undefined;
    changePassword: () => void;
    signOut: () => Promise<string>;
    refreshToken: () => void;
    userCred: UserCred | undefined;
    getConfig: () => {
        headers: {
            Authorization: string;
        };
    } | undefined;
};
export default useAuth;
