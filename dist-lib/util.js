"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getArtifactName = exports.getJson = exports.getString = exports.getErrorStack = exports.getErrorMsg = exports.showWin = exports.closeWhistle = exports.readJson = exports.compareFile = exports.sudoPromptExec = exports.requireW2 = exports.noop = exports.getDataUrl = exports.PROC_PATH_EXPORT = exports.USERNAME_EXPORT = exports.TRAY_ICON = exports.DOCK_ICON = exports.ICON = exports.CUSTOM_PLUGINS_PATH = exports.CLIENT_PLUGINS_PATH = exports.BASE_DIR = exports.VERSION = exports.LOCALHOST = exports.isMac = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = require("os");
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
const sudo_prompt_1 = __importDefault(require("sudo-prompt"));
const require_1 = __importDefault(require("whistle/require"));
exports.requireW2 = require_1.default;
const whistle_1 = require("whistle");
const context_1 = require("./context");
const package_json_1 = __importDefault(require("../package.json"));
const fse = (0, require_1.default)('fs-extra');
// Constants
const USERNAME = package_json_1.default.name;
const PROC_PATH = path_1.default.join((0, os_1.homedir)(), '.whistle_client.pid');
const HTTPS_RE = /^https:\/\//;
const URL_RE = /^https?:\/\/\S/;
const IMPORT_URL_RE = /[?&#]data(?:_url|Url)=([^&#]+)(?:&|#|$)/;
const SUDO_OPTIONS = { name: 'Whistle' };
// Internal helper functions
const noop = () => { };
exports.noop = noop;
const existsFile = (file) => new Promise((resolve) => {
    fs_1.default.stat(file, (err, stat) => {
        if (err) {
            return fs_1.default.stat(file, (_, s) => resolve(s != null && s.isFile()));
        }
        resolve(stat.isFile());
    });
});
const readFile = (file) => new Promise((resolve) => {
    fs_1.default.readFile(file, (err, buf) => {
        if (err) {
            return fs_1.default.readFile(file, (_, buf2) => resolve(buf2));
        }
        resolve(buf);
    });
});
const killProcess = (pid) => {
    if (pid) {
        try {
            process.kill(pid);
        }
        catch (e) {
            // Ignore errors when killing process
        }
    }
};
const parseJson = (str) => {
    try {
        return str && JSON.parse(str);
    }
    catch (e) {
        return null;
    }
};
// Exported constants
exports.isMac = process.platform === 'darwin';
exports.LOCALHOST = '127.0.0.1';
exports.VERSION = package_json_1.default.version;
exports.BASE_DIR = path_1.default.join((0, whistle_1.getWhistlePath)(), '.whistle_client');
exports.CLIENT_PLUGINS_PATH = path_1.default.join((0, whistle_1.getWhistlePath)(), '.whistle_client_plugins');
exports.CUSTOM_PLUGINS_PATH = path_1.default.join((0, whistle_1.getWhistlePath)(), 'custom_plugins');
exports.ICON = path_1.default.join(__dirname, '../public/dock.png');
exports.DOCK_ICON = path_1.default.join(__dirname, '../public/dock.png');
exports.TRAY_ICON = exports.isMac
    ? path_1.default.join(__dirname, '../public/dock.png')
    : exports.ICON;
exports.USERNAME_EXPORT = USERNAME;
exports.PROC_PATH_EXPORT = PROC_PATH;
// Exported functions
const getDataUrl = (url) => {
    const result = IMPORT_URL_RE.exec(url);
    if (!result) {
        return null;
    }
    const [, matchedUrl] = result;
    try {
        const decodedUrl = decodeURIComponent(matchedUrl).trim();
        return URL_RE.test(decodedUrl) ? decodedUrl : null;
    }
    catch (e) {
        return null;
    }
};
exports.getDataUrl = getDataUrl;
const sudoPromptExec = (command, callback) => {
    sudo_prompt_1.default.exec(command, SUDO_OPTIONS, callback);
};
exports.sudoPromptExec = sudoPromptExec;
const compareFile = async (file1, file2) => {
    const exists = await existsFile(file1);
    if (!exists) {
        return false;
    }
    const [ctn1, ctn2] = await Promise.all([readFile(file1), readFile(file2)]);
    return ctn1 != null && ctn2 != null ? ctn1.equals(ctn2) : false;
};
exports.compareFile = compareFile;
const readJson = (file) => new Promise((resolve) => {
    fse.readJson(file, (err, data) => {
        if (err) {
            return fse.readJson(file, (_, data2) => {
                resolve(data2 || {});
            });
        }
        resolve(data || {});
    });
});
exports.readJson = readJson;
const closeWhistle = () => {
    const child = (0, context_1.getChild)();
    const curPid = child?.pid;
    if (child) {
        child.removeAllListeners();
        child.on('error', noop);
    }
    if (curPid) {
        (0, context_1.sendMsg)({ type: 'exitWhistle' });
        killProcess(curPid);
    }
    try {
        const pid = Number(fs_1.default
            .readFileSync(PROC_PATH, { encoding: 'utf-8' })
            .split(',', 1)[0]);
        if (pid !== curPid) {
            killProcess(pid);
        }
    }
    catch (e) {
        // Ignore errors reading PID file
    }
    finally {
        try {
            fs_1.default.unlinkSync(PROC_PATH);
        }
        catch (e) {
            // Ignore errors deleting PID file
        }
    }
};
exports.closeWhistle = closeWhistle;
const showWin = (win) => {
    if (!win) {
        return;
    }
    if (win.isMinimized()) {
        win.restore();
    }
    win.show();
    win.focus();
};
exports.showWin = showWin;
const getErrorMsg = (err) => {
    try {
        const error = err;
        return error.message || error.stack || `${error}`;
    }
    catch (e) {
        return 'Unknown Error';
    }
};
exports.getErrorMsg = getErrorMsg;
const getErrorStack = (err) => {
    if (!err) {
        return '';
    }
    let stack;
    try {
        stack = err.stack;
    }
    catch (e) {
        // Ignore
    }
    stack = stack || err.message || String(err);
    const result = [
        `From: ${USERNAME}@${package_json_1.default.version}`,
        `Node: ${process.version}`,
        `Date: ${new Date().toLocaleString()}`,
        stack,
    ];
    return result.join('\r\n');
};
exports.getErrorStack = getErrorStack;
const getString = (str, len) => {
    if (typeof str !== 'string') {
        return '';
    }
    const trimmed = str.trim();
    return len ? trimmed.substring(0, len) : trimmed;
};
exports.getString = getString;
const getJson = (url) => {
    const options = (0, context_1.getOptions)();
    if (!options) {
        return;
    }
    const isHttps = HTTPS_RE.test(url);
    const parsedUrl = (0, url_1.parse)(url.replace(HTTPS_RE, 'http://'));
    const headers = { host: parsedUrl.host || '' };
    if (isHttps) {
        headers['x-whistle-https-request'] = '1';
    }
    const requestOptions = {
        ...parsedUrl,
        headers,
        host: options.host || exports.LOCALHOST,
        port: options.port || 8888,
    };
    return new Promise((resolve, reject) => {
        const handleError = (err) => {
            clearTimeout(timer);
            reject(err || new Error('Timeout'));
            if (client) {
                client.destroy();
            }
        };
        const timer = setTimeout(handleError, 16000);
        const client = http_1.default.get(requestOptions, (res) => {
            res.on('error', handleError);
            if (res.statusCode !== 200) {
                return handleError(new Error(`Response code ${res.statusCode}`));
            }
            let body = null;
            res.on('data', (chunk) => {
                body = body ? Buffer.concat([body, chunk]) : chunk;
            });
            res.once('end', () => {
                clearTimeout(timer);
                resolve(parseJson(body ? body.toString() : ''));
            });
        });
        client.on('error', handleError);
    });
};
exports.getJson = getJson;
const isUserInstaller = false;
const isArm = () => /^arm/i.test(process.arch);
const getArtifactName = (version) => {
    const name = `${package_json_1.default.name}-${isUserInstaller ? 'user-installer-' : ''}v${version}-`;
    switch (process.platform) {
        case 'win32':
            return `${name}win-x64.exe`;
        case 'darwin':
            return `${name}mac-${isArm() ? 'arm64' : 'x64'}.dmg`;
        default:
            return `${name}linux-${isArm() ? 'arm64' : 'x86_64'}.AppImage`;
    }
};
exports.getArtifactName = getArtifactName;
//# sourceMappingURL=util.js.map