// [INPUT] Explicit operator remote-access commands.
// [OUTPUT] Private configuration, adapter lifecycle and bounded connection checks.
// [POS] Public remote CLI. [PROTOCOL] No tunnels or public routes are created automatically.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { remoteStore, REMOTE_PORT, privateRead, privateWrite, privateDirectory, endpoint, failure } from './store.js';
import { createRemoteServer } from './server.js';

const CLI = fileURLToPath(new URL('../cli.js', import.meta.url));
const HELP = `Connect a cloud agent to your signed-in Chrome (opt-in, self-hosted).

  beat-browser remote add grok [--days 90]       create an independent credential
  beat-browser remote rotate grok [--days 90]    replace that credential
  beat-browser remote clients                   list names and expiration (no secrets)
  beat-browser remote revoke grok               reject future calls and disconnect sessions
  beat-browser remote start [--port 18920]       start the loopback adapter in the background
  beat-browser remote serve [--port 18920]       run it in this terminal
  beat-browser remote status                    check the local adapter, not Chrome
  beat-browser remote stop                      stop this adapter, keep local MCP working
  beat-browser remote config --client grok --url https://your-host.example
                                                save a private MCP connection file
  beat-browser remote check --client grok --url https://your-host.example [--browser]
                                                check access; optionally list Chrome profiles

Use your own Cloudflare Tunnel and hostname. No BeatBrowser-hosted browser or
BeatBrowser account is required. Tokens and exported configs contain credentials;
they are saved privately, never printed. See docs/REMOTE.md or docs/REMOTE.zh-CN.md.
Cloud agents must support Bearer-authenticated HTTP MCP, HTTP calls or WebSocket.
`;

async function request(url, token, { method = 'GET', data, timeout = 8000 } = {}) {
  const response = await fetch(url, { method, redirect: 'error', signal: AbortSignal.timeout(timeout),
    headers: { Authorization: `Bearer ${token}`, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  if (!response.ok) throw failure(response.status, `Connection check returned HTTP ${response.status}.`);
  return response.json();
}

export async function runRemote(argv, { store = remoteStore(), output = value => console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2)) } = {}) {
  let subcommand = argv[0];
  if (!subcommand || ['help', '--help', '-h'].includes(subcommand)) { output(HELP); return 0; }
  try {
    const options = {
      add: { days: { type: 'string' } }, rotate: { days: { type: 'string' } }, clients: {}, revoke: {},
      start: { port: { type: 'string' } }, serve: { port: { type: 'string' } }, stop: {}, status: {},
      config: { client: { type: 'string' }, url: { type: 'string' } },
      check: { client: { type: 'string' }, url: { type: 'string' }, browser: { type: 'boolean' } },
    }[subcommand];
    if (!options) throw failure(400, 'Unknown remote command. Run beat-browser remote --help.');
    let parsed;
    try { parsed = parseArgs({ args: argv.slice(1), options, allowPositionals: true, strict: true }); }
    catch { throw failure(400, 'Invalid remote options. Run beat-browser remote --help.'); }
    const { values, positionals } = parsed;
    if (positionals.length !== (['add', 'rotate', 'revoke'].includes(subcommand) ? 1 : 0)) {
      throw failure(400, 'Unexpected or missing client name. Run beat-browser remote --help.');
    }
    const runtimeFile = path.join(store.directory, 'runtime.json');
    async function running() {
      try {
        const runtime = JSON.parse(privateRead(runtimeFile));
        if (!Number.isInteger(runtime.port) || runtime.port < 1 || runtime.port > 65535
          || !/^[A-Za-z0-9_-]{43}$/.test(runtime.controlToken) || typeof runtime.instanceId !== 'string') return null;
        const health = await request(`http://127.0.0.1:${runtime.port}/health`, runtime.controlToken, { timeout: 1000 });
        return health.instanceId === runtime.instanceId ? runtime : null;
      } catch { return null; }
    }
    if (['add', 'rotate'].includes(subcommand)) {
      const result = store.add(positionals[0], { days: Number(values.days ?? 90), rotate: subcommand === 'rotate' });
      output({ ...result, next: 'Start the adapter, create your own tunnel, then run remote config. Token values are not printed.' });
      return 0;
    }
    if (subcommand === 'clients') { output({ clients: store.list() }); return 0; }
    if (subcommand === 'revoke') { output(store.revoke(positionals[0])); return 0; }
    if (subcommand === 'config') {
      const origin = endpoint(values.url);
      const token = store.token(values.client);
      const filename = path.join(store.directory, `${values.client}.connection.json`);
      privateWrite(filename, JSON.stringify({ url: origin + '/mcp', headers: { Authorization: `Bearer ${token}` } }, null, 2) + '\n');
      output({ file: filename, mcpUrl: origin + '/mcp', httpCallUrl: origin + '/call',
        websocketUrl: origin.replace(/^http/, 'ws') + '/bridge',
        next: 'Paste the private file into your cloud agent connection settings. Never publish it. Field names depend on the client.' });
      return 0;
    }
    if (subcommand === 'check') {
      const origin = endpoint(values.url);
      const token = store.token(values.client);
      const health = await request(origin + '/health', token);
      if (health.service !== 'beat-browser-remote' || health.client !== values.client) throw failure(502, 'Unexpected remote service identity.');
      const report = { ok: true, adapterReachable: true, authenticated: true, browserChecked: !!values.browser };
      if (values.browser) {
        const result = await request(origin + '/call', token, { method: 'POST', timeout: 25000,
          data: { name: 'spaces', arguments: { action: 'profiles' } } });
        let profiles;
        try { profiles = JSON.parse(result.content.find(item => item.type === 'text').text).profiles; } catch { /* Unready or mismatched bridge. */ }
        report.connectedProfiles = Array.isArray(profiles) ? profiles.length : 0;
        report.extensionOnline = !result.isError && report.connectedProfiles > 0;
        report.ok = report.extensionOnline;
      }
      output(report);
      return report.ok ? 0 : 1;
    }
    const current = await running();
    if (subcommand === 'status') {
      output({ running: !!current, ...(current ? { port: current.port, version: current.version } : {}), browserChecked: false });
      return current ? 0 : 1;
    }
    if (subcommand === 'stop') {
      if (!current) { output({ stopped: true, alreadyStopped: true }); return 0; }
      await request(`http://127.0.0.1:${current.port}/_local/stop`, current.controlToken, { method: 'POST' });
      const until = Date.now() + 6000;
      while (await running()) {
        if (Date.now() > until) throw failure(504, 'Adapter is still stopping. Check remote status.');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      output({ stopped: true });
      return 0;
    }
    if (current) {
      output({ running: true, port: current.port, alreadyRunning: true, browserChecked: false });
      return 0;
    }
    const port = Number(values.port ?? REMOTE_PORT);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw failure(400, 'Port must be between 0 and 65535.');
    if (!store.list().some(client => client.enabled && Date.parse(client.expiresAt) > Date.now())) {
      throw failure(400, 'Create an Agent credential first: beat-browser remote add grok');
    }
    privateDirectory(store.directory);
    if (subcommand === 'start') {
      const logFile = path.join(store.directory, 'adapter.log');
      const fd = fs.openSync(logFile, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_APPEND
        | (fs.constants.O_NOFOLLOW || 0), 0o600);
      try {
        const child = spawn(process.execPath, [CLI, 'remote', 'serve', '--port', String(port)],
          { detached: true, stdio: ['ignore', fd, fd] });
        child.on('error', () => {});
        child.unref();
      } finally { fs.closeSync(fd); }
      const until = Date.now() + 6000;
      let runtime;
      while (!(runtime = await running()) && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 100));
      if (!runtime) throw failure(502, `Adapter did not start. Check ${logFile}.`);
      output({ running: true, port: runtime.port, browserChecked: false, logFile });
      return 0;
    }
    const controlToken = crypto.randomBytes(32).toString('base64url');
    const service = await createRemoteServer({ store, port, controlToken });
    const runtime = { port: service.port, instanceId: service.instanceId, controlToken,
      version: JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url))).version };
    const cleanup = () => {
      try { if (JSON.parse(privateRead(runtimeFile)).instanceId === runtime.instanceId) fs.unlinkSync(runtimeFile); } catch { /* Already removed. */ }
    };
    service.server.once('close', cleanup);
    try { privateWrite(runtimeFile, JSON.stringify(runtime) + '\n'); }
    catch (error) { await service.close(); throw error; }
    const stop = () => service.close().catch(() => {});
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    output({ running: true, listen: `http://127.0.0.1:${service.port}`, browserChecked: false,
      next: 'Point your own Cloudflare Tunnel at this address. The adapter is local-only until you create a route.' });
    service.server.once('close', () => { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); });
    return 0;
  } catch (error) {
    output({ ok: false, error: error.status ? error.message : `Remote command failed (${error.code || 'configuration or connection error'}).` });
    return 1;
  }
}
