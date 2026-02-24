"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const storage_1 = __importDefault(require("whistle/lib/rules/storage"));
const util_1 = require("./util");
/**
 * Storage instance for proxy settings
 * Persists settings to ~/.whistle_client/proxy_settings
 */
const storageInstance = new storage_1.default(path_1.default.join(util_1.BASE_DIR, 'proxy_settings'));
exports.default = storageInstance;
//# sourceMappingURL=storage.js.map