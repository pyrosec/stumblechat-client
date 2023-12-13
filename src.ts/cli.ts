import { Stumblechat, objectToProxyString } from "./stumblechat";
import yargs from "yargs";
import { camelCase } from "change-case";
import fs from "fs-extra";
import util from "util";
import url from "url";
import "setimmediate";
import { mkdirp } from "mkdirp"
import path from "path";
import { getLogger } from "./logger";

const logger = getLogger();

export async function saveSession(stumblechat, json = false, filename = 'session.json') {
  await mkdirp(path.join(process.env.HOME, '.stumblechat'));

  await fs.writeFile(path.join(process.env.HOME, '.stumblechat', filename), stumblechat.toJSON());
  if (!json) logger.info('saved to ~/' + path.join('.stumblechat', filename));
}
  

export async function initSession() {
  const proxyOptions = await loadProxy();
  const stumblechat = new Stumblechat();
  stumblechat.proxyOptions = proxyOptions;
  await saveSession(stumblechat);
}

export async function loadSession() {
  const proxyOptions = await loadProxy();
  const stumblechat = Stumblechat.fromJSON(await fs.readFile(path.join(process.env.HOME, '.stumblechat', 'session.json')));
  stumblechat.proxyOptions = proxyOptions;
  return stumblechat;
}

export const proxyStringToObject = (proxyUri: string) => {
  const parsed = url.parse(proxyUri);
  const [ username, ...passwordParts ] = (parsed.auth || '').split(':')
  return {
    hostname: parsed.hostname,
    port: parsed.port,
    userId: username || null,
    password: passwordParts.join(':') || null
  };
};

export async function setProxy(proxyUri: string) {
  await mkdirp(path.join(process.env.HOME, '.stumblechat'));
  const proxyOptions = proxyStringToObject(proxyUri);
  const joined = objectToProxyString(proxyOptions);
  await fs.writeFile(path.join(process.env.HOME, '.stumblechat', 'proxy'), joined);
  logger.info('set-proxy: ' + joined);
}

export async function unsetProxy() {
  await mkdirp(path.join(process.env.HOME, '.stumblechat'));
  await fs.unlink(path.join(process.env.HOME, '.stumblechat', 'proxy'));
  logger.info('unset-proxy');
}

export async function loadProxy() {
  await mkdirp(path.join(process.env.HOME, '.stumblechat'));
  try {
    return await fs.readFile(path.join(process.env.HOME, '.stumblechat', 'proxy'), 'utf8');
  } catch (e) {
    return null;
  }
}


export async function callAPI(command, data) {
  const stumblechat = await loadSession();
  const camelCommand = camelCase(command);
  const json = data.j || data.json;
  const repl = data.repl;
  const insecure = data.i || data.insecure;
  delete data.i;
  delete data.insecure;
  if (insecure) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  delete data.j
  delete data.json;
  delete data.repl;
  if (!stumblechat[camelCommand]) throw Error('command not foud: ' + command);
  const result = await stumblechat[camelCommand](data);
  if (repl) {
    const r = require('repl').start('> ');
    r.context.result = result;
    await new Promise(() => {});
    return result;
  } else if (json) console.log(JSON.stringify(result, null, 2));
  else logger.info(result);
  await saveSession(stumblechat, json);
  return result;
}

export async function saveSessionAs(name) {
  const stumblechat = await loadSession();
  await saveSession(stumblechat, false, name + '.json');
}

export async function loadSessionFrom(name) {
  const stumblechat = Stumblechat.fromObject(require(path.join(process.env.HOME, '.stumblechat', name)));
  await saveSession(stumblechat);
}


export async function loadFiles(data: any) {
  const fields = [];
  for (let [ k, v ] of Object.entries(data)) {
    const parts = /(^.*)FromFile$/.exec(k);
    if (parts) {
      const key = parts[1];
      fields.push([key, await fs.readFile(v)]);
    } else {
      fields.push([k, v]);
    }
  }
  return fields.reduce((r, [k, v]) => {
    r[k] = v;
    return r;
  }, {});
}
      

export async function runCLI() {
  const [ command ] = yargs.argv._;
  const options = Object.assign({}, yargs.argv);
  delete options._;
  const data = await loadFiles(Object.entries(options).reduce((r, [ k, v ]) => {
    r[camelCase(k)] = String(v);
    return r;
  }, {}));
  if (data.address && data.address.indexOf(',') !== -1) data.address = data.address.split(',');
  switch (command) {
    case 'init':
      return await initSession();
      break;
    case 'set-proxy':
      return await setProxy(yargs.argv._[1]);
      break;
    case 'unset-proxy':
      return await unsetProxy();
      break;
    case 'save':
      return await saveSessionAs(yargs.argv._[1]);
      break;
    case 'load':
      return await loadSessionFrom(yargs.argv._[1]);
      break;
    default: 
      return await callAPI(yargs.argv._[0], data);
      break;
  }
}
