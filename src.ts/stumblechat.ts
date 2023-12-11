import makeFetchCookie from "./fetch-cookie";
import fetch from "node-fetch";
import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import url from "url";
import cheerio from "cheerio";

export const objectToProxyString = (o: any) => {
  return (
    (o.protocol === "socks" ? "socks5://" : "http://") +
    (o.userId ? o.userId + ":" + o.password + "@" : "") +
    o.hostname +
    (o.port ? ":" + o.port : "")
  );
};

const deserializeSync = (s) =>
  s && makeFetchCookie.toughCookie.CookieJar.fromJSON(s) || new makeFetchCookie.toughCookie.CookieJar();

const serializeSync = (jar) => (jar as any).serializeSync() as any;

export class Stumblechat {
  public proxyOptions: any;
  public _jar: any;
  public _csrf: string;
  public _userAgent: string;
  constructor(o?: any) {
    o = o || {};
    this._jar = o.jar || new makeFetchCookie.toughCookie.CookieJar();
    this._csrf = o.csrf || null;
    this._userAgent = o.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36';
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
    return { jar: serializeSync(this._jar), csrf: this._csrf, userAgent: this._userAgent };
  }
  static fromObject({ jar, csrf, userAgent }) {
    return new this({ jar: deserializeSync(jar), csrf, userAgent });
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
    const finalConfig = Object.assign({ method: 'GET', headers: {} }, config || {});
    finalConfig.headers = Object.assign(finalConfig.headers || {}, {
      'User-Agent': this._userAgent
    });
    return await _fetch(uri, finalConfig);
  }
  async fetchText(uri, config: any = {}) {
    const responseText = await (await this._call(uri, config)).text();
    const $ = cheerio.load(responseText);
    this._csrf = $('meta[name="_csrf"]').attr("content");
    this._jar.setCookie('_csrf=' + this._csrf, '.stumblechat.com'); 
    return responseText;
  }
  async login({ username, password, rememberme = true }: any) {
    await this.fetchText("https://stumblechat.com/login");
    const fetchCookie = makeFetchCookie(fetch, this._jar) as any;
    const response = await this._call(
      "https://stumblechat.com/account/login",
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
      },
    );
    const responseJson = await response.json();
    return responseJson;
  }
  async chooseRoom({ room }) {
    await this.fetchText('https://stumblechat.com');
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
    return await response.json();
  }
}
