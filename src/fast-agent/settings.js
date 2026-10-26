// [INPUT] Trusted extension settings and process-level environment.
// [OUTPUT] Private local FAST configuration and credential-free status.
// [POS] Node-only configuration boundary. [PROTOCOL] Never return or log keys.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { HOME } from '../lib/paths.js';
import { createBeatAPIClient } from './client.js';
import { buildQuestions } from './decision.js';

export const FAST_MODEL = 'jev-1.13';
const ENDPOINT = 'https://api.beatapi.io';
const invalid = () => Object.assign(new Error('Invalid FAST settings.'), { code: 'INVALID_SETTINGS' });

export function createFastSettings({
  filename = process.env.BEAT_BROWSER_FAST_CONFIG_FILE || path.join(HOME, 'fast-settings.json'),
  env = process.env, createClient = createBeatAPIClient,
} = {}) {
  function read() {
    try {
      const stat = fs.lstatSync(filename);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8192 || (stat.mode & 0o077)) throw invalid();
      const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
      if (!data || typeof data.enabled !== 'boolean' || typeof data.model !== 'string'
        || (data.apiKey !== undefined && typeof data.apiKey !== 'string')) throw invalid();
      return data;
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      // An unreadable existing configuration must fail closed, even with env opt-in.
      return { enabled: false, model: FAST_MODEL, invalid: true };
    }
  }
  function runtime(override) {
    const saved = read();
    const enabled = override !== false && env.BEAT_BROWSER_FAST_AGENT !== '0'
      && (saved ? saved.enabled : override === true || env.BEAT_BROWSER_FAST_AGENT === '1');
    const provider = { ...env };
    if (saved?.apiKey) {
      provider.BEATAPI_API_KEY = saved.apiKey;
      provider.BEATAPI_BASE_URL = ENDPOINT;
    }
    provider.BEAT_BROWSER_JEV_MODEL = saved?.model || env.BEAT_BROWSER_JEV_MODEL || FAST_MODEL;
    return { enabled, env: provider };
  }
  function status() {
    const current = runtime(env.BEAT_BROWSER_FAST_AGENT === '0' ? false : undefined);
    return { enabled: current.enabled, configured: !!current.env.BEATAPI_API_KEY,
      model: current.env.BEAT_BROWSER_JEV_MODEL, endpoint: ENDPOINT,
      savedKey: !!read()?.apiKey, invalid: read()?.invalid === true };
  }
  function write(data) {
    fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
    const temporary = `${filename}.${crypto.randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(data), { mode: 0o600, flag: 'wx' });
      fs.renameSync(temporary, filename);
    } finally { try { fs.unlinkSync(temporary); } catch { /* Already renamed. */ } }
  }
  function draft(params) {
    const saved = read();
    const model = params.model ?? saved?.model ?? env.BEAT_BROWSER_JEV_MODEL ?? FAST_MODEL;
    const apiKey = params.apiKey || saved?.apiKey || env.BEATAPI_API_KEY;
    if (typeof model !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(model)
      || typeof apiKey !== 'string' || apiKey.length > 4096 || !/^[A-Za-z0-9._~+/-]+=*$/.test(apiKey)) throw invalid();
    return { enabled: true, model, apiKey };
  }
  async function probe(data) {
    // Fixed synthetic state: connection tests never read a browser page.
    const client = createClient({ env: { BEATAPI_API_KEY: data.apiKey, BEATAPI_BASE_URL: ENDPOINT,
      BEAT_BROWSER_JEV_MODEL: data.model }, timeoutMs: 15000 });
    await client.decide({ state: { goal: 'Connection test. Choose DONE.', page: { title: 'BeatBrowser connection test' } },
      questions: buildQuestions({ operations: ['DONE'], targets: {} }) });
  }
  let queue = Promise.resolve();
  async function handleOne(params = {}) {
    if (!params || typeof params !== 'object' || Array.isArray(params)
      || Object.keys(params).some(key => !['action', 'apiKey', 'model', 'cloudConsent'].includes(key))) throw invalid();
    if (params.action === 'status') return status();
    if (params.action === 'disable' || params.action === 'forget') {
      const saved = read();
      write({ enabled: false, model: saved?.model || FAST_MODEL,
        ...(params.action === 'disable' && saved?.apiKey ? { apiKey: saved.apiKey } : {}) });
      return status();
    }
    if (!['test', 'enable'].includes(params.action) || params.cloudConsent !== true) throw invalid();
    if (params.action === 'enable' && env.BEAT_BROWSER_FAST_AGENT === '0') {
      throw Object.assign(new Error('FAST is disabled by the local process.'), { code: 'FAST_PROCESS_DISABLED' });
    }
    const data = draft(params);
    await probe(data);
    if (params.action === 'enable') write(data);
    return { ...status(), tested: true, testedModel: data.model };
  }
  return { filename, runtime, status, handle(params) {
    const result = queue.then(() => handleOne(params));
    queue = result.catch(() => {});
    return result;
  } };
}
