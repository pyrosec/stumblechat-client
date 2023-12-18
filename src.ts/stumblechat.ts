import makeFetchCookie from "./fetch-cookie";
import fetch from "node-fetch";
import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import url from "url";
import cheerio from "cheerio";
import { getLogger } from "./logger";
import { WebSocket } from "ws";
import { random } from "user-agents";

const logger = getLogger();

export const objectToProxyString = (o: any) => {
  return (
    (o.protocol === "socks" ? "socks5://" : "http://") +
    (o.userId ? o.userId + ":" + o.password + "@" : "") +
    o.hostname +
    (o.port ? ":" + o.port : "")
  );
};

const deserializeSync = (s) =>
  (s && makeFetchCookie.toughCookie.CookieJar.fromJSON(s)) ||
  new makeFetchCookie.toughCookie.CookieJar();

const serializeSync = (jar) => (jar as any).serializeSync() as any;

export class Stumblechat {
  public proxyOptions: any;
  public _jar: any;
  public _csrf: string;
  public _userAgent: string;
  public _room: any;
  public _ws: any;
  public _username: string;
  public _logger: any;
  constructor(o?: any) {
    o = o || {};
    this._jar = o.jar || new makeFetchCookie.toughCookie.CookieJar();
    this._csrf = o.csrf || null;
    this._room = o.room || null;
    this._logger = logger;
    this._userAgent = o.userAgent || random();
  }
  _makeAgent() {
    if (!this.proxyOptions) return null;
    const parsed = url.parse(this.proxyOptions);
    if (parsed.protocol === "http:")
      return new HttpsProxyAgent(this.proxyOptions);
    else if (parsed.protocol === "socks5:")
      return new SocksProxyAgent(this.proxyOptions);
    else throw Error("unsupported proxy protocol: " + parsed.protocol);
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
  static fromJSON(s: string) {
    return this.fromObject(JSON.parse(s));
  }
  toJSON() {
    return JSON.stringify(this.toObject());
  }
  async _call(uri: string, config?: any) {
    const _fetch = makeFetchCookie(fetch, this._jar) as any;
    if (!config) config = {};
    const agent = this._makeAgent();
    if (agent) config.agent = agent;
    const finalConfig = Object.assign(
      { method: "GET", headers: {} },
      config || {},
    );
    finalConfig.headers = Object.assign(finalConfig.headers || {}, {
      "User-Agent": this._userAgent,
    });
    return await _fetch(uri, finalConfig);
  }
  async fetchText(uri, config: any = {}) {
    const responseText = await (await this._call(uri, config)).text();
    const $ = cheerio.load(responseText);
    this._csrf = $('meta[name="_csrf"]').attr("content");
    this._jar.setCookie("_csrf=" + this._csrf, ".stumblechat.com");
    return responseText;
  }
  async login({ username, password, rememberme = true }: any) {
    await this.fetchText("https://stumblechat.com/login");
    const fetchCookie = makeFetchCookie(fetch, this._jar) as any;
    const response = await this._call("https://stumblechat.com/account/login", {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json;charset=UTF-8",
        "csrf-token": this._csrf,
        "sec-ch-ua":
          '"Chromium";v="112", "Google Chrome";v="112", ";Not A Brand";v="99"',
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
    const response = await this._call(
      "https://stumblechat.com/api/room/token",
      {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json;charset=UTF-8",
          "csrf-token": this._csrf,
          "sec-ch-ua":
            '"Chromium";v="112", "Google Chrome";v="112", ";Not A Brand";v="99"',
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
      },
    );
    const responseJson = await response.json();
    this._room = {
      token: responseJson.result,
      endpoint: responseJson.endpoint,
      room,
    };
    return responseJson;
  }
  async attach({ handler, username }) {
    handler = handler || (() => {});
    username = username || this._username;
    let Cookie = null;
    try {
      Cookie = String(
        await this._jar.getCookies(
          this._room.endpoint || "https://wss2.stumblechat.com",
        ),
      );
    } catch (e) {
      console.error(e);
    }
    const ws = new WebSocket(
      this._room.endpoint || "https://wss2.stumblechat.com",
      {
        headers: {
          Cookie,
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "no-cache",
          pragma: "no-cache",
          "sec-websocket-extensions":
            "permessage-deflate; client_max_window_bits",
          "sec-websocket-version": "13",
        },
        agent: this._makeAgent(),
      },
    );
    this._ws = ws;
    return await new Promise((resolve) => {
      ws.on("open", () => {
        resolve(this);
        ws.send(
          JSON.stringify({
            stumble: "join",
            token: this._room.token,
            room: this._room.room,
            nick: username,
          }),
        );
        ws.on("message", (msg) => {
          if (String(msg).trim() == "0") ws.send("0");
        });
        ws.on("message", (msg) => {
          this._logger.info(JSON.parse(msg));
          (handler as any)(JSON.parse(msg));
        });
      });
    });
  }
  async register({
    day,
    month,
    year,
    email,
    username,
    password
  }) {
    await this.fetchText("https://stumblechat.com/register");
    const responseText = await (
      await this._call("https://stumblechat.com/account/register", {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json;charset=UTF-8",
          "csrf-token": this._csrf,
          "sec-ch-ua":
            '"Chromium";v="112", "Google Chrome";v="112", ";Not A Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          Referer: "https://stumblechat.com/register",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body: JSON.stringify({
          day: day || "01",
          month: month || "01",
          year: year || "1985",
          password,
          confirm: password,
          username,
          email,
        }),
        method: "POST",
      })
    ).text();
    const response = JSON.parse(responseText);
    return response;
  }
  async verify({ token }) {
    await this.fetchText("https://stumblechat.com/verify");
    const responseText = await (
      await this._call("https://stumblechat.com/account/verify", {
        headers: {
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          "content-type": "application/json;charset=UTF-8",
          "csrf-token": this._csrf,
          "sec-ch-ua":
            '"Chromium";v="112", "Google Chrome";v="112", ";Not A Brand";v="99"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          Referer: "https://stumblechat.com/verify",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body: JSON.stringify({ token }),
        method: "POST",
      })
    ).text();
    const response = JSON.parse(responseText);
    return response;
  }

  async getRooms() {
    await this.fetchText("https://stumblechat.com");
    let currentPage = 1;
    let results = [];
    while (true) {
      const resultText = await (
        await this._call("https://stumblechat.com/lbstats", {
          headers: {
            accept: "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/x-www-form-urlencoded",
            "csrf-token": this._csrf,
            "sec-ch-ua":
              '"Chromium";v="112", "Google Chrome";v="112", ";Not A Brand";v="99"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            Referer: "https://stumblechat.com/",
            "Referrer-Policy": "strict-origin-when-cross-origin",
          },
          body: "page=" + String(currentPage),
          method: "POST",
        })
      ).text();
      const result = JSON.parse(resultText);
      results = results.concat(result.rooms);
      if (result.totalPages === result.currentPage) return results;
      currentPage++;
    }
  }
  send(msg) {
    this._ws.send(msg);
  }
}
