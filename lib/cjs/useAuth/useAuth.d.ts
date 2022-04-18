import { ClientMetadata, ICognitoUserPoolData } from 'amazon-cognito-identity-js';
import { UserCred } from '../AuthStore/useAuthStore';
export interface AWSAttribute {
    Name: string;
    Value: string;
}
export declare function wrapErr<T>(f: (result: T) => void): (err: any, result: T) => void;
declare const useAuth: () => {
    initCognito: (poolData: ICognitoUserPoolData) => string | undefined;
    signIn: (email: string, password: string) => Promise<UserCred>;
    signUp: (email: string, password: string, customAttributes?: any[] | undefined) => Promise<string | {
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
    refreshToken: () => Promise<any>;
    userCred: UserCred | undefined;
    getConfig: () => {
        headers: {
            Authorization: string;
        };
    } | undefined;
    googleSignIn: (code: string, clientId: string, redirectURI: string) => Promise<unknown>;
    updateUserAttributes: (attributes: AWSAttribute[]) => Promise<any>;
    userAddWorkspace: (workspaceId: string) => Promise<any>;
};
export default useAuth;
