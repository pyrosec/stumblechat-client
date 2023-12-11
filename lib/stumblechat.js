"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stumblechat = exports.objectToProxyString = void 0;
const fetch_cookie_1 = __importDefault(require("./fetch-cookie"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const socks_proxy_agent_1 = require("socks-proxy-agent");
const https_proxy_agent_1 = require("https-proxy-agent");
const url_1 = __importDefault(require("url"));
const cheerio_1 = __importDefault(require("cheerio"));
const logger_1 = require("./logger");
const ws_1 = require("ws");
const user_agents_1 = require("user-agents");
const logger = (0, logger_1.getLogger)();
const objectToProxyString = (o) => {
    return ((o.protocol === "socks" ? "socks5://" : "http://") +
        (o.userId ? o.userId + ":" + o.password + "@" : "") +
        o.hostname +
        (o.port ? ":" + o.port : ""));
};
exports.objectToProxyString = objectToProxyString;
const deserializeSync = (s) => (s && fetch_cookie_1.default.toughCookie.CookieJar.fromJSON(s)) ||
    new fetch_cookie_1.default.toughCookie.CookieJar();
const serializeSync = (jar) => jar.serializeSync();
class Stumblechat {
    constructor(o) {
        o = o || {};
        this._jar = o.jar || new fetch_cookie_1.default.toughCookie.CookieJar();
        this._csrf = o.csrf || null;
        this._room = o.room || null;
        this._userAgent = o.userAgent || (0, user_agents_1.random)();
    }
    _makeAgent() {
        if (!this.proxyOptions)
            return null;
        const parsed = url_1.default.parse(this.proxyOptions);
        if (parsed.protocol === "http:")
            return new https_proxy_agent_1.HttpsProxyAgent(this.proxyOptions);
        else if (parsed.protocol === "socks5:")
            return new socks_proxy_agent_1.SocksProxyAgent(this.proxyOptions);
        else
            throw Error("unsupported proxy protocol: " + parsed.protocol);
    }
    toObject() {
        return {
            jar: serializeSync(this._jar),
            csrf: this._csrf,
            userAgent: this._userAgent,
            room: this._room,
        };
    }
    static fromObject({ jar, csrf, userAgent, room }) {
        return new this({ jar: deserializeSync(jar), csrf, userAgent, room });
    }
    static fromJSON(s) {
        return this.fromObject(JSON.parse(s));
    }
    toJSON() {
        return JSON.stringify(this.toObject());
    }
    async _call(uri, config) {
        const _fetch = (0, fetch_cookie_1.default)(node_fetch_1.default, this._jar);
        if (!config)
            config = {};
        const agent = this._makeAgent();
        if (agent)
            config.agent = agent;
        const finalConfig = Object.assign({ method: "GET", headers: {} }, config || {});
        finalConfig.headers = Object.assign(finalConfig.headers || {}, {
            "User-Agent": this._userAgent,
        });
        return await _fetch(uri, finalConfig);
    }
    async fetchText(uri, config = {}) {
        const responseText = await (await this._call(uri, config)).text();
        const $ = cheerio_1.default.load(responseText);
        this._csrf = $('meta[name="_csrf"]').attr("content");
        this._jar.setCookie("_csrf=" + this._csrf, ".stumblechat.com");
        return responseText;
    }
    async login({ username, password, rememberme = true }) {
        await this.fetchText("https://stumblechat.com/login");
        const fetchCookie = (0, fetch_cookie_1.default)(node_fetch_1.default, this._jar);
        const response = await this._call("https://stumblechat.com/account/login", {
            headers: {
                accept: "*/*",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/json;charset=UTF-8",
                "csrf-token": this._csrf,
                "sec-ch-ua": '"Chromium";v="112", "Google Chrome";v="112", ";Not A Brand";v="99"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                cookie: "_csrf=" + this._csrf,
                Referer: "https://stumblechat.com/login",
                "Referrer-Policy": "strict-origin-when-cross-origin",
            },
            body: JSON.stringify({
                username,
                password,
                rememberme: rememberme === "false" ? false : Boolean(rememberme),
            }),
            method: "POST",
        });
        const responseJson = await response.json();
        this._username = username;
        return responseJson;
    }
    async chooseRoom({ room }) {
        await this.fetchText("https://stumblechat.com");
        await this.fetchText("https://stumblechat.com/room/" + room);
        const response = await this._call("https://stumblechat.com/api/room/token", {
            headers: {
                accept: "*/*",
                "accept-language": "en-US,en;q=0.9",
                "content-type": "application/json;charset=UTF-8",
                "csrf-token": this._csrf,
                "sec-ch-ua": '"Chromium";v="112", "Google Chrome";v="112", ";Not A Brand";v="99"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                Referer: "https://stumblechat.com/room/" + room,
                "Referrer-Policy": "strict-origin-when-cross-origin",
            },
            body: JSON.stringify({ name: room.toUpperCase() }),
            method: "POST",
        });
        const responseJson = await response.json();
        this._room = {
            token: responseJson.result,
            endpoint: responseJson.endpoint,
            room,
        };
        return responseJson;
    }
    async attach({ handler, username }) {
        handler = handler || (() => { });
        username = username || this._username;
        const ws = new ws_1.WebSocket(this._room.endpoint, {
            headers: {
                Cookie: (await this._jar.getCookies(this._room.endpoint)).toString(),
                "accept-language": "en-US,en;q=0.9",
                "cache-control": "no-cache",
                pragma: "no-cache",
                "sec-websocket-extensions": "permessage-deflate; client_max_window_bits",
                "sec-websocket-version": "13",
            },
            agent: this._makeAgent()
        });
        this._ws = ws;
        return await new Promise(() => {
            ws.on("open", () => {
                ws.send(JSON.stringify({
                    stumble: "join",
                    token: this._room.token,
                    room: this._room.room,
                    nick: username,
                }));
                ws.on("message", (msg) => {
                    if (Number(msg) === 0)
                        ws.send('0');
                    logger.info(JSON.parse(msg));
                    handler(JSON.parse(msg));
                });
            });
        });
    }
    send(msg) {
        this._ws.send(msg);
    }
}
exports.Stumblechat = Stumblechat;
//# sourceMappingURL=stumblechat.js.map