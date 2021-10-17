import { ICognitoUserPoolData } from 'amazon-cognito-identity-js';
declare const useAuth: () => {
    initCognito: (poolData: ICognitoUserPoolData) => void;
    signIn: (email: string, password: string) => void;
    signUp: (email: string, password: string) => void;
    verifySignUp: () => void;
    resendCode: () => void;
    forgotPassword: () => void;
    verifyForgotPassword: () => void;
    getUserDetails: () => void;
    changePassword: () => void;
    signOut: () => void;
    refreshToken: () => void;
    userCred: import("../AuthStore/useAuthStore").UserCred | undefined;
    getConfig: () => {
        headers: {
            Authorization: string;
        };
    } | undefined;
    getClient: () => import("axios").AxiosInstance;
};
export default useAuth;
