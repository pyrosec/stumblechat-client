"use strict";
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const tough = __importStar(require("tough-cookie"));
const set_cookie_parser_1 = require("set-cookie-parser");
// Credit <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/utils/is.js#L68>.
function isDomainOrSubdomain(destination, original) {
    const orig = new URL(original).hostname;
    const dest = new URL(destination).hostname;
    return orig === dest || orig.endsWith(`.${dest}`);
}
// Credit <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/utils/referrer.js#L60>.
const referrerPolicy = new Set([
    '',
    'no-referrer',
    'no-referrer-when-downgrade',
    'same-origin',
    'origin',
    'strict-origin',
    'origin-when-cross-origin',
    'strict-origin-when-cross-origin',
    'unsafe-url'
]);
// Credit <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/utils/referrer.js#L320>.
function parseReferrerPolicy(policyHeader) {
    const policyTokens = policyHeader.split(/[,\s]+/);
    let policy = '';
    for (const token of policyTokens) {
        if (token !== '' && referrerPolicy.has(token)) {
            policy = token;
        }
    }
    return policy;
}
function doNothing(init, name) { }
function callDeleteMethod(init, name) {
    init.headers.delete(name);
}
function deleteFromObject(init, name) {
    const headers = init.headers;
    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === name) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete headers[key];
        }
    }
}
function identifyDeleteHeader(init) {
    if (init.headers == null) {
        return doNothing;
    }
    if (typeof init.headers.delete === 'function') {
        return callDeleteMethod;
    }
    return deleteFromObject;
}
// Credit <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/utils/is-redirect.js>.
const redirectStatus = new Set([301, 302, 303, 307, 308]);
function isRedirect(status) {
    return redirectStatus.has(status);
}
// Adapted from <https://github.com/node-fetch/node-fetch/blob/5e78af3ba7555fa1e466e804b2e51c5b687ac1a2/src/index.js#L161>.
async function handleRedirect(fetchImpl, init, response) {
    switch (init.redirect ?? 'follow') {
        case 'error':
            throw new TypeError(`URI requested responded with a redirect and redirect mode is set to error: ${response.url}`);
        case 'manual':
            return response;
        case 'follow':
            break;
        default:
            throw new TypeError(`Invalid redirect option: ${init.redirect}`);
    }
    const locationUrl = response.headers.get('location');
    if (locationUrl === null) {
        return response;
    }
    // We can use `response.url` here since we force `redirect` to `manual`.
    const requestUrl = response.url;
    const redirectUrl = new URL(locationUrl, requestUrl).toString();
    const redirectCount = init.redirectCount ?? 0;
    const maxRedirect = init.maxRedirect ?? 20;
    if (redirectCount >= maxRedirect) {
        throw new TypeError(`Reached maximum redirect of ${maxRedirect} for URL: ${requestUrl}`);
    }
    init = {
        ...init,
        redirectCount: redirectCount + 1
    };
    const deleteHeader = identifyDeleteHeader(init);
    // Do not forward sensitive headers to third-party domains.
    if (!isDomainOrSubdomain(requestUrl, redirectUrl)) {
        for (const name of ['authorization', 'www-authenticate', 'cookie', 'cookie2']) {
            deleteHeader(init, name);
        }
    }
    const maybeNodeStreamBody = init.body;
    const maybeStreamBody = init.body;
    if (response.status !== 303 && init.body != null && (typeof maybeNodeStreamBody.pipe === 'function' || typeof maybeStreamBody.pipeTo === 'function')) {
        throw new TypeError('Cannot follow redirect with body being a readable stream');
    }
    if (response.status === 303 || ((response.status === 301 || response.status === 302) && init.method === 'POST')) {
        init.method = 'GET';
        init.body = undefined;
        deleteHeader(init, 'content-length');
    }
    if (response.headers.has('referrer-policy')) {
        init.referrerPolicy = parseReferrerPolicy(response.headers.get('referrer-policy'));
    }
    return await fetchImpl(redirectUrl, init);
}
function addCookiesToRequest(input, init, cookie) {
    if (cookie === '') {
        return init;
    }
    const maybeRequest = input;
    const maybeHeaders = init.headers;
    if (maybeRequest.headers && typeof maybeRequest.headers.append === 'function') {
        maybeRequest.headers.append('cookie', cookie);
    }
    else if (maybeHeaders && typeof maybeHeaders.append === 'function') {
        maybeHeaders.append('cookie', cookie);
    }
    else {
        init = { ...init, headers: { ...init.headers, cookie } };
    }
    return init;
}
function getCookiesFromResponse(response) {
    const maybeNodeFetchHeaders = response.headers;
    if (typeof maybeNodeFetchHeaders.getAll === 'function') {
        // node-fetch v1
        return maybeNodeFetchHeaders.getAll('set-cookie').concat(maybeNodeFetchHeaders.getAll('Set-Cookie'));
    }
    if (typeof maybeNodeFetchHeaders.raw === 'function') {
        // node-fetch v2
        const headers = maybeNodeFetchHeaders.raw();
        if (Array.isArray(headers['Set-Cookie'])) {
            return headers['Set-Cookie'];
        }
        if (Array.isArray(headers['set-cookie'])) {
            return headers['set-cookie'];
        }
        return [];
    }
    // WhatWG `fetch`
    const cookieString = response.headers.get('set-cookie') || response.headers.get('Set-Cookie');
    if (cookieString !== null) {
        return (0, set_cookie_parser_1.splitCookiesString)(cookieString);
    }
    return [];
}
function fetchCookie(fetch, jar, ignoreError = true) {
    const actualFetch = fetch;
    const actualJar = jar ?? new tough.CookieJar();
    async function fetchCookieWrapper(input, init) {
        // Keep track of original init for the `redirect` property that we hijack.
        const originalInit = init ?? {};
        // Force manual redirects to forward cookies during redirects.
        init = { ...init, redirect: 'manual' };
        // Resolve request URL.
        //
        // FWIW it seems that `fetch` allows passing an URL object e.g. with a `href` property, but
        // TypeScript's `RequestInfo` type doesn't know about that, hence the `any` to still check for it.
        //
        // TypeScript is still so very fragile...
        const requestUrl = typeof input === 'string' ? input : (input.url ?? input.href);
        // Get matching cookie for resolved request URL.
        const cookie = await actualJar.getCookieString(requestUrl);
        // Add cookie header to request.
        init = addCookiesToRequest(input, init, cookie);
        // Proxy to `fetch` implementation.
        const response = await actualFetch(input, init);
        // Get response cookies.
        const cookies = getCookiesFromResponse(response);
        // Store cookies in the jar for that URL.
        await Promise.all(cookies.map(async (cookie) => await actualJar.setCookie(cookie, response.url, { ignoreError })));
        // Do this check here to allow tail recursion of redirect.
        if ((init.redirectCount ?? 0) > 0) {
            Object.defineProperty(response, 'redirected', { value: true });
        }
        if (!isRedirect(response.status)) {
            return response;
        }
        // Recurse into redirect.
        return await handleRedirect(fetchCookieWrapper, originalInit, response);
    }
    fetchCookieWrapper.toughCookie = tough;
    return fetchCookieWrapper;
}
exports.default = fetchCookie;
fetchCookie.toughCookie = tough;
//# sourceMappingURL=fetch-cookie.js.map