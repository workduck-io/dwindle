import { AuthenticationDetails, CognitoAccessToken, CognitoIdToken, CognitoRefreshToken, CognitoUser, CognitoUserAttribute, CognitoUserPool, CognitoUserSession, } from 'amazon-cognito-identity-js';
import jwtDecode from 'jwt-decode';
import { useEffect } from 'react';
import useAuthStore from '../AuthStore/useAuthStore';
import axios from 'axios';
import qs from 'qs';
var AWSRegion = 'us-east-1';
var WorkspaceIDsAttrName = 'custom:mex_workspace_ids';
export function wrapErr(f) {
    return function (err, result) {
        if (err) {
            return;
        }
        else
            f(result);
    };
}
var useAuth = function () {
    var uPool = useAuthStore(function (store) { return store.userPool; });
    var email = useAuthStore(function (store) { return store.email; });
    var setUserPool = useAuthStore(function (store) { return store.setUserPool; });
    var setUser = useAuthStore(function (store) { return store.setUser; });
    var setEmail = useAuthStore(function (store) { return store.setEmail; });
    // Needs to handle automatic refreshSession
    var setUserCred = useAuthStore(function (store) { return store.setUserCred; });
    var userCred = useAuthStore(function (store) { return store.userCred; });
    var getUserCred = useAuthStore(function (store) { return store.getUserCred; });
    var clearStore = useAuthStore(function (store) { return store.clearStore; });
    var initCognito = function (poolData) {
        setUserPool(poolData);
        if (userCred) {
            return userCred.email;
        }
        return;
    };
    // Handles refreshing of the token on every update of UserCred
    // client also refreshes the token if a request returns 401
    useEffect(function () {
        var now = Math.floor(Date.now() / 1000);
        if (userCred) {
            if (userCred.expiry < now)
                refreshToken();
        }
    }, [userCred]);
    var googleSignIn = function (code, clientId, redirectURI) {
        return new Promise(function (resolve, reject) {
            try {
                var dataPayload = qs.stringify({
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    redirect_uri: redirectURI,
                    code: code,
                });
                var config = {
                    method: 'post',
                    url: 'https://workduck.auth.us-east-1.amazoncognito.com/oauth2/token',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Cookie: 'XSRF-TOKEN=c393745c-a0fa-4858-9777-897c3aff4fbc',
                    },
                    data: dataPayload,
                };
                axios(config)
                    .then(function (response) {
                    var tripletTokens = response.data;
                    var decodedIdToken = jwtDecode(tripletTokens === null || tripletTokens === void 0 ? void 0 : tripletTokens.id_token);
                    var nUCred = {
                        email: decodedIdToken.email,
                        userId: decodedIdToken.sub,
                        expiry: decodedIdToken.exp,
                        token: tripletTokens === null || tripletTokens === void 0 ? void 0 : tripletTokens.id_token,
                        username: decodedIdToken['cognito:username'],
                        url: decodedIdToken.iss,
                    };
                    if (uPool) {
                        var userPool = new CognitoUserPool(uPool);
                        var nuser = new CognitoUser({ Username: nUCred.username, Pool: userPool });
                        var uSession = new CognitoUserSession({
                            AccessToken: new CognitoAccessToken({ AccessToken: tripletTokens.access_token }),
                            IdToken: new CognitoIdToken({ IdToken: tripletTokens.id_token }),
                            RefreshToken: new CognitoRefreshToken({ RefreshToken: tripletTokens.refresh_token }),
                        });
                        nuser.setSignInUserSession(uSession);
                    }
                    setUserCred(nUCred);
                    resolve({
                        userCred: nUCred,
                        tokens: tripletTokens,
                    });
                })
                    .catch(function (error) {
                    reject(error.message || JSON.stringify(error));
                });
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
            var authDetails = new AuthenticationDetails(authData);
            if (uPool) {
                var userPool_1 = new CognitoUserPool(uPool);
                var user = new CognitoUser({ Username: email, Pool: userPool_1 });
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
                            url: "cognito-idp.".concat(AWSRegion, ".amazonaws.com/").concat(userPool_1.getUserPoolId()),
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
        return new Promise(function (resolve, reject) {
            var uCred = getUserCred();
            if (uCred) {
                if (uPool) {
                    var userPool = new CognitoUserPool(uPool);
                    var nuser_1 = new CognitoUser({ Username: uCred.username, Pool: userPool });
                    nuser_1.getSession(wrapErr(function (sess) {
                        if (sess) {
                            var refreshToken_ = sess.getRefreshToken();
                            nuser_1.refreshSession(refreshToken_, function (err, session) {
                                if (err) {
                                    console.log(err);
                                    reject(err);
                                }
                                else {
                                    var token = session.getIdToken().getJwtToken();
                                    var payload = session.getIdToken().payload;
                                    var expiry = session.getIdToken().getExpiration();
                                    console.log('New Token: ', token);
                                    var nUCred = {
                                        email: uCred.email,
                                        username: uCred.username,
                                        url: uCred.url,
                                        token: token,
                                        expiry: expiry,
                                        userId: payload.sub,
                                    };
                                    setUserCred(nUCred);
                                    resolve(nUCred);
                                }
                            });
                        }
                    }));
                }
            }
            reject("Could not refresh. uCred: ".concat(uCred, " | uPool: ").concat(uPool));
        });
    };
    var getConfig = function () {
        if (userCred) {
            return {
                headers: { Authorization: "Bearer ".concat(userCred.token) },
            };
        }
        return undefined;
    };
    var signUp = function (email, password, customAttributes) {
        return new Promise(function (resolve, reject) {
            var attributeEmail = new CognitoUserAttribute({ Name: 'email', Value: email });
            var attributeList = [attributeEmail];
            if (customAttributes !== undefined && customAttributes.length > 0) {
                customAttributes.forEach(function (item) {
                    var name = "custom:".concat(item.name);
                    var value = item.value;
                    var t = new CognitoUserAttribute({
                        Name: name,
                        Value: value,
                    });
                    attributeList.push(t);
                });
            }
            if (uPool) {
                var userPool = new CognitoUserPool(uPool);
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
                    var userPool = new CognitoUserPool(uPool);
                    var nuser = new CognitoUser({ Username: email, Pool: userPool });
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
                    var userPool = new CognitoUserPool(uPool);
                    var nuser = new CognitoUser({ Username: email, Pool: userPool });
                    nuser.resendConfirmationCode(function (err, result) {
                        if (err)
                            reject(err);
                        if (result) {
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
                    var userPool = new CognitoUserPool(uPool);
                    var nuser = new CognitoUser({ Username: userCred.username, Pool: userPool });
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
                        var userPool = new CognitoUserPool(uPool);
                        var nuser_2 = new CognitoUser({ Username: userCred.username, Pool: userPool });
                        nuser_2.getSession(wrapErr(function (sess) {
                            var attrs = attributes.map(function (attribute) {
                                if (!attribute.Name.startsWith('custom:'))
                                    attribute.Name = "custom:".concat(attribute.Name);
                                if (attribute.Name === WorkspaceIDsAttrName)
                                    reject('To update workspace Id, use the userAddWorkspace method ');
                                return new CognitoUserAttribute(attribute);
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
                        var userPool = new CognitoUserPool(uPool);
                        var nuser_3 = new CognitoUser({ Username: userCred.username, Pool: userPool });
                        nuser_3.getSession(
                        // @ts-ignore
                        wrapErr(function (sess) {
                            nuser_3.getUserAttributes(function (err, result) {
                                if (err)
                                    reject("Error: ".concat(err.message));
                                result === null || result === void 0 ? void 0 : result.forEach(function (attr) {
                                    if (attr.Name === WorkspaceIDsAttrName) {
                                        var newWorkspaceIDs = "".concat(attr.Value, "#").concat(workspaceId);
                                        var t = new CognitoUserAttribute({
                                            Name: WorkspaceIDsAttrName,
                                            Value: newWorkspaceIDs,
                                        });
                                        // @ts-ignore
                                        nuser_3.updateAttributes([t], function (err, result) {
                                            if (err)
                                                reject("Error: ".concat(err.message));
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
export default useAuth;
