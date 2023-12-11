"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCLI = exports.loadFiles = exports.loadSessionFrom = exports.saveSessionAs = exports.callAPI = exports.loadProxy = exports.unsetProxy = exports.setProxy = exports.proxyStringToObject = exports.loadSession = exports.initSession = exports.saveSession = void 0;
const stumblechat_1 = require("./stumblechat");
const yargs_1 = __importDefault(require("yargs"));
const change_case_1 = require("change-case");
const fs_extra_1 = __importDefault(require("fs-extra"));
const url_1 = __importDefault(require("url"));
require("setimmediate");
const mkdirp_1 = __importDefault(require("mkdirp"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("./logger");
const logger = (0, logger_1.getLogger)();
async function saveSession(stumblechat, json = false, filename = 'session.json') {
    await (0, mkdirp_1.default)(path_1.default.join(process.env.HOME, '.stumblechat'));
    await fs_extra_1.default.writeFile(path_1.default.join(process.env.HOME, '.stumblechat', filename), stumblechat.toJSON());
    if (!json)
        logger.info('saved to ~/' + path_1.default.join('.stumblechat', filename));
}
exports.saveSession = saveSession;
async function initSession() {
    const proxyOptions = await loadProxy();
    const stumblechat = new stumblechat_1.Stumblechat();
    stumblechat.proxyOptions = proxyOptions;
    await saveSession(stumblechat);
}
exports.initSession = initSession;
async function loadSession() {
    const proxyOptions = await loadProxy();
    const stumblechat = stumblechat_1.Stumblechat.fromJSON(await fs_extra_1.default.readFile(path_1.default.join(process.env.HOME, '.stumblechat', 'session.json')));
    stumblechat.proxyOptions = proxyOptions;
    return stumblechat;
}
exports.loadSession = loadSession;
const proxyStringToObject = (proxyUri) => {
    const parsed = url_1.default.parse(proxyUri);
    const [username, ...passwordParts] = (parsed.auth || '').split(':');
    return {
        hostname: parsed.hostname,
        port: parsed.port,
        userId: username || null,
        password: passwordParts.join(':') || null
    };
};
exports.proxyStringToObject = proxyStringToObject;
async function setProxy(proxyUri) {
    await (0, mkdirp_1.default)(path_1.default.join(process.env.HOME, '.stumblechat'));
    const proxyOptions = (0, exports.proxyStringToObject)(proxyUri);
    const joined = (0, stumblechat_1.objectToProxyString)(proxyOptions);
    await fs_extra_1.default.writeFile(path_1.default.join(process.env.HOME, '.stumblechat', 'proxy'), joined);
    logger.info('set-proxy: ' + joined);
}
exports.setProxy = setProxy;
async function unsetProxy() {
    await (0, mkdirp_1.default)(path_1.default.join(process.env.HOME, '.stumblechat'));
    await fs_extra_1.default.unlink(path_1.default.join(process.env.HOME, '.stumblechat', 'proxy'));
    logger.info('unset-proxy');
}
exports.unsetProxy = unsetProxy;
async function loadProxy() {
    await (0, mkdirp_1.default)(path_1.default.join(process.env.HOME, '.stumblechat'));
    try {
        return await fs_extra_1.default.readFile(path_1.default.join(process.env.HOME, '.stumblechat', 'proxy'), 'utf8');
    }
    catch (e) {
        return null;
    }
}
exports.loadProxy = loadProxy;
async function callAPI(command, data) {
    const stumblechat = await loadSession();
    const camelCommand = (0, change_case_1.camelCase)(command);
    const json = data.j || data.json;
    const repl = data.repl;
    const insecure = data.i || data.insecure;
    delete data.i;
    delete data.insecure;
    if (insecure)
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    delete data.j;
    delete data.json;
    delete data.repl;
    if (!stumblechat[camelCommand])
        throw Error('command not foud: ' + command);
    const result = await stumblechat[camelCommand](data);
    if (repl) {
        const r = require('repl').start('> ');
        r.context.result = result;
        await new Promise(() => { });
        return result;
    }
    else if (json)
        console.log(JSON.stringify(result, null, 2));
    else
        logger.info(result);
    await saveSession(stumblechat, json);
    return result;
}
exports.callAPI = callAPI;
async function saveSessionAs(name) {
    const stumblechat = await loadSession();
    await saveSession(stumblechat, false, name + '.json');
}
exports.saveSessionAs = saveSessionAs;
async function loadSessionFrom(name) {
    const stumblechat = stumblechat_1.Stumblechat.fromObject(require(path_1.default.join(process.env.HOME, '.stumblechat', name)));
    await saveSession(stumblechat);
}
exports.loadSessionFrom = loadSessionFrom;
async function loadFiles(data) {
    const fields = [];
    for (let [k, v] of Object.entries(data)) {
        const parts = /(^.*)FromFile$/.exec(k);
        if (parts) {
            const key = parts[1];
            fields.push([key, await fs_extra_1.default.readFile(v)]);
        }
        else {
            fields.push([k, v]);
        }
    }
    return fields.reduce((r, [k, v]) => {
        r[k] = v;
        return r;
    }, {});
}
exports.loadFiles = loadFiles;
async function runCLI() {
    const [command] = yargs_1.default.argv._;
    const options = Object.assign({}, yargs_1.default.argv);
    delete options._;
    const data = await loadFiles(Object.entries(options).reduce((r, [k, v]) => {
        r[(0, change_case_1.camelCase)(k)] = String(v);
        return r;
    }, {}));
    if (data.address && data.address.indexOf(',') !== -1)
        data.address = data.address.split(',');
    switch (command) {
        case 'init':
            return await initSession();
            break;
        case 'set-proxy':
            return await setProxy(yargs_1.default.argv._[1]);
            break;
        case 'unset-proxy':
            return await unsetProxy();
            break;
        case 'save':
            return await saveSessionAs(yargs_1.default.argv._[1]);
            break;
        case 'load':
            return await loadSessionFrom(yargs_1.default.argv._[1]);
            break;
        default:
            return await callAPI(yargs_1.default.argv._[0], data);
            break;
    }
}
exports.runCLI = runCLI;
//# sourceMappingURL=cli.js.map