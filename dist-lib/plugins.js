"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.install = void 0;
const npminstall_1 = __importDefault(require("npminstall"));
const fs_1 = __importDefault(require("fs"));
const npa_1 = __importDefault(require("npminstall/lib/npa"));
const context_1 = __importDefault(require("npminstall/lib/context"));
const common_1 = require("whistle/lib/util/common");
const dialog_1 = require("./dialog");
const util_1 = require("./util");
const context_2 = require("./context");
/**
 * Send message to refresh plugins in the worker process
 */
const refreshPlugins = () => {
    (0, context_2.sendMsg)({ type: 'refreshPlugins' });
};
/**
 * Add registry configuration to the worker process
 * @param registry - Registry URL to add
 */
const addRegistry = (registry) => {
    if (registry) {
        (0, context_2.sendMsg)({ type: 'addRegistry', registry });
    }
};
/**
 * Install packages using npminstall
 * @param data - Installation data containing packages and options
 * @returns Promise that resolves to true on success, undefined on failure
 */
const install = async (data) => {
    let context;
    const tgzFiles = [];
    // Process each package to normalize names and versions
    data.pkgs.forEach((pkg) => {
        const { name } = pkg;
        if (name && !common_1.WHISTLE_PLUGIN_RE.test(name)) {
            try {
                context = context || new context_1.default();
                const p = (0, npa_1.default)(name, { where: data.root, nested: context.nested });
                pkg.name = p.name;
                pkg.version = p.fetchSpec || p.rawSpec;
                pkg.type = p.type;
                pkg.arg = p;
                // Track local .tgz files for cleanup
                if (!name.indexOf('file:')) {
                    tgzFiles.push(name.substring(5));
                }
            }
            catch (e) {
                // Ignore errors during package name parsing
            }
        }
    });
    try {
        await (0, npminstall_1.default)(data);
        refreshPlugins();
        // Clean up temporary .tgz files
        tgzFiles.forEach((file) => {
            fs_1.default.unlink(file, util_1.noop);
        });
        return true;
    }
    catch (e) {
        // Show error message dialog with retry option
        // Note: showMessageBox handles the error, and the callback may retry
        (0, dialog_1.showMessageBox)(e, () => install(data));
        return undefined;
    }
};
/**
 * Install Whistle plugins with proper configuration
 * Sets root directory to client plugins path and handles peer dependencies
 * @param data - Installation data containing packages to install
 * @returns Promise that resolves when installation is complete
 */
const installPlugins = async (data) => {
    data.root = util_1.CLIENT_PLUGINS_PATH;
    // Perform initial installation
    if (!(await install(data))) {
        return;
    }
    // Handle peer plugins
    (0, common_1.getPeerPlugins)(data.pkgs, util_1.CLIENT_PLUGINS_PATH, (pkgs) => {
        data.pkgs = pkgs;
        if (data.pkgs.length) {
            install(data);
        }
        addRegistry(data.registry);
    });
};
exports.install = installPlugins;
//# sourceMappingURL=plugins.js.map