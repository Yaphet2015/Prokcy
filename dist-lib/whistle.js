"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Must be at the top to ensure this process runs with Node.js environment
process.env.ELECTRON_RUN_AS_NODE = '1';
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const net_1 = __importDefault(require("net"));
const whistleModule = require("whistle");
const util_1 = require("./util");
// Get the startWhistle function from the module
const startWhistle = whistleModule;
// Use PROC_PATH_EXPORT directly
const PROC_PATH = util_1.PROC_PATH_EXPORT;
const { getBypass } = (0, util_1.requireW2)('set-global-proxy');
const PROJECT_PLUGINS_PATH = path_1.default.join(__dirname, '../node_modules');
const pluginsPath = [path_1.default.join(util_1.CLIENT_PLUGINS_PATH, 'node_modules')];
const WEB_PAGE = path_1.default.join(__dirname, '../public/open.html');
const SPECIAL_AUTH = `${Math.random()}`;
const CIDR_RE = /^([(a-z\d:.]+)\/\d{1,2}$/i;
const getRulesPayload = (proxy) => {
    const base = proxy.rulesUtil.rules.getConfig();
    if (typeof proxy.rulesUtil.rules.getDefault === 'function') {
        base.defalutRules = proxy.rulesUtil.rules.getDefault() || '';
    }
    if (typeof proxy.rulesUtil.rules.getAllData === 'function') {
        const all = proxy.rulesUtil.rules.getAllData();
        if (all && Array.isArray(all.list)) {
            base.list = all.list;
        }
    }
    return base;
};
const isCIDR = (host) => {
    const match = CIDR_RE.exec(host);
    if (!match) {
        return false;
    }
    return net_1.default.isIP(match[1]) !== 0;
};
const sendMsg = (data) => {
    if (process.parentPort) {
        process.parentPort.postMessage(data);
    }
};
process.handleUncauthtWhistleErrorMessage = (stack, err) => {
    sendMsg({
        type: 'error',
        message: (err && err.message) || stack,
    });
};
const getBypassRules = (bypass) => {
    if (!bypass || typeof bypass !== 'string') {
        return '';
    }
    const bypassList = getBypass(bypass.trim().toLowerCase());
    if (!bypassList) {
        return '';
    }
    const result = [];
    bypassList.forEach((host) => {
        if (isCIDR(host)) {
            return;
        }
        if (host === '<local>') {
            host = util_1.LOCALHOST;
        }
        else if (/^\*\./.test(host)) {
            host = `*${host}`;
        }
        if (!result.includes(host)) {
            result.push(host);
        }
    });
    return result.length ? `disable://capture ${result.join(' ')}` : '';
};
const getShadowRules = (settings) => {
    const { username, password, bypass } = settings || {};
    const auth = username || password ? `* whistle.proxyauth://${username}:${password}` : '';
    return `${auth}\n${getBypassRules(bypass)}`.trim();
};
const parseJSON = (str) => {
    if (str) {
        try {
            const decoded = decodeURIComponent(str);
            return JSON.parse(decoded);
        }
        catch (e) {
            // Ignore JSON parse errors
        }
    }
    return {};
};
const parseOptions = () => {
    const options = parseJSON(process.argv[2] || '{}');
    const uiAuth = options.uiAuth || {};
    process.env.PFORK_MAX_HTTP_HEADER_SIZE = String((options.maxHttpHeaderSize || 0) * 1024);
    return {
        port: options.port,
        host: options.host,
        socksPort: options.socksPort,
        username: uiAuth.username,
        password: uiAuth.password,
        bypass: options.bypass,
        reqCacheSize: options.requestListLimit,
        shadowRules: getShadowRules(options),
        useDefaultStorage: options.useDefaultStorage,
    };
};
const newOptions = parseOptions();
const baseDir = newOptions.useDefaultStorage ? '' : util_1.BASE_DIR;
if (!baseDir) {
    newOptions.customPluginsPath = util_1.CUSTOM_PLUGINS_PATH;
}
const baseOptions = {
    baseDir,
    pluginsPath,
    projectPluginsPath: PROJECT_PLUGINS_PATH,
    specialAuth: SPECIAL_AUTH,
    mode: 'client|disableUpdateTips|disableAuthUI|enableMultipleRules',
    ...newOptions,
    disableInstaller: true,
};
const proxy = startWhistle({
    ...baseOptions,
    installPlugins(plugins) {
        sendMsg({
            type: 'install',
            plugins,
        });
    },
    handleUpdate(_, res) {
        sendMsg({ type: 'checkUpdate' });
        res.json({ ec: 0 });
    },
    handleWebReq(_, res) {
        res.sendFile(WEB_PAGE);
    },
}, () => {
    // Keep priority intuitive: top rules first, lower rules as fallback.
    if (typeof proxy.rulesUtil.rules.enableBackRulesFirst === 'function') {
        proxy.rulesUtil.rules.enableBackRulesFirst(false);
    }
    sendMsg({
        type: 'options',
        options: {
            ...baseOptions,
            registryPath: proxy.pluginMgr.REGISTRY_LIST,
            rootCAFile: proxy.httpsUtil.getRootCAFile(),
        },
        rules: getRulesPayload(proxy),
    });
    const host = baseOptions.host || util_1.LOCALHOST;
    const { port } = baseOptions;
    try {
        fs_1.default.writeFileSync(PROC_PATH, `${process.pid},${host},${port},${SPECIAL_AUTH}`);
    }
    catch (e) {
        // Ignore errors writing PID file
    }
    let timer;
    let changeTimer;
    const updateRules = () => {
        if (changeTimer) {
            return;
        }
        if (timer) {
            clearTimeout(timer);
        }
        sendMsg({
            type: 'rules',
            rules: getRulesPayload(proxy),
        });
        timer = setTimeout(updateRules, 3000);
    };
    timer = setTimeout(updateRules, 3000);
    const updateImmediately = () => {
        if (!changeTimer) {
            changeTimer = setTimeout(() => {
                changeTimer = undefined;
                updateRules();
            }, 30);
        }
    };
    proxy.pluginMgr.on('updateRules', (type) => {
        if (type === 'disableAllPlugins') {
            updateImmediately();
        }
    });
    proxy.on('rulesDataChange', updateImmediately);
});
// Message handler from main process
process.parentPort?.on('message', (data) => {
    const msg = data;
    const msgData = msg && msg.data;
    if (!msgData) {
        return;
    }
    const { type } = msgData;
    const ruleName = typeof msgData.name === 'string' ? msgData.name.trim() : '';
    const isDefaultRuleGroup = ruleName.toLowerCase() === 'default';
    if (type === 'selectRules') {
        if (isDefaultRuleGroup) {
            if (typeof proxy.rulesUtil.rules.enableDefault === 'function') {
                proxy.rulesUtil.rules.enableDefault();
            }
            return;
        }
        proxy.rulesUtil.rules.select(ruleName);
        return;
    }
    if (type === 'unselectRules') {
        if (isDefaultRuleGroup) {
            if (typeof proxy.rulesUtil.rules.disableDefault === 'function') {
                proxy.rulesUtil.rules.disableDefault();
            }
            return;
        }
        proxy.rulesUtil.rules.unselect(ruleName);
        return;
    }
    if (type === 'disableAllRules') {
        return proxy.rulesUtil.rules.disableAllRules(true);
    }
    if (type === 'enableAllRules') {
        return proxy.rulesUtil.rules.disableAllRules(false);
    }
    if (type === 'setRulesContent') {
        const name = typeof msgData.name === 'string' ? msgData.name.trim() : '';
        if (!name) {
            return { success: false, message: 'Invalid group name' };
        }
        proxy.rulesUtil.rules.add(name, msgData.content || '');
        // Explicitly trigger rules reload after add()
        proxy.rulesUtil.rules.parseRules();
        return { success: true };
    }
    if (type === 'disableAllPlugins') {
        return proxy.pluginMgr.disableAllPlugins(true);
    }
    if (type === 'enableAllPlugins') {
        return proxy.pluginMgr.disableAllPlugins(false);
    }
    if (type === 'refreshPlugins') {
        return proxy.pluginMgr.refreshPlugins();
    }
    if (type === 'addRegistry') {
        return proxy.pluginMgr.addRegistry(msgData.registry || '');
    }
    if (type === 'enableCapture') {
        return proxy.rulesUtil.properties.setEnableCapture(true);
    }
    if (type === 'setShadowRules') {
        return proxy.setShadowRules(getShadowRules(msgData.settings));
    }
    if (type === 'getRegistryList') {
        return sendMsg({
            type: 'getRegistryList',
            list: proxy.pluginMgr.getRegistryList(),
        });
    }
    // Create new rules group
    if (type === 'createRulesGroup') {
        const name = typeof msgData.name === 'string' ? msgData.name.trim() : '';
        if (!name) {
            return { success: false, message: 'Invalid group name' };
        }
        // Check if group already exists
        if (proxy.rulesUtil.rules.exists(name)) {
            return { success: false, message: 'Group already exists' };
        }
        const content = typeof msgData.content === 'string' ? msgData.content : '';
        proxy.rulesUtil.rules.add(name, content, 'client');
        proxy.rulesUtil.rules.parseRules();
        return { success: true };
    }
    // Delete a rules group
    if (type === 'deleteRulesGroup') {
        const name = typeof msgData.name === 'string' ? msgData.name.trim() : '';
        if (!name) {
            return { success: false, message: 'Invalid group name' };
        }
        if (!proxy.rulesUtil.rules.exists(name)) {
            return { success: false, message: 'Group does not exist' };
        }
        proxy.rulesUtil.rules.remove(name, 'client');
        proxy.rulesUtil.rules.parseRules();
        return { success: true };
    }
    // Rename a rules group
    if (type === 'renameRulesGroup') {
        const name = typeof msgData.name === 'string' ? msgData.name.trim() : '';
        const newName = typeof msgData.newName === 'string' ? msgData.newName.trim() : '';
        if (!name || !newName) {
            return { success: false, message: 'Invalid names' };
        }
        if (!proxy.rulesUtil.rules.exists(name)) {
            return { success: false, message: 'Group does not exist' };
        }
        if (proxy.rulesUtil.rules.exists(newName)) {
            return { success: false, message: 'A group with this name already exists' };
        }
        proxy.rulesUtil.rules.rename(name, newName, 'client');
        proxy.rulesUtil.rules.parseRules();
        return { success: true };
    }
    // Reorder rules groups - persist list order
    if (type === 'reorderRulesGroups') {
        const names = Array.isArray(msgData.names)
            ? msgData.names.filter((name) => typeof name === 'string' && name)
            : [];
        if (!names.length) {
            return { success: false, message: 'Invalid group order' };
        }
        // Default is managed separately by Whistle and is always at the top in getAllData().
        // Reorder only custom groups by moving them to top from tail to head.
        const targetNames = names.filter((name) => name !== 'Default' && proxy.rulesUtil.rules.exists(name));
        for (let i = targetNames.length - 1; i >= 0; i -= 1) {
            proxy.rulesUtil.rules.moveToTop(targetNames[i], 'client');
        }
        proxy.rulesUtil.rules.parseRules();
        return { success: true };
    }
    if (type === 'exitWhistle') {
        return process.exit();
    }
});
//# sourceMappingURL=whistle.js.map