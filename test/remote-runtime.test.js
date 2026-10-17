// [INPUT] Isolated CLI processes, an ephemeral bridge and a synthetic extension.
// [OUTPUT] Background lifecycle and HTTP MCP-to-stdio-to-extension verification.
// [POS] Remote integration test. [PROTOCOL] Never touch user credentials or real Chrome.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import WebSocket from 'ws';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { startBridge } from '../src/bridge.js';
import { VERSION } from '../src/lib/version.js';
import { remoteStore } from '../src/remote/store.js';

const exec = promisify(execFile);
const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));

test('isolated background adapter drives a synthetic extension through the real stdio pipeline', { timeout: 30000 }, async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'beatbrowser-remote-runtime-'));
  const fakeHome = path.join(directory, 'home');
  fs.mkdirSync(fakeHome);
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/TOKEN|KEY|SECRET|AUTH/i.test(key)));
  // Match the existing package-check isolation strategy; only child processes use this home.
  env.HOME = fakeHome; env.USERPROFILE = fakeHome; env.BEAT_BROWSER_FAST_AGENT = '0';
  const invoke = async args => {
    const result = await exec(process.execPath, [cli, 'remote', ...args], { env, timeout: 12000 });
    return JSON.parse(result.stdout);
  };
  let remoteStarted = false;
  const bridge = startBridge({ port: 0, writeInfo: false, token: 'synthetic-remote-runtime', auditFn: () => {} });
  await bridge.ready;
  t.after(async () => {
    if (remoteStarted) await invoke(['stop']).catch(() => {});
    bridge.close();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const port = bridge.wss.address().port;
  const extension = new WebSocket(`ws://127.0.0.1:${port}`, { headers: { Origin: 'chrome-extension://synthetic-remote-test' } });
  t.after(() => extension.terminate());
  const commands = [];
  extension.on('message', bytes => {
    const message = JSON.parse(bytes.toString());
    if (message.type !== 'cmd') return;
    commands.push(message);
    extension.send(JSON.stringify({ type: 'res', id: message.id, __k: message.__k, ok: true,
      data: { text: 'Synthetic page, no personal browser', untrusted: true, meta: { tabId: message.tabId } } }));
  });
  await once(extension, 'open');
  const welcome = once(extension, 'message');
  extension.send(JSON.stringify({ type: 'hello', role: 'extension', version: VERSION, instanceId: 'synthetic-cloud-profile' }));
  await welcome;
  const added = await invoke(['add', 'grok']);
  assert.equal(added.id, 'grok');
  const store = remoteStore(path.join(fakeHome, '.beat-browser', 'remote'));
  const token = store.token('grok');
  assert.ok(!JSON.stringify(added).includes(token));
  fs.writeFileSync(path.join(fakeHome, '.beat-browser', 'bridge.json'), JSON.stringify({
    pid: process.pid, port, token: 'synthetic-remote-runtime', version: VERSION,
  }), { mode: 0o600 });
  const started = await invoke(['start', '--port', '0']); remoteStarted = true;
  assert.equal(started.running, true);
  const origin = `http://127.0.0.1:${started.port}`;
  assert.equal((await invoke(['status'])).browserChecked, false);
  assert.equal((await invoke(['start'])).port, started.port, 'A second start must reuse its own adapter');
  const check = await invoke(['check', '--url', origin, '--client', 'grok', '--browser']);
  assert.deepEqual({ ok: check.ok, profiles: check.connectedProfiles }, { ok: true, profiles: 1 });
  const client = new Client({ name: 'synthetic-remote-agent', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(origin + '/mcp'), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  }));
  await client.listTools();
  const result = await client.callTool({ name: 'snapshot', arguments: { tabId: 42 } });
  assert.match(result.content[0].text, /Synthetic page/);
  assert.match(result.content[0].text, /UNTRUSTED|untrusted/i, 'Normal MCP output wrapping must be retained');
  assert.equal(commands.length, 1);
  assert.equal(commands[0].tabId, 42);
  const controlAttempt = await fetch(origin + '/_local/stop', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  assert.equal(controlAttempt.status, 404, 'Agent credentials do not stop the adapter');
  await invoke(['revoke', 'grok']);
  await assert.rejects(client.listTools());
  const stopped = await invoke(['stop']); remoteStarted = false;
  assert.equal(stopped.stopped, true);
  assert.equal(bridge.wss.address().port, port, 'Stopping remote access must leave the local bridge running');
  assert.equal(fs.existsSync(path.join(store.directory, 'runtime.json')), false);
});
