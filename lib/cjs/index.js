"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = exports.client = void 0;
var useAuth_1 = __importDefault(require("./useAuth/useAuth"));
exports.useAuth = useAuth_1.default;
var apiClient_1 = __importDefault(require("./apiClient"));
exports.client = apiClient_1.default;
