"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapErr = void 0;
var amazon_cognito_identity_js_1 = require("amazon-cognito-identity-js");
var jwt_decode_1 = __importDefault(require("jwt-decode"));
var react_1 = require("react");
var useAuthStore_1 = __importDefault(require("../AuthStore/useAuthStore"));
var AWSRegion = 'us-east-1';
var WorkspaceIDsAttrName = 'custom:mex_workspace_ids';
function wrapErr(f) {
    return function (err, result) {
        if (err) {
            console.error({ error: JSON.stringify(err) });
            return;
        }
        else
            f(result);
    };
}
exports.wrapErr = wrapErr;
var useAuth = function () {
    var uPool = (0, useAuthStore_1.default)(function (store) { return store.userPool; });
    var email = (0, useAuthStore_1.default)(function (store) { return store.email; });
    var setUserPool = (0, useAuthStore_1.default)(function (store) { return store.setUserPool; });
    var setUser = (0, useAuthStore_1.default)(function (store) { return store.setUser; });
    var setEmail = (0, useAuthStore_1.default)(function (store) { return store.setEmail; });
    // Needs to handle automatic refreshSession
    var setUserCred = (0, useAuthStore_1.default)(function (store) { return store.setUserCred; });
    var userCred = (0, useAuthStore_1.default)(function (store) { return store.userCred; });
    var clearStore = (0, useAuthStore_1.default)(function (store) { return store.clearStore; });
    var initCognito = function (poolData) {
        setUserPool(poolData);
        if (userCred) {
            return userCred.email;
        }
        return;
    };
    // Handles refreshing of the token on every update of UserCred
    // client also refreshes the token if a request returns 401
    (0, react_1.useEffect)(function () {
        var now = Math.floor(Date.now() / 1000);
        if (userCred) {
            if (userCred.expiry < now)
                refreshToken();
        }
    }, [userCred]);
    var googleSignIn = function (idToken) {
        return new Promise(function (resolve, reject) {
            try {
                var decodedIdToken = (0, jwt_decode_1.default)(idToken);
                console.log('Decoded token', { decodedIdToken: decodedIdToken });
                var nUCred = {
                    email: decodedIdToken.email,
                    userId: decodedIdToken.sub,
                    expiry: decodedIdToken.exp,
                    token: idToken,
                    username: decodedIdToken['cognito:username'],
                    url: decodedIdToken.iss,
                };
                setUserCred(nUCred);
                resolve(nUCred);
            }
            catch (error) {
                reject(error.message || JSON.stringify(error));
            }
        });
    };
    var signIn = function (email, password) {
        return new Promise(function (resolve, reject) {
            var authData = {
                Username: email,
                Password: password,
            };
            var authDetails = new amazon_cognito_identity_js_1.AuthenticationDetails(authData);
            if (uPool) {
                var userPool_1 = new amazon_cognito_identity_js_1.CognitoUserPool(uPool);
                var user = new amazon_cognito_identity_js_1.CognitoUser({ Username: email, Pool: userPool_1 });
                user.authenticateUser(authDetails, {
                    onSuccess: function (result) {
                        var idToken = result.getIdToken().getJwtToken();
                        // const accessToken = result.getAccessToken().getJwtToken()
                        var payload = result.getIdToken().payload;
                        var expiry = result.getIdToken().getExpiration();
                        var nUCred = {
                            email: email,
                            username: email,
                            userId: payload.sub,
                            expiry: expiry,
                            token: idToken,
                            url: "cognito-idp." + AWSRegion + ".amazonaws.com/" + userPool_1.getUserPoolId(),
                        };
                        setUserCred(nUCred);
                        resolve(nUCred);
                    },
                    onFailure: function (err) {
                        reject(err.message || JSON.stringify(err));
                    },
                });
            }
        });
    };
    var refreshToken = function () {
        if (userCred) {
            if (uPool) {
                console.log('refreshingToken1', { userCred: userCred, uPool: uPool });
                var userPool = new amazon_cognito_identity_js_1.CognitoUserPool(uPool);
                var nuser_1 = new amazon_cognito_identity_js_1.CognitoUser({ Username: userCred.username, Pool: userPool });
                nuser_1.getSession(wrapErr(function (sess) {
                    if (sess) {
                        var refreshToken_1 = sess.getRefreshToken();
                        nuser_1.refreshSession(refreshToken_1, function (err, session) {
                            if (err) {
                                console.log('refreshingToken', { refreshToken_: refreshToken_1 });
                                console.log(err);
                            }
                            else {
                                var token = session.getIdToken().getJwtToken();
                                var payload = session.getIdToken().payload;
                                var expiry = session.getIdToken().getExpiration();
                                console.log('refreshingToken', { refreshToken_: refreshToken_1, token: token, payload: payload, expiry: expiry });
                                setUserCred({
                                    email: userCred.email,
                                    username: userCred.username,
                                    url: userCred.url,
                                    token: token,
                                    expiry: expiry,
                                    userId: payload.sub,
                                });
                            }
                        });
                    }
                }));
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
    var signUp = function (email, password, customAttributes) {
        return new Promise(function (resolve, reject) {
            var attributeEmail = new amazon_cognito_identity_js_1.CognitoUserAttribute({ Name: 'email', Value: email });
            var attributeList = [attributeEmail];
            if (customAttributes !== undefined && customAttributes.length > 0) {
                customAttributes.forEach(function (item) {
                    var name = "custom:" + item.name;
                    var value = item.value;
                    var t = new amazon_cognito_identity_js_1.CognitoUserAttribute({
                        Name: name,
                        Value: value,
                    });
                    attributeList.push(t);
                });
            }
            console.log('Attribute List: ', attributeList);
            if (uPool) {
                var userPool = new amazon_cognito_identity_js_1.CognitoUserPool(uPool);
                userPool.signUp(email, password, attributeList, [], function (err, result) {
                    if (err) {
                        if (err.name === 'UsernameExistsException') {
                            setEmail(email);
                        }
                        reject(err);
                    }
                    if (result) {
                        var cognitoUser = result.user;
                        setEmail(email);
                        setUser(cognitoUser);
                        resolve({ email: email });
                    }
                });
            }
        });
    };
    var verifySignUp = function (code, metadata) {
        return new Promise(function (resolve, reject) {
            if (email) {
                if (uPool) {
                    var userPool = new amazon_cognito_identity_js_1.CognitoUserPool(uPool);
                    var nuser = new amazon_cognito_identity_js_1.CognitoUser({ Username: email, Pool: userPool });
                    nuser.confirmRegistration(code, true, function (err, result) {
                        if (err) {
                            reject('VerifySignUp Failed');
                        }
                        if (result) {
                            resolve({ result: result });
                        }
                    }, metadata);
                }
            }
        });
    };
    var resendCode = function () {
        return new Promise(function (resolve, reject) {
            if (email) {
                if (uPool) {
                    var userPool = new amazon_cognito_identity_js_1.CognitoUserPool(uPool);
                    var nuser = new amazon_cognito_identity_js_1.CognitoUser({ Username: email, Pool: userPool });
                    nuser.resendConfirmationCode(function (err, result) {
                        if (err)
                            reject(err);
                        if (result) {
                            console.log({ result: result });
                            resolve('sent successfully');
                        }
                    });
                }
            }
        });
    };
    var forgotPassword = function () { };
    var verifyForgotPassword = function () { };
    var getUserDetails = function () {
        if (userCred) {
            return { email: userCred.email };
        }
        return;
    };
    var changePassword = function () {
        /*if (user)
          user.changePassword(
            oldPassword,
            newPassword,
            wrapErr((result) => console.log({ result }))
          ) */
    };
    var signOut = function () {
        return new Promise(function (resolve, reject) {
            try {
                if (uPool && userCred) {
                    var userPool = new amazon_cognito_identity_js_1.CognitoUserPool(uPool);
                    var nuser = new amazon_cognito_identity_js_1.CognitoUser({ Username: userCred.username, Pool: userPool });
                    nuser.signOut(function () {
                        clearStore();
                        resolve('Signout Successful');
                    });
                }
            }
            catch (_a) {
                reject('Signout Failed');
            }
        });
    };
    var updateUserAttributes = function (attributes) {
        return new Promise(function (resolve, reject) {
            try {
                if (userCred) {
                    if (uPool) {
                        var userPool = new amazon_cognito_identity_js_1.CognitoUserPool(uPool);
                        var nuser_2 = new amazon_cognito_identity_js_1.CognitoUser({ Username: userCred.username, Pool: userPool });
                        nuser_2.getSession(wrapErr(function (sess) {
                            var attrs = attributes.map(function (attribute) {
                                if (!attribute.Name.startsWith('custom:'))
                                    attribute.Name = "custom:" + attribute.Name;
                                if (attribute.Name === WorkspaceIDsAttrName)
                                    reject('To update workspace Id, use the userAddWorkspace method ');
                                return new amazon_cognito_identity_js_1.CognitoUserAttribute(attribute);
                            });
                            if (sess) {
                                nuser_2.updateAttributes(attrs, function (err, result) {
                                    if (err)
                                        throw new Error(err.message);
                                    resolve(result);
                                });
                            }
                        }));
                    }
                }
                resolve(attributes);
            }
            catch (error) {
                reject(error);
            }
        });
    };
    var userAddWorkspace = function (workspaceId) {
        return new Promise(function (resolve, reject) {
            try {
                if (userCred) {
                    if (uPool) {
                        var userPool = new amazon_cognito_identity_js_1.CognitoUserPool(uPool);
                        var nuser_3 = new amazon_cognito_identity_js_1.CognitoUser({ Username: userCred.username, Pool: userPool });
                        nuser_3.getSession(
                        // @ts-ignore
                        wrapErr(function (sess) {
                            nuser_3.getUserAttributes(function (err, result) {
                                if (err)
                                    reject("Error: " + err.message);
                                result === null || result === void 0 ? void 0 : result.forEach(function (attr) {
                                    if (attr.Name === WorkspaceIDsAttrName) {
                                        var newWorkspaceIDs = attr.Value + "#" + workspaceId;
                                        console.log('Got existing WorkspaceIDs', newWorkspaceIDs);
                                        var t = new amazon_cognito_identity_js_1.CognitoUserAttribute({
                                            Name: WorkspaceIDsAttrName,
                                            Value: newWorkspaceIDs,
                                        });
                                        // @ts-ignore
                                        nuser_3.updateAttributes([t], function (err, result) {
                                            if (err)
                                                reject("Error: " + err.message);
                                            resolve('WorkspaceID Added Successfully');
                                        });
                                    }
                                });
                            });
                        }));
                    }
                }
            }
            catch (error) {
                reject(error);
            }
        });
    };
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
        googleSignIn: googleSignIn,
        updateUserAttributes: updateUserAttributes,
        userAddWorkspace: userAddWorkspace,
    };
};
exports.default = useAuth;
