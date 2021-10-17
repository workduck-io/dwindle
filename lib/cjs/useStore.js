"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMyHook = exports.useStore = void 0;
var zustand_1 = __importDefault(require("zustand"));
exports.useStore = (0, zustand_1.default)(function (set) { return ({
    n: 'something',
    setN: function (n) { return set({ n: n }); },
}); });
var useMyHook = function () {
    var n = (0, exports.useStore)(function (store) { return store.n; });
    var setN = (0, exports.useStore)(function (store) { return store.setN; });
    return { n: n, setN: setN };
};
exports.useMyHook = useMyHook;
