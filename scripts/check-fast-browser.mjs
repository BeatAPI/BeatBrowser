// [INPUT] Disposable Chromium profile; synthetic responses or explicit --live opt-in.
// [OUTPUT] Real popup, bridge and browser-executor acceptance with screenshots.
// [POS] Local acceptance. [PROTOCOL] Live calls require --live and a process key.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import WebSocket from 'ws';
import { browserTestArgs } from './browser-test-launch.mjs';
import { startBridge } from '../src/bridge.js';
import { createFastSettings } from '../src/fast-agent/settings.js';
import { createBeatAPIClient } from '../src/fast-agent/client.js';
import { runTask } from '../src/fast-agent/runner.js';

const binary = process.env.BEAT_TEST_CHROME;
if (!binary) throw Error('Set BEAT_TEST_CHROME to Chrome for Testing.');
const live = process.argv.includes('--live');
if (live && !process.env.BEATAPI_API_KEY) throw Error('Live acceptance requires a process-level BeatAPI key.');
const root = path.resolve(import.meta.dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'beat-spaces-fast-'));
const key = live ? process.env.BEATAPI_API_KEY : ['synthetic', 'browser', 'test'].join('-');
let providerCalls = 0;
const providerChecks = [];
const fetchImpl = async (_url, options) => {
  providerCalls++;
  if (live) {
    assert.equal(_url, 'https://api.beatapi.io/v1/systemone');
    const started = Date.now();
    const response = await fetch(_url, options);
    providerChecks.push({ status: response.status, latencyMs: Date.now() - started });
    return response;
  }
  if (options.headers.Authorization !== `Bearer ${key}`) return new Response('{}', { status: 401 });
  assert(!options.body.includes(key));
  const { questions } = JSON.parse(options.body);
  const answers = Object.fromEntries(Object.entries(questions).map(([head, question]) => {
    const ids = Object.keys(question.criteria);
    const choice = head === 'operation' && ids.includes('CLICK') ? 'CLICK' : ids[0];
    return [head, { type: 'choice', choice, confidence: 1,
      probabilities: Object.fromEntries(ids.map(id => [id, id === choice ? 1 : 0])) }];
  }));
  return Response.json({ answers });
};
const settings = createFastSettings({ filename: path.join(tmp, 'fast.json'), env: {},
  createClient: config => createBeatAPIClient({ ...config, fetchImpl }) });
const bridge = startBridge({ port: 0, writeInfo: false, fastSettings: settings, auditFn: () => {} });
await bridge.ready;
const port = bridge.wss.address().port;
const extension = path.join(tmp, 'extension');
fs.cpSync(path.join(root, 'extension'), extension, { recursive: true });
for (const file of ['background.js', 'offscreen.js']) {
  const filename = path.join(extension, file);
  fs.writeFileSync(filename, fs.readFileSync(filename, 'utf8')
    .replace('const PORTS = [18899, 18900, 18901, 18902, 18903];', `const PORTS = [${port}];`));
}
const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json')));
const id = [...createHash('sha256').update(Buffer.from(manifest.key, 'base64')).digest('hex').slice(0, 32)]
  .map(char => String.fromCharCode(97 + parseInt(char, 16))).join('');
const fixture = http.createServer((_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end('<!doctype html><title>FAST fixture</title><h1>FAST browser test</h1><button onclick="document.querySelector(\'output\').textContent=\'FAST verified\'">Verify FAST</button><output>Ready</output>');
});
fixture.listen(0, '127.0.0.1'); await once(fixture, 'listening');
const url = `http://127.0.0.1:${fixture.address().port}`;
const browserEnv = { ...process.env };
delete browserEnv.BEATAPI_API_KEY;
const browser = spawn(binary, browserTestArgs({ temporaryDirectory: tmp, extensionDirectory: extension, url }),
  { stdio: 'ignore', env: browserEnv });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async check => {
  const end = Date.now() + 15000;
  while (!await check()) { if (Date.now() > end) throw Error('Isolated FAST acceptance timed out'); await sleep(100); }
};
let cdp, agent;
const pending = new Map();
let seq = 0;
try {
  const devtools = path.join(tmp, 'profile', 'DevToolsActivePort');
  await until(() => fs.existsSync(devtools));
  const [debugPort, route] = fs.readFileSync(devtools, 'utf8').trim().split('\n');
  cdp = new WebSocket(`ws://127.0.0.1:${debugPort}${route}`); await once(cdp, 'open');
  cdp.on('message', raw => {
    const message = JSON.parse(raw), waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id); clearTimeout(waiter.timer);
    message.error ? waiter.reject(Error(message.error.message)) : waiter.resolve(message.result);
  });
  const command = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer }); cdp.send(JSON.stringify({ id, method, params, sessionId }));
  });
  const { targetId } = await command('Target.createTarget', { url: `chrome-extension://${id}/popup.html` });
  const { sessionId } = await command('Target.attachToTarget', { targetId, flatten: true });
  const evaluate = async expression => {
    const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  await until(() => evaluate("!!document.querySelector('#fast-status')"));
  await evaluate("chrome.storage.local.set({uiLanguage:'en'})");
  await until(() => evaluate("document.querySelector('#fast-status')?.textContent === 'Off'"));
  assert.equal(await evaluate("document.querySelector('details.adv').open"), false);
  assert.equal(await evaluate("document.querySelector('#fast-form').hidden"), true);
  assert.equal(await evaluate("!!document.querySelector('details.adv .fast-card')"), true);
  assert.equal(await evaluate("!!(document.querySelector('.spaces').compareDocumentPosition(document.querySelector('.fast-card')) & Node.DOCUMENT_POSITION_FOLLOWING)"), true);
  const capture = async name => {
    await command('Emulation.setDeviceMetricsOverride', { width: 340, height: 760, deviceScaleFactor: 1, mobile: false }, sessionId);
    const image = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
    const filename = path.join(root, 'screenshots-local', name);
    fs.mkdirSync(path.dirname(filename), { recursive: true }); fs.writeFileSync(filename, Buffer.from(image.data, 'base64'));
    return filename;
  };
  await evaluate("chrome.storage.local.set({uiLanguage:'zh'})");
  await until(() => evaluate("document.documentElement.lang === 'zh-CN'"));
  const defaultScreenshot = await capture('fast-default-zh.png');
  await evaluate("document.querySelector('details.adv > summary').click()");
  assert.equal(await evaluate("document.querySelector('#fast-form').hidden"), true, 'Opening Settings alone must not reveal API fields');
  const settingsScreenshot = await capture('fast-settings-zh.png');
  await evaluate("chrome.storage.local.set({uiLanguage:'en'})");
  await until(() => evaluate("document.documentElement.lang === 'en'"));
  await evaluate("document.querySelector('#fast-configure').click()");
  assert.equal(await evaluate("document.querySelector('#fast-form').hidden"), false);
  assert.equal(await evaluate("document.querySelector('#fast-configure').getAttribute('aria-expanded')"), 'true');
  await evaluate("document.querySelector('#fast-key').value='unsaved-draft'; document.querySelector('details.adv > summary').click()");
  await until(() => evaluate("document.querySelector('#fast-form').hidden"));
  assert.equal(await evaluate("document.querySelector('#fast-key').value === ''"), true);
  await evaluate("document.querySelector('details.adv > summary').click()");
  assert.equal(await evaluate("document.querySelector('#fast-form').hidden"), true);
  await evaluate("document.querySelector('#fast-configure').click()");
  await evaluate("document.querySelector('#fast-test').click()");
  assert.equal(providerCalls, 0, 'No model call before consent');
  if (!live) {
    await evaluate(`document.querySelector('#fast-key').value='wrong-synthetic-key'; document.querySelector('#fast-consent').checked=true; document.querySelector('#fast-test').click()`);
    await until(() => evaluate("document.querySelector('#fast-message').textContent.includes('BeatAPI rejected')"));
    assert.equal(settings.status().enabled, false);
    await evaluate(`document.querySelector('#fast-key').value=${JSON.stringify(key)}; document.querySelector('#fast-test').click()`);
    await until(() => evaluate("document.querySelector('#fast-message').textContent.includes('connection verified')"));
    assert.equal(fs.existsSync(settings.filename), false, 'Test must not save');
  } else {
    // Do not spend real credits on negative-key tests or a redundant test request.
    await evaluate(`document.querySelector('#fast-key').value=${JSON.stringify(key)}; document.querySelector('#fast-consent').checked=true`);
  }
  await evaluate("document.querySelector('#fast-enable').click()");
  await until(async () => {
    if (await evaluate("document.querySelector('#fast-message').dataset.error === 'true'")) {
      throw Error(await evaluate("document.querySelector('#fast-message').textContent"));
    }
    return evaluate("document.querySelector('#fast-status').textContent === 'On'");
  });
  assert.equal(settings.status().enabled, true);
  assert.equal(await evaluate("document.querySelector('#fast-key').value === ''"), true);
  assert.equal(await evaluate(`Promise.all([chrome.storage.local.get(null),chrome.storage.session.get(null)]).then(x=>JSON.stringify(x).includes(${JSON.stringify(key)}))`), false);
  // Connect an authenticated synthetic outer agent to the same real extension.
  agent = new WebSocket(`ws://127.0.0.1:${port}`); await once(agent, 'open');
  const waiting = new Map(); let n = 0;
  agent.on('message', raw => {
    const message = JSON.parse(raw), waiter = waiting.get(message.id);
    if (waiter) { waiting.delete(message.id); clearTimeout(waiter.timer); message.ok ? waiter.resolve(message.data) : waiter.reject(Error(message.error?.message)); }
  });
  agent.send(JSON.stringify({ type: 'hello', role: 'agent', client: 'fast-test', sessionId: 'fast-isolated', token: bridge.token }));
  await once(agent, 'message');
  const rpc = { ws: agent, extensionOnline: true, close() {}, call(cmd, params, options) {
    return new Promise((resolve, reject) => {
      const id = `f${++n}`, timer = setTimeout(() => { waiting.delete(id); reject(Error('Browser command timeout')); }, 10000);
      waiting.set(id, { resolve, reject, timer });
      agent.send(JSON.stringify({ type: 'cmd', id, cmd, params, tabId: options?.tabId }));
    });
  } };
  const result = await runTask({ enabled: true, url, goal: 'Click Verify FAST.', clickNames: ['Verify FAST'],
    assertions: [{ textContains: 'FAST verified' }], tracePath: path.join(tmp, 'trace.jsonl'),
    maxSteps: 3, maxModelCalls: 3, timeoutMs: 20000 },
  { bridge: rpc, env: settings.runtime().env, fetchImpl, isEnabled: () => settings.runtime().enabled });
  assert.equal(result.status, 'completed', JSON.stringify(result));
  assert.equal(result.verified, true);
  assert(result.metrics.jevCalls > 0);
  const rejected = await evaluate(`chrome.scripting.executeScript({target:{tabId:${result.tabId}},
    func:async()=>chrome.runtime.sendMessage({__hcPopup:'fastSettings',params:{action:'disable'}})}).then(rows=>rows[0].result)`);
  assert.equal(rejected.error, 'FAST_UI_REQUIRED');
  assert.equal(settings.status().enabled, true, 'Content scripts cannot change FAST setup');
  await evaluate("chrome.storage.local.set({uiLanguage:'zh'})");
  await until(() => evaluate("document.querySelector('#fast-status').textContent === '\u5df2\u5f00\u542f'"));
  await evaluate("document.querySelector('#fast-configure').click()");
  await evaluate("document.querySelector('.fast-card').scrollIntoView({block:'start'})");
  await command('Emulation.setDeviceMetricsOverride', { width: 340, height: 850, deviceScaleFactor: 1, mobile: false }, sessionId);
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  const shot = await command('Page.captureScreenshot', { format: 'png' }, sessionId);
  const output = path.join(root, 'screenshots-local', live ? 'fast-entry-live-zh.png' : 'fast-entry-zh.png');
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, Buffer.from(shot.data, 'base64'));
  await command('Page.navigate', { url: `chrome-extension://${id}/panel.html` }, sessionId);
  await until(() => evaluate("document.querySelector('#fast-status')?.textContent === '\u5df2\u5f00\u542f'"));
  assert.equal(await evaluate("document.querySelector('details.adv').open"), false);
  assert.equal(await evaluate("document.querySelector('#fast-form').hidden"), true);
  assert.equal(await evaluate("document.querySelector('#fast-key').value === ''"), true, 'Fresh sidebar cannot retrieve the saved key');
  await evaluate("document.querySelector('details.adv > summary').click()");
  await evaluate("document.querySelector('#fast-configure').click()");
  await evaluate("document.querySelector('#fast-disable').click()");
  await until(() => evaluate("document.querySelector('#fast-status').textContent === '\u5df2\u5173\u95ed'"));
  await evaluate("document.querySelector('#fast-forget').click()");
  await until(() => evaluate("document.querySelector('#fast-message').textContent.includes('\u5df2\u79fb\u9664')"));
  assert.equal(settings.status().configured, false);
  const report = { popup: true, consent: true, rejectedKey: live ? 'covered in offline acceptance' : true,
    tasksFirst: true, settingsCollapsedByDefault: true, apiFieldsRequireConfigure: true, unsavedKeyClearedOnSettingsClose: true,
    ephemeralTest: live ? 'covered in offline acceptance' : true,
    enableDisableForget: true, noKeyInChromeStorage: true, contentScriptRejected: true,
    sidebarPersistence: true, chinese: true, noOverflow: true,
    browserTask: { status: result.status, verified: result.verified, jevCalls: result.metrics.jevCalls, actions: result.metrics.actions },
    provider: live ? 'live BeatAPI /v1/systemone' : 'synthetic responses; no real JEV request',
    model: settings.status().model, providerCalls, providerChecks, screenshot: output, defaultScreenshot, settingsScreenshot };
  const reportPath = path.join(root, 'screenshots-local', live ? 'fast-live-results.json' : 'fast-offline-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  for (const entry of pending.values()) clearTimeout(entry.timer);
  cdp?.close(); agent?.close(); browser.kill(); bridge.close(); fixture.close();
  await once(browser, 'exit').catch(() => {});
  fs.rmSync(tmp, { recursive: true, force: true });
}
