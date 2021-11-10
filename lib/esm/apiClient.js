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
import { CognitoUser, CognitoUserPool } from 'amazon-cognito-identity-js';
import axios from 'axios';
import useAuthStore from './AuthStore/useAuthStore';
import { wrapErr } from './useAuth/useAuth';
var client = axios.create();
client.interceptors.request.use(function (request) {
    var userCred = useAuthStore.getState().userCred;
    if (request && request.headers && userCred && userCred.token) {
        request.headers['Authorization'] = "Bearer " + userCred.token;
    }
    return request;
});
var refreshToken = function () {
    var _a = useAuthStore.getState(), userCred = _a.userCred, uPool = _a.userPool;
    if (userCred) {
        if (uPool) {
            var userPool = new CognitoUserPool(uPool);
            var nuser_1 = new CognitoUser({ Username: userCred.email, Pool: userPool });
            nuser_1.getSession(wrapErr(function (sess) {
                if (sess) {
                    var refreshToken_1 = sess.getRefreshToken();
                    nuser_1.refreshSession(refreshToken_1, function (err, session) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            var token = session.getAccessToken().getJwtToken();
                            var payload = session.getAccessToken().payload;
                            var expiry = session.getAccessToken().getExpiration();
                            useAuthStore.setState({
                                userCred: { email: userCred.email, url: userCred.url, token: token, expiry: expiry, userId: payload.sub },
                            });
                        }
                    });
                }
            }));
        }
    }
};
client.interceptors.response.use(undefined, function (error) { return __awaiter(void 0, void 0, void 0, function () {
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
                return [2 /*return*/, client(error.config)];
            }
        }
        return [2 /*return*/, Promise.reject(error)];
    });
}); });
export default client;
