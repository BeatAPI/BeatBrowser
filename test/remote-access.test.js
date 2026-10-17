// [INPUT] Synthetic clients, temporary credential files and a fake browser backend.
// [OUTPUT] Authentication, isolation, revocation, resource limits and protocol checks.
// [POS] Remote boundary tests. [PROTOCOL] Never connect to a personal Chrome profile.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import WebSocket from 'ws';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createRemoteServer } from '../src/remote/server.js';
import { remoteStore, endpoint } from '../src/remote/store.js';
import { remoteTools, validateCall } from '../src/remote/backend.js';
import { runRemote } from '../src/remote/cli.js';

function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'beatbrowser-remote-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return remoteStore(path.join(directory, 'remote'));
}
async function setup(t, options = {}) {
  const store = temporary(t);
  store.add('grok'); store.add('muse');
  const calls = [];
  const released = [];
  const backend = { async call(identity, name, args) {
    calls.push({ identity, name, args });
    if (args.fail) throw new Error('private backend path or data must not escape');
    return { content: [{ type: 'text', text: JSON.stringify({ name, args }) }] };
  }, async close() {}, async release(key) { released.push(key); } };
  const service = await createRemoteServer({ store, backend, port: 0, sweepMs: 20, ...options });
  t.after(() => service.close());
  const origin = `http://127.0.0.1:${service.port}`;
  async function request(route, { client = 'grok', token = store.token(client), method, data, headers = {}, raw } = {}) {
    return fetch(origin + route, { method: method || (data === undefined && raw === undefined ? 'GET' : 'POST'),
      headers: { Authorization: `Bearer ${token}`, ...(data === undefined && raw === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
      ...(data !== undefined ? { body: JSON.stringify(data) } : raw !== undefined ? { body: raw } : {}) });
  }
  return { store, service, origin, request, calls, released };
}
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, timeout = 3000) {
  const end = Date.now() + timeout;
  while (!check()) { if (Date.now() > end) throw Error('Condition timed out'); await delay(10); }
}
async function wsClient(t, origin, token) {
  const ws = new WebSocket(origin.replace('http:', 'ws:') + '/bridge');
  const messages = [];
  ws.on('message', bytes => messages.push(JSON.parse(bytes.toString())));
  ws.on('error', () => {});
  t.after(() => ws.terminate());
  await once(ws, 'open');
  ws.send(JSON.stringify({ type: 'hello', role: 'agent', token }));
  await until(() => messages.some(message => message.type === 'welcome'));
  return { ws, messages };
}

test('credentials use independent hashes, private files, bounded lifetimes and atomic rotation', t => {
  const store = temporary(t);
  const grok = store.add('grok'); store.add('muse');
  const old = store.token('grok');
  const current = store.authenticate(old);
  assert.notEqual(old, store.token('muse'));
  assert.ok(!fs.readFileSync(path.join(store.directory, 'clients.json'), 'utf8').includes(old));
  assert.ok(!JSON.stringify(store.list()).includes('sha256'));
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(grok.tokenFile).mode & 0o777, 0o600);
    assert.equal(fs.statSync(store.directory).mode & 0o777, 0o700);
  }
  assert.throws(() => store.add('../escape'));
  assert.throws(() => store.add('grok'));
  assert.throws(() => store.add('bad-days', { days: 366 }));
  store.add('grok', { rotate: true });
  assert.equal(store.authenticate(old), null);
  assert.notEqual(current.key, store.authenticate(store.token('grok')).key);
  const dataFile = path.join(store.directory, 'clients.json');
  const data = JSON.parse(fs.readFileSync(dataFile));
  data.clients.find(item => item.id === 'muse').expiresAt = '2000-01-01T00:00:00Z';
  const muse = fs.readFileSync(store.tokenPath('muse'), 'utf8').trim();
  fs.writeFileSync(dataFile, JSON.stringify(data));
  assert.equal(store.authenticate(muse), null);
  store.revoke('grok');
  assert.equal(fs.existsSync(store.tokenPath('grok')), false);
  assert.equal(store.authenticate('x'.repeat(43)), null);
});

test('symlink credential reads are rejected and corrupt credential stores fail closed', t => {
  const store = temporary(t); store.add('grok');
  const token = store.token('grok');
  const file = path.join(store.directory, 'clients.json');
  fs.writeFileSync(file, '{ broken');
  assert.equal(store.authenticate(token), null);
  fs.unlinkSync(file);
  fs.symlinkSync(store.tokenPath('grok'), file);
  assert.equal(store.authenticate(token), null);
});

test('HTTP authentication, browser origins and query tokens fail before backend access', async t => {
  const { service, request, calls } = await setup(t);
  assert.equal(service.server.address().address, '127.0.0.1');
  for (const token of ['', 'wrong', 'x'.repeat(43), '\u00e9'.repeat(43)]) {
    assert.equal((await request('/health', { token })).status, 401);
  }
  assert.equal((await request('/health', { headers: { Origin: 'https://example.test' } })).status, 403);
  assert.equal((await request('/health?token=unused')).status, 400);
  assert.equal((await request('/health')).status, 200);
  const tools = await (await request('/tools')).json();
  assert.ok(tools.tools.some(tool => tool.name === 'spaces'));
  assert.equal(calls.length, 0, 'Health and tool discovery must not start Chrome');
});

test('invalid requests, filesystem arguments and optional cloud tools never reach the backend', async t => {
  const { request, calls } = await setup(t);
  for (const raw of ['null', '[]', 'bad json']) assert.equal((await request('/call', { raw })).status, 400);
  assert.equal((await request('/call', { raw: '{}', headers: { 'Content-Type': 'text/plain' } })).status, 415);
  for (const [name, args] of [['upload', { path: '/private' }], ['download', {}], ['learnings', {}],
    ['browser_task', {}], ['screenshot', { savePath: '/private' }], ['fetch', { binary: true }], ['snapshot', []]]) {
    assert.equal((await request('/call', { data: { name, arguments: args } })).status, 400);
  }
  assert.equal(calls.length, 0);
  const response = await request('/call', { data: { name: 'snapshot', arguments: { fail: true } } });
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes('private backend'));
  assert.equal((await request('/health')).status, 200, 'Bad requests must not stop the adapter');
});

test('independent clients retain identity; rotating one does not revoke the other', async t => {
  const { store, request, calls } = await setup(t);
  const old = store.token('grok');
  for (const client of ['grok', 'muse']) {
    assert.equal((await request('/call', { client, data: { name: 'snapshot', arguments: { tabId: client === 'grok' ? 1 : 2 } } })).status, 200);
  }
  assert.notEqual(calls[0].identity.key, calls[1].identity.key);
  assert.deepEqual(calls.map(call => call.args.tabId), [1, 2]);
  store.add('grok', { rotate: true });
  assert.equal((await request('/call', { token: old, data: { name: 'snapshot', arguments: {} } })).status, 401);
  assert.equal((await request('/health', { client: 'muse' })).status, 200);
  assert.equal(calls.length, 2);
});

test('official MCP HTTP client initializes, discovers and calls through the same boundary', async t => {
  const { store, origin, calls } = await setup(t);
  const client = new Client({ name: 'synthetic-cloud-agent', version: '1.0.0' });
  t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(new URL(origin + '/mcp'), {
    requestInit: { headers: { Authorization: `Bearer ${store.token('grok')}` } },
  }));
  const tools = await client.listTools();
  assert.equal(tools.tools.length, remoteTools().length);
  assert.equal(calls.length, 0);
  const result = await client.callTool({ name: 'snapshot', arguments: { tabId: 42 } });
  assert.equal(result.isError, undefined);
  assert.equal(calls[0].identity.id, 'grok');
  assert.equal(calls[0].args.tabId, 42);
  const denied = await client.callTool({ name: 'upload', arguments: { path: '/private' } });
  assert.equal(denied.isError, true);
  assert.equal(calls.length, 1);
  store.revoke('grok');
  await assert.rejects(client.listTools());
});

test('WebSocket calls are authenticated, scoped and closed on live revocation', async t => {
  const { store, origin, calls, released } = await setup(t);
  const token = store.token('grok');
  const { ws, messages } = await wsClient(t, origin, token);
  ws.send('not json');
  await until(() => messages.some(message => message.ok === false));
  ws.send(JSON.stringify({ type: 'cmd', id: 'read-1', cmd: 'snapshot', tabId: 42 }));
  await until(() => messages.some(message => message.id === 'read-1'));
  assert.equal(calls[0].args.tabId, 42);
  const closed = once(ws, 'close');
  store.revoke('grok');
  assert.equal((await closed)[0], 4001);
  await until(() => released.length > 0);
});

test('unauthenticated WebSocket commands and browser origins cannot call tools', async t => {
  const { origin, calls } = await setup(t);
  const ws = new WebSocket(origin.replace('http:', 'ws:') + '/bridge');
  ws.on('error', () => {});
  await once(ws, 'open');
  const closed = once(ws, 'close');
  ws.send(JSON.stringify({ type: 'cmd', id: 'x', cmd: 'snapshot' }));
  assert.equal((await closed)[0], 4001);
  const forbidden = new WebSocket(origin.replace('http:', 'ws:') + '/bridge', { origin: 'https://example.test' });
  forbidden.on('error', () => {});
  await assert.rejects(once(forbidden, 'open'));
  assert.equal(calls.length, 0);
});

test('concurrency and rate limits reject excess work rather than queueing or replaying it', async t => {
  let finish;
  let started = false;
  const backend = { async call() { started = true; await new Promise(resolve => { finish = resolve; }); return { content: [] }; }, async close() {} };
  const { request } = await setup(t, { backend, maxConcurrent: 1, ratePerMinute: 4 });
  const first = request('/call', { data: { name: 'snapshot' } });
  await until(() => started);
  assert.equal((await request('/call', { data: { name: 'snapshot' } })).status, 429);
  finish(); assert.equal((await first).status, 200);
  await request('/health'); await request('/health');
  assert.equal((await request('/health')).status, 429);
});

test('oversized HTTP and WebSocket messages are rejected without stopping other clients', async t => {
  const { request, origin, store, calls } = await setup(t);
  const oversized = JSON.stringify({ name: 'snapshot', arguments: { text: 'x'.repeat(1024 * 1024) } });
  assert.equal((await request('/call', { raw: oversized })).status, 413);
  const { ws } = await wsClient(t, origin, store.token('grok'));
  const closed = once(ws, 'close');
  ws.send(oversized);
  assert.equal((await closed)[0], 1009);
  assert.equal(calls.length, 0);
  assert.equal((await request('/health', { client: 'muse' })).status, 200);
});

test('revoking a credential during a browser call withholds its result and never replays it', async t => {
  let finish;
  let count = 0;
  const backend = { async call() { count++; await new Promise(resolve => { finish = resolve; }); return { content: [{ type: 'text', text: 'private-page' }] }; }, async close() {} };
  const { store, request } = await setup(t, { backend });
  const pending = request('/call', { data: { name: 'click', arguments: { tabId: 1 } } });
  await until(() => count === 1);
  store.revoke('grok');
  finish();
  const response = await pending;
  assert.equal(response.status, 401);
  assert.ok(!(await response.text()).includes('private-page'));
  assert.equal(count, 1);
});

test('connection config is private and stdout contains no token; endpoints reject accidental leaks', async t => {
  const store = temporary(t); store.add('grok');
  const output = [];
  const options = { store, output: value => output.push(value) };
  assert.equal(await runRemote(['config', '--client', 'grok', '--url', 'https://browser.example.test'], options), 0);
  const token = store.token('grok');
  assert.ok(!JSON.stringify(output).includes(token));
  const config = JSON.parse(fs.readFileSync(output[0].file));
  assert.equal(config.headers.Authorization, `Bearer ${token}`);
  assert.equal(config.url, 'https://browser.example.test/mcp');
  assert.equal(await runRemote(['start', '--host', '0.0.0.0'], options), 1);
  for (const url of ['http://public.example', 'https://user:pass@example.test', 'https://example.test?token=x', 'https://example.test/mcp']) {
    assert.throws(() => endpoint(url));
  }
  assert.equal(endpoint('http://127.0.0.1:18920'), 'http://127.0.0.1:18920');
  assert.equal(await runRemote(['revoke', 'grok'], options), 0);
  assert.equal(fs.existsSync(output[0].file), false);
  assert.equal(remoteTools().length, 21);
  assert.throws(() => validateCall('snapshot', null));
});
