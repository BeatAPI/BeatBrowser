// [INPUT] Node-based agents using the existing local BeatBrowser bridge.
// [OUTPUT] Composable TaskSpace/Page handles without a second runtime or account.
// [POS] Public JavaScript SDK. [PROTOCOL] Explicit page scope; no action replay.
import { BridgeClient } from './lib/rpc.js';
import { setTimeout as delay } from 'node:timers/promises';

export function createBrowser({ client = 'javascript-agent', sessionId, bridge } = {}) {
  const transport = bridge || new BridgeClient({ client, sessionId });
  let connecting;
  const call = async (name, params = {}, options = {}) => {
    if (!transport.ws) {
      connecting ||= transport.connect().finally(() => { connecting = null; });
      await connecting;
    }
    return transport.call(name, params, { ...options, tabId: params.tabId });
  };
  return {
    async profiles() { return (await call('spaces', { action: 'profiles' })).profiles; },
    async openSpace({ url, label, ...options }) {
      const state = await call('spaces', { ...options, action: 'open', url, label });
      if (state.state !== 'running') throw Object.assign(new Error('TaskSpace could not start. Inspect it before retrying.'), { code: 'SPACE_STOPPED', spaceId: state.spaceId });
      return new TaskSpace(call, state);
    },
    async listSpaces({ profileId } = {}) { return (await call('spaces', { action: 'list', profileId })).spaces; },
    async space(spaceId) { return new TaskSpace(call, await call('spaces', { action: 'status', spaceId })); },
    close() { transport.close(); },
  };
}

class TaskSpace {
  constructor(call, state) { this.call = call; this.state = state; }
  get spaceId() { return this.state.spaceId; }
  get name() { return this.state.label; }
  async command(action, args = {}) {
    const state = await this.call('spaces', { ...args, action, spaceId: this.spaceId });
    this.state = state;
    return state;
  }
  status() { return this.command('status'); }
  async pages() { return (await this.command('pages')).pages.map(p => this.page(p.label)); }
  page(label = 'main') { return new Page(this, label); }
  async newPage(label, url) { await this.command('new-page', { pageLabel: label, url }); return this.page(label); }
  async adopt(tabId, label, { userConfirmed = false } = {}) {
    await this.command('adopt', { tabId, pageLabel: label, userConfirmed });
    return this.page(label);
  }
  release(label) { return this.command('release-page', { pageLabel: label }); }
  report(message, { needsConfirmation = false } = {}) { return this.command('report', { message, needsConfirmation }); }
  events(after = 0) { return this.command('events', { after }); }
  handOff() { return this.command('handoff'); }
  resume({ userConfirmed = false } = {}) { return this.command('resume', { userConfirmed }); }
  stop() { return this.command('stop'); }
  finish({ keep = 'all' } = {}) { return this.command('finish', { keep }); }
  async waitForControl({ timeout = 300000, interval = 500, signal } = {}) {
    const deadline = Date.now() + Math.min(Math.max(timeout, 1), 3600000);
    do {
      signal?.throwIfAborted();
      const state = await this.status();
      if (state.state === 'running') return state;
      if (['finished', 'stopped', 'expired', 'interrupted'].includes(state.state)) throw Object.assign(new Error(`TaskSpace is ${state.state}.`), { code: 'SPACE_STOPPED' });
      await delay(Math.min(Math.max(interval, 100), 5000), undefined, { signal });
    } while (Date.now() < deadline);
    throw Object.assign(new Error('Timed out waiting for human control to be returned.'), { code: 'TIMEOUT' });
  }
}

class Page {
  constructor(task, label) { this.task = task; this.label = label; }
  get spaceId() { return this.task.spaceId; }
  async target() {
    let page = this.task.state.pages?.find(p => p.label === this.label);
    if (!page) page = (await this.task.status()).pages?.find(p => p.label === this.label);
    if (!page) throw Object.assign(new Error(`Unknown or released page: ${this.label}`), { code: 'SPACE_STOPPED' });
    return page.tabId;
  }
  async run(name, params = {}, options) {
    return this.task.call(name, { ...params, spaceId: this.spaceId, tabId: await this.target() }, options);
  }
  goto(url) { return this.run('navigate', { url }); }
  reload() { return this.run('navigate', { action: 'reload' }); }
  snapshot() { return this.run('snapshot'); }
  readText(options = {}) { return this.run('read_text', options); }
  screenshot(options = {}) { return this.run('screenshot', options); }
  click(target, options = {}) { return this.run('click', { ...locate(target), ...options }); }
  fill(target, text, options = {}) { return this.run('type', { ...locate(target), text, ...options }); }
  select(target, value, options = {}) { return this.run('select', { ...locate(target), value, ...options }); }
  press(key, options = {}) { return this.run('key', { key, ...options }); }
  scroll(options = {}) { return this.run('scroll', options); }
  query(selector, extract) { return this.run('query', { selector, extract }); }
  evaluate(expr) { return this.run('eval', { expr }); }
  fetch(url, init) { return this.run('fetch', { url, init }); }
  network(options = {}) { return this.run('network', options); }
  act(steps, options = {}) { return this.run('act', { steps, ...options }); }
  waitForSelector(selector, { timeout = 10000 } = {}) { return this.run('wait', { for: 'selector', value: selector, timeout }, { timeoutMs: timeout + 15000 }); }
  waitForText(text, { timeout = 10000 } = {}) { return this.run('wait', { for: 'text', value: text, timeout }, { timeoutMs: timeout + 15000 }); }
  waitForIdle({ timeout = 10000 } = {}) { return this.run('wait', { for: 'idle', timeout }, { timeoutMs: timeout + 15000 }); }
  close({ userConfirmed = false } = {}) { return this.task.command('close-page', { pageLabel: this.label, userConfirmed }); }
  async waitForURL(expected, { timeout = 10000, interval = 250, signal } = {}) {
    const deadline = Date.now() + Math.min(Math.max(timeout, 1), 300000);
    do {
      signal?.throwIfAborted();
      const result = await this.evaluate('location.href');
      const url = JSON.parse(result.text);
      if (expected instanceof RegExp) expected.lastIndex = 0;
      if (typeof expected === 'string' ? url === expected : expected.test(url)) return url;
      await delay(Math.min(Math.max(interval, 100), 5000), undefined, { signal });
    } while (Date.now() < deadline);
    throw Object.assign(new Error('Timed out waiting for URL; navigation was not retried.'), { code: 'TIMEOUT' });
  }
  async waitForPopup({ after = this.task.state.sequence || 0, timeout = 10000, signal } = {}) {
    const deadline = Date.now() + Math.min(Math.max(timeout, 1), 300000);
    do {
      signal?.throwIfAborted();
      const result = await this.task.events(after);
      const event = result.events.find(e => e.type === 'popup' && e.openerTabId === this.task.state.pages?.find(p => p.label === this.label)?.tabId);
      if (event) return event;
      if (result.truncated) throw new Error('Popup event history expired. Inspect the task tabs before continuing.');
      await delay(250, undefined, { signal });
    } while (Date.now() < deadline);
    throw Object.assign(new Error('Timed out waiting for popup; action was not retried.'), { code: 'TIMEOUT' });
  }
}

function locate(target) {
  if (typeof target === 'string') return { selector: target };
  if (target && typeof target === 'object') return target;
  throw new TypeError('Use a CSS selector or a snapshot ref/find object.');
}
