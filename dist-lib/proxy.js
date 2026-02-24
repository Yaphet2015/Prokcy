"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTitle = exports.setEnabled = exports.isEnabled = exports.disableProxy = exports.enableProxy = void 0;
const path_1 = __importDefault(require("path"));
const require_1 = __importDefault(require("whistle/require"));
const util_1 = require("./util");
const setGlobalProxy = (0, require_1.default)('set-global-proxy');
const TITLE = 'Prokcy';
const DISABLED_TITLE = 'Prokcy (system proxy disabled)';
const PROXY_HELPER = path_1.default.join(util_1.BASE_DIR, 'whistle');
/**
 * Internal state tracking whether system proxy is enabled
 * undefined = unknown, true = enabled, false = disabled
 */
let proxyEnabled;
/**
 * Install the proxy helper binary for macOS
 * Copies the helper from the original location to BASE_DIR and sets proper ownership/permissions
 * This requires sudo privileges
 *
 * @returns Promise that resolves when installation is complete
 */
const installProxyHelper = async () => {
    const originHelper = setGlobalProxy.getMacProxyHelper();
    if (!originHelper) {
        return;
    }
    // Check if helper is already installed with correct permissions
    const uid = setGlobalProxy.getUid(PROXY_HELPER);
    if (uid === 0 && (await (0, util_1.compareFile)(PROXY_HELPER, originHelper))) {
        return;
    }
    // Copy helper and set ownership/permissions
    const command = `cp "${originHelper}" "${PROXY_HELPER}" && chown root:admin "${PROXY_HELPER}" && chmod a+rx+s "${PROXY_HELPER}"`;
    return new Promise((resolve, reject) => {
        (0, util_1.sudoPromptExec)(command, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};
/**
 * Enable system proxy for all network traffic
 * On macOS, this installs the proxy helper if needed and configures system proxy settings
 *
 * @param options - Proxy configuration including port, host, and bypass list
 */
const enableProxy = async (options) => {
    await installProxyHelper();
    setGlobalProxy.enableProxy({
        port: options.port,
        host: options.host || util_1.LOCALHOST,
        bypass: options.bypass,
        proxyHelper: PROXY_HELPER,
    });
    proxyEnabled = true;
};
exports.enableProxy = enableProxy;
/**
 * Disable system proxy
 * Restores system network settings to not use a proxy
 */
const disableProxy = async () => {
    await installProxyHelper();
    setGlobalProxy.disableProxy(PROXY_HELPER);
    proxyEnabled = false;
};
exports.disableProxy = disableProxy;
/**
 * Check if system proxy is currently enabled
 *
 * @returns true if proxy is enabled, false if disabled, undefined if unknown
 */
const isEnabled = () => proxyEnabled;
exports.isEnabled = isEnabled;
/**
 * Manually set the enabled state
 * Used to synchronize state with actual system settings
 *
 * @param flag - The enabled state to set
 */
const setEnabled = (flag) => {
    proxyEnabled = flag;
};
exports.setEnabled = setEnabled;
/**
 * Get the window title based on proxy status
 * Shows "(system proxy disabled)" suffix when proxy is disabled
 *
 * @returns The appropriate window title
 */
const getTitle = () => proxyEnabled !== false ? TITLE : DISABLED_TITLE;
exports.getTitle = getTitle;
//# sourceMappingURL=proxy.js.map