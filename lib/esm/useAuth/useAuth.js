var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import { CognitoUserPool, CognitoUserAttribute, AuthenticationDetails, CognitoUser, } from 'amazon-cognito-identity-js';
import useAuthStore from '../AuthStore/useAuthStore';
import { useEffect } from 'react';
import axios from 'axios';
var AWSRegion = 'us-east-1';
function wrapErr(f) {
    return function (err, result) {
        if (err) {
            console.log({ error: JSON.stringify(err) });
            return;
        }
        else
            f(result);
    };
}
var useAuth = function () {
    var uPool = useAuthStore(function (store) { return store.userPool; });
    var setUserPool = useAuthStore(function (store) { return store.setUserPool; });
    var setUser = useAuthStore(function (store) { return store.setUser; });
    // Needs to handle automatic refreshSession
    var setUserCred = useAuthStore(function (store) { return store.setUserCred; });
    var userCred = useAuthStore(function (store) { return store.userCred; });
    var initCognito = function (poolData) {
        setUserPool(poolData);
        // init with pool
        // fetch user from localStorage
        // refresh login token if necessary
    };
    useEffect(function () {
        var now = Math.floor(Date.now() / 1000);
        if (userCred) {
            if (userCred.expiry < now)
                refreshToken();
        }
    }, [userCred]);
    var signIn = function (email, password) {
        var authData = {
            Username: email,
            Password: password,
        };
        var authDetails = new AuthenticationDetails(authData);
        if (uPool) {
            var userPool_1 = new CognitoUserPool(uPool);
            var user = new CognitoUser({ Username: email, Pool: userPool_1 });
            user.authenticateUser(authDetails, {
                onSuccess: function (result) {
                    var accessToken = result.getAccessToken().getJwtToken();
                    var expiry = result.getAccessToken().getExpiration();
                    //POTENTIAL: Region needs to be set if not already set previously elsewhere.
                    //AWS.config.region = '<region>'
                    //
                    setUserCred({
                        email: email,
                        expiry: expiry,
                        token: accessToken,
                        url: "cognito-idp." + AWSRegion + ".amazonaws.com/" + userPool_1.getUserPoolId(),
                    });
                    /* AWS.config.credentials = new AWS.CognitoIdentityCredentials({
                      IdentityPoolId: '...', // your identity pool id here
                      Logins: {
                        // Change the key below according to the specific region your user pool is in.
                        'cognito-idp.<region>.amazonaws.com/<YOUR_USER_POOL_ID>': result.getIdToken().getJwtToken(),
                      },
                    }) */
                },
                onFailure: function (err) {
                    alert(err.message || JSON.stringify(err));
                },
            });
        }
    };
    var getClient = function () {
        var API = axios.create();
        API.interceptors.request.use(function (request) {
            if (request && request.headers && userCred && userCred.token) {
                request.headers['Authorization'] = "Bearer " + userCred.token;
            }
            return request;
        });
        API.interceptors.response.use(undefined, function (error) { return __awaiter(void 0, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                response = error.response;
                if (response) {
                    if (response.status === 401 && error.config && !error.config.__isRetryRequest) {
                        try {
                            refreshToken();
                        }
                        catch (authError) {
                            // refreshing has failed, but report the original error, i.e. 401
                            return [2 /*return*/, Promise.reject(error)];
                        }
                        // retry the original request
                        error.config.__isRetryRequest = true;
                        return [2 /*return*/, API(error.config)];
                    }
                }
                return [2 /*return*/, Promise.reject(error)];
            });
        }); });
        return API;
    };
    var refreshToken = function () {
        if (userCred) {
            var now = Math.floor(Date.now() / 1000);
            console.log('We will refresh', userCred, { time: now }, uPool);
            if (uPool) {
                var userPool = new CognitoUserPool(uPool);
                var nuser_1 = new CognitoUser({ Username: userCred.email, Pool: userPool });
                //if (now >= userCred.expiry) {
                nuser_1.getSession(wrapErr(function (sess) {
                    if (sess) {
                        var refreshToken_1 = sess.getRefreshToken();
                        nuser_1.refreshSession(refreshToken_1, function (err, session) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                var token = session.getAccessToken().getJwtToken();
                                var expiry = session.getAccessToken().getExpiration();
                                console.log('We got that fresh token here', {
                                    email: userCred.email,
                                    url: userCred.url,
                                    token: token,
                                    expiry: expiry,
                                });
                                setUserCred({ email: userCred.email, url: userCred.url, token: token, expiry: expiry });
                            }
                        });
                    }
                }));
                //}
            }
        }
    };
    var getConfig = function () {
        if (userCred) {
            return {
                headers: { Authorization: "Bearer " + userCred.token },
            };
        }
        return undefined;
    };
    var signUp = function (email, password) {
        var attributeEmail = new CognitoUserAttribute({ Name: 'email', Value: email });
        var attributeList = [attributeEmail];
        if (uPool) {
            var userPool = new CognitoUserPool(uPool);
            userPool.signUp(email, password, attributeList, [], wrapErr(function (result) {
                if (result) {
                    var cognitoUser = result.user;
                    setUser(cognitoUser);
                }
            }));
        }
    };
    var verifySignUp = function () {
        /* if (user) {
          user.confirmRegistration(
            code,
            true,
            wrapErr((result) => {
              if (result) {
                console.log({ result })
              }
            })
          )
        } */
    };
    var resendCode = function () {
        //if (user) user.resendConfirmationCode(wrapErr((result) => console.log({ result })))
    };
    var forgotPassword = function () { };
    var verifyForgotPassword = function () { };
    var getUserDetails = function () { };
    var changePassword = function () {
        /*if (user)
          user.changePassword(
            oldPassword,
            newPassword,
            wrapErr((result) => console.log({ result }))
          ) */
    };
    var signOut = function () { };
    return {
        initCognito: initCognito,
        signIn: signIn,
        signUp: signUp,
        verifySignUp: verifySignUp,
        resendCode: resendCode,
        forgotPassword: forgotPassword,
        verifyForgotPassword: verifyForgotPassword,
        getUserDetails: getUserDetails,
        changePassword: changePassword,
        signOut: signOut,
        refreshToken: refreshToken,
        userCred: userCred,
        getConfig: getConfig,
        getClient: getClient,
    };
};
export default useAuth;
