// [INPUT] Synthetic keys, temporary files and isolated MCP/bridge peers.
// [OUTPUT] Configuration, live gating and credential-boundary assertions.
// [POS] FAST integration tests. [PROTOCOL] No real provider or user profile.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import WebSocket from 'ws';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { ToolListChangedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { createFastSettings } from '../src/fast-agent/settings.js';
import { startBridge } from '../src/bridge.js';
import { runTask } from '../src/fast-agent/runner.js';

function fixture(t, extra = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'beat-fast-settings-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const calls = [];
  const settings = createFastSettings({ filename: path.join(directory, 'settings.json'), env: {},
    createClient: config => ({ async decide(request) { calls.push({ config, request }); return {}; } }), ...extra });
  return { directory, calls, settings };
}
const KEY = ['synthetic', 'fast', 'credential'].join('-');
const enable = { action: 'enable', cloudConsent: true, apiKey: KEY, model: 'jev-1.13' };

test('test is ephemeral; enable persists privately; status never discloses key; disable/forget revoke', async t => {
  const { settings, calls } = fixture(t);
  assert.equal(settings.status().enabled, false);
  await settings.handle({ ...enable, action: 'test' });
  assert.equal(fs.existsSync(settings.filename), false);
  assert.equal(settings.status().configured, false);
  const result = await settings.handle(enable);
  assert.equal(result.enabled, true);
  assert.equal(fs.statSync(settings.filename).mode & 0o777, 0o600);
  assert.equal(JSON.stringify(result).includes(KEY), false);
  assert.equal(calls.length, 2);
  assert.equal(JSON.stringify(calls[0].request).includes(KEY), false);
  assert.equal(settings.runtime().env.BEATAPI_API_KEY, KEY);
  assert.equal(settings.runtime(false).enabled, false, 'Remote explicit opt-out always wins');
  assert.equal((await settings.handle({ action: 'disable' })).enabled, false);
  assert.equal(settings.status().configured, true);
  assert.equal(settings.runtime(true).enabled, false, 'UI disable revokes a CLI startup opt-in');
  await settings.handle({ action: 'forget' });
  assert.equal(settings.status().configured, false);
  assert.equal(fs.readFileSync(settings.filename, 'utf8').includes(KEY), false);
});

test('consent and fixed endpoint are enforced; failed probes cannot enable or replace a working key', async t => {
  let failed = false;
  const { settings } = fixture(t, { env: { BEATAPI_BASE_URL: 'https://untrusted.test' },
    createClient: ({ env }) => ({ async decide() {
      assert.equal(env.BEATAPI_BASE_URL, 'https://api.beatapi.io');
      if (failed) throw Object.assign(Error('private provider detail'), { code: 'PROVIDER_HTTP_ERROR' });
    } }) });
  await assert.rejects(settings.handle({ ...enable, cloudConsent: false }), { code: 'INVALID_SETTINGS' });
  await assert.rejects(settings.handle({ ...enable, baseUrl: 'https://untrusted.test' }), { code: 'INVALID_SETTINGS' });
  await settings.handle(enable);
  const before = fs.readFileSync(settings.filename, 'utf8');
  failed = true;
  await assert.rejects(settings.handle({ ...enable, apiKey: 'another-synthetic-value' }), { code: 'PROVIDER_HTTP_ERROR' });
  assert.equal(fs.readFileSync(settings.filename, 'utf8'), before);
  assert.equal(settings.runtime().env.BEATAPI_BASE_URL, 'https://api.beatapi.io');
});

test('unreadable, broad-permission and symlinked settings fail closed', async t => {
  const { settings, directory } = fixture(t, { env: { BEAT_BROWSER_FAST_AGENT: '1' } });
  fs.writeFileSync(settings.filename, 'malformed', { mode: 0o600 });
  assert.equal(settings.runtime(true).enabled, false);
  fs.writeFileSync(settings.filename, JSON.stringify(enable));
  fs.chmodSync(settings.filename, 0o644);
  assert.equal(settings.runtime(true).enabled, false);
  fs.unlinkSync(settings.filename);
  const target = path.join(directory, 'target.json');
  fs.writeFileSync(target, JSON.stringify({ enabled: true, model: 'jev-1.13', apiKey: KEY }), { mode: 0o600 });
  fs.symlinkSync(target, settings.filename);
  assert.equal(settings.runtime(true).enabled, false);
});

test('a disable requested during connection testing wins after the pending enable', async t => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const { settings } = fixture(t, { createClient: () => ({ decide: () => wait }) });
  const enabling = settings.handle(enable);
  const disabling = settings.handle({ action: 'disable' });
  release({});
  await Promise.all([enabling, disabling]);
  assert.equal(settings.status().enabled, false);
});

test('process-level explicit opt-out cannot be bypassed by saved settings or CLI opt-in', async t => {
  const { settings } = fixture(t, { env: { BEAT_BROWSER_FAST_AGENT: '0' } });
  fs.writeFileSync(settings.filename, JSON.stringify({ enabled: true, model: 'jev-1.13', apiKey: KEY }), { mode: 0o600 });
  await assert.rejects(settings.handle(enable), { code: 'FAST_PROCESS_DISABLED' });
  assert.equal(settings.runtime(true).enabled, false);
  assert.equal(settings.status().enabled, false);
});

test('MCP discovers UI-enabled FAST without restart and rejects it immediately after disable', { timeout: 10000 }, async t => {
  const { settings } = fixture(t);
  const transport = new StdioClientTransport({ command: process.execPath,
    args: ['src/cli.js', 'mcp'], cwd: path.resolve(import.meta.dirname, '..'), stderr: 'pipe',
    env: { ...process.env, BEAT_BROWSER_FAST_AGENT: '', BEATAPI_API_KEY: '', BEAT_BROWSER_FAST_CONFIG_FILE: settings.filename } });
  const client = new Client({ name: 'settings-test', version: '1.0.0' });
  t.after(() => client.close());
  let changes = 0;
  client.setNotificationHandler(ToolListChangedNotificationSchema, () => { changes++; });
  await client.connect(transport);
  assert.equal((await client.listTools()).tools.some(tool => tool.name === 'browser_task'), false);
  await settings.handle(enable);
  assert.equal((await client.listTools()).tools.some(tool => tool.name === 'browser_task'), true);
  const args = { cloudConsent: true, dryRun: true, url: 'https://example.com', goal: 'Check example' };
  assert.equal(JSON.parse((await client.callTool({ name: 'browser_task', arguments: args })).content[0].text).status, 'dry_run');
  const until = Date.now() + 3000;
  while (!changes && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 50));
  assert(changes > 0, 'Advertise the updated tool list to clients');
  await settings.handle({ action: 'disable' });
  assert.equal(JSON.parse((await client.callTool({ name: 'browser_task', arguments: args })).content[0].text).status, 'disabled');
});

test('runner rechecks the switch before any browser command after revocation', async t => {
  const { directory } = fixture(t);
  let enabled = true, observed = 0;
  const result = await runTask({ enabled: true, url: 'https://example.com', goal: 'Test revocation',
    tracePath: path.join(directory, 'trace.jsonl') }, {
    client: {}, isEnabled: () => enabled,
    adapter: { open: async () => { enabled = false; return { tabId: 1 }; },
      observe: async () => { observed++; }, abort: async () => {}, close() {} },
  });
  assert.equal(result.blockedReason, 'FAST_AGENT_DISABLED');
  assert.equal(observed, 0);
});

test('settings wire replies only to its extension and never enters audit or agent broadcast', { timeout: 5000 }, async t => {
  const { settings } = fixture(t);
  const audit = [];
  const bridge = startBridge({ port: 0, writeInfo: false, fastSettings: settings, auditFn: entry => audit.push(entry) });
  await bridge.ready;
  t.after(() => bridge.close());
  const socket = new WebSocket(`ws://127.0.0.1:${bridge.wss.address().port}`, { headers: { Origin: 'chrome-extension://settings-test' } });
  t.after(() => socket.close());
  await once(socket, 'open');
  socket.send(JSON.stringify({ type: 'hello', role: 'extension', instanceId: 'settings-test', version: '1.4.1' }));
  await once(socket, 'message');
  socket.send(JSON.stringify({ type: 'fast_settings', id: 'test-1', params: enable }));
  const [raw] = await once(socket, 'message');
  const response = JSON.parse(raw);
  assert.equal(response.type, 'fast_settings_result');
  assert.equal(response.data.enabled, true);
  assert.equal(raw.toString().includes(KEY), false);
  assert.equal(JSON.stringify(audit).includes(KEY), false);
});
