import { SocksProxyAgent } from "socks-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
export declare const objectToProxyString: (o: any) => string;
export declare class Stumblechat {
    proxyOptions: any;
    _jar: any;
    _csrf: string;
    _userAgent: string;
    _room: any;
    _ws: any;
    _username: string;
    constructor(o?: any);
    _makeAgent(): SocksProxyAgent | HttpsProxyAgent<any>;
    toObject(): {
        jar: any;
        csrf: string;
        userAgent: string;
        room: any;
    };
    static fromObject({ jar, csrf, userAgent, room }: {
        jar: any;
        csrf: any;
        userAgent: any;
        room: any;
    }): Stumblechat;
    static fromJSON(s: string): Stumblechat;
    toJSON(): string;
    _call(uri: string, config?: any): Promise<any>;
    fetchText(uri: any, config?: any): Promise<any>;
    login({ username, password, rememberme }: any): Promise<any>;
    chooseRoom({ room }: {
        room: any;
    }): Promise<any>;
    attach({ handler, username }: {
        handler: any;
        username: any;
    }): Promise<unknown>;
    send(msg: any): void;
}
