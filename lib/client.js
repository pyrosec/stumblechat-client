"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stumblechat = exports.objectToProxyString = void 0;
const fetch_cookie_1 = __importDefault(require("fetch-cookie"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const socks_proxy_agent_1 = require("socks-proxy-agent");
const https_proxy_agent_1 = require("https-proxy-agent");
const url_1 = __importDefault(require("url"));
const cheerio_1 = __importDefault(require("cheerio"));
const objectToProxyString = (o) => {
    return ((o.protocol === "socks" ? "socks5://" : "http://") +
        (o.userId ? o.userId + ":" + o.password + "@" : "") +
        o.hostname +
        (o.port ? ":" + o.port : ""));
};
exports.objectToProxyString = objectToProxyString;
const deserializeSync = (s) => Object.assign(new fetch_cookie_1.default.toughCookie.CookieJar(), {
    _jar: new fetch_cookie_1.default.toughCookie.CookieJar().constructor.deserializeSync(s),
});
const serializeSync = (jar) => jar.serializeSync();
class Stumblechat {
    constructor(o) {
        o = o || {};
        this._jar = o.jar || new fetch_cookie_1.default.toughCookie.CookieJar();
        this._csrf = o.csrf || null;
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
        return { jar: serializeSync(this._jar), csrf: this._csrf };
    }
    static fromObject({ jar, csrf }) {
        return new this({ jar: deserializeSync(jar), csrf });
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
        const finalConfig = Object.assign({}, config, {
            headers: Object.assign({
                "sec-ch-ua": '"Chromium";v="112", "Google Chrome";v="112", ";Not A Brand";v="99"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                Referer: "https://stumblechat.com/",
                "Referrer-Policy": "strict-origin-when-cross-origin",
            }, config.headers || {}),
            method: config.method || "GET",
        });
        if (this._csrf)
            finalConfig.headers.cookie = "_csrf=" + this._csrf;
        return await _fetch(uri, finalConfig);
    }
    async fetchText(uri, config = {}) {
        const responseText = await (await this._call(uri, config)).text();
        const $ = cheerio_1.default.load(responseText);
        this._csrf = $('meta[name="_csrf"]').attr("content");
        return responseText;
    }
    async login({ username, password, rememberme = true }) {
        await this.fetchText("https://stumblechat.com/login");
        const fetchCookie = (0, fetch_cookie_1.default)(node_fetch_1.default, this._jar);
        const response = await fetchCookie("https://stumblechat.com/account/login", {
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
        return await response.json();
    }
    async chooseRoom({ room }) {
        await this.fetchText("https://stumblechat.com/room/" + room);
        const fetchCookie = (0, fetch_cookie_1.default)(node_fetch_1.default, this._jar);
        const response = await fetchCookie("https://stumblechat.com/api/room/token", {
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
                Referer: "https://stumblechat.com/room/conspiracytalk",
                "Referrer-Policy": "strict-origin-when-cross-origin",
            },
            body: JSON.stringify({ name: room.toUpperCase() }),
            method: "POST",
        });
        return await response.json();
    }
}
exports.Stumblechat = Stumblechat;
//# sourceMappingURL=client.js.map