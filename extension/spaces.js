import './ui-language.js';
import {createTaskStore} from './task-store.js';
// [INPUT] Identified local sessions and explicit task-window requests.
// [OUTPUT] Owned background workspaces, page handles and lifecycle receipts.
// [POS] BeatBrowser execution isolation. [PROTOCOL] No product accounts or job queue.
const TERMINAL = new Set(['finished', 'stopped']);
const MAX_PAGES = 16;
const MAX_EVENTS = 80;

export function createSpaces(chrome, cdp, { now = Date.now, uuid = () => crypto.randomUUID(), headless = /HeadlessChrome/.test(globalThis.navigator?.userAgent || '') } = {}) {
  const store = createTaskStore(chrome, {now});
  let chain = Promise.resolve();
  const serial = fn => {
    const next = chain.then(fn, fn);
    chain = next.catch(() => {});
    return next;
  };
  const read = store.read;
  const write = store.write;
  const fail = message => { throw Object.assign(new Error(message), { code: 'SPACE_STOPPED' }); };
  // Upgrade transient records from the first single-page prototype in place.
  const pages = s => s.pages ||= [{ label: 'main', tabId: s.tabId, openedBy: 'agent' }];
  const publicSpace = s => ({
    spaceId: s.id, label: s.label, windowId: s.windowId,
    tabId: pages(s)[0]?.tabId ?? null, pages: pages(s).map(({label,tabId,openedBy,handedToUser}) => ({label,tabId,openedBy,handedToUser})),
    missingPages:(s.missingPages || []).map(p=>({label:p.label})), recovered:!!s.recovered,
    state: s.state, expiresAt: s.expiresAt, progress: s.progress || '',
    updatedAt: s.updatedAt || null, notifications: !!s.notifications,
    pauseReason: s.pauseReason || null,
    sequence: s.sequence || 0,
  });
  function record(s, type, details = {}) {
    s.sequence = (s.sequence || 0) + 1;
    s.events = [...(s.events || []), { sequence: s.sequence, at: now(), type, ...details }].slice(-MAX_EVENTS);
    s.updatedAt = now();
  }
  async function notify(s, title) {
    if (!s.notifications || !chrome.notifications) return;
    await chrome.notifications.create(`beat-space-${s.id}`, {
      type: 'basic', iconUrl: 'icons/icon128.png',
      title: globalThis.BeatBrowserUI.text(title, await globalThis.BeatBrowserUI.read()),
      message: (s.progress || s.label).slice(0, 250),
    }).catch(() => {});
    s.lastNotifiedAt = now();
    s.lastNotifiedSequence = s.sequence;
  }
  async function pause(s, state, spaces, reason = state) {
    s.state = state;
    s.pauseReason = reason;
    record(s, state, {reason});
    // Persist the gate before releasing CDP, so the next command cannot proceed.
    await write(spaces);
    await Promise.all(pages(s).map(p => cdp.releaseBackground(p.tabId)));
  }
  async function validateRunning(s, spaces) {
    if (s.state !== 'running') fail(`TaskSpace is ${s.state}; resume requires explicit user authorization.`);
    if (s.expiresAt <= now()) {
      await pause(s, 'expired', spaces);
      fail('TaskSpace lease expired.');
    }
  }
  async function guard(tabId, sid, { mayFocus = false } = {}) {
    return serial(async () => {
      const spaces = await read();
      const s = Object.values(spaces).find(s => pages(s).some(p => p.tabId === tabId));
      if (!s) return;
      if (s.owner !== sid) fail('This task page belongs to another session.');
      await validateRunning(s, spaces);
      if (mayFocus) fail('This operation would foreground a task window. Use an explicit TaskSpace handoff instead.');
      const tab = await chrome.tabs.get(tabId);
      if (tab.windowId !== s.windowId) {
        await pause(s, 'user', spaces, 'page-moved');
        fail('Task page moved out of its window; user owns it now.');
      }
      if (!cdp.backgroundHeld(tabId)) {
        await pause(s, 'interrupted', spaces);
        fail('Background control detached. Inspect before explicitly resuming.');
      }
    });
  }
  function webUrl(url) {
    try { if (['http:', 'https:'].includes(new URL(url).protocol)) return url; } catch { /* Reject malformed URLs. */ }
    fail('A TaskSpace requires an HTTP(S) URL.');
  }
  function pageLabel(label) {
    if (typeof label !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(label)) fail('Page labels must contain 1-64 letters, digits, underscores or hyphens.');
    return label;
  }
  async function retain(s) {
    try {
      for (const p of pages(s)) await cdp.retainBackground(p.tabId);
      // Setting focused:false here brings another window forward (Chrome API).
      // Minimize alone: never manipulate the user's window stacking order.
      await chrome.windows.update(s.windowId, { state: 'minimized' });
      s.state = 'running';
      s.pauseReason = null;
    } catch {
      s.state = 'interrupted';
      s.pauseReason = 'control-unavailable';
      await Promise.all(pages(s).map(p => cdp.releaseBackground(p.tabId)));
    }
  }
  async function unmarkPage(s, tab) {
    if (!s.groupTitle || !tab || tab.windowId !== s.windowId || tab.groupId !== s.groupId) return;
    const group = await chrome.tabGroups.get(s.groupId).catch(() => null);
    if (group?.title === s.groupTitle && group.windowId === s.windowId) {
      // Closing a group can save it in Chrome. Ungroup our own page first.
      await chrome.tabs.ungroup(tab.id);
    }
  }
  async function open(p, sid, spaces) {
    webUrl(p.url);
    if (Object.values(spaces).filter(s => s.owner === sid && !TERMINAL.has(s.state)).length >= 4) fail('Finish an existing space before opening another.');
    // Request minimized creation; native focus behavior still needs headed acceptance.
    // No focused/bounds overrides; do not restore focus after the fact.
    const win = await chrome.windows.create({ url: p.url, state: 'minimized', type: 'normal' });
    const tab = win.tabs?.[0] || (await chrome.tabs.query({ windowId: win.id }))[0];
    if (!tab) fail('Task window did not supply a page.');
    const s = {
      id: uuid(), owner: sid, label: String(p.label || 'BeatBrowser task').slice(0, 80),
      windowId: win.id, tabId: tab.id, pages: [{ label: 'main', tabId: tab.id, openedBy: 'agent' }],
      state: 'opening', expiresAt: now() + Math.min(Math.max(Number(p.leaseMs) || 900000, 30000), 3600000),
      notifications: p.notifications === true,
      reportIntervalMs: Math.min(Math.max(Number(p.reportIntervalMs) || 300000, 60000), 3600000),
    };
    spaces[s.id] = s;
    await write(spaces);
    await retain(s);
    record(s, 'opened');
    await write(spaces);
    return publicSpace(s);
  }
  async function changePage(s, p, spaces) {
    await validateRunning(s, spaces);
    const label = pageLabel(p.pageLabel);
    if (p.action === 'new-page' || p.action === 'adopt') {
      if ([...pages(s),...(s.missingPages || [])].some(page => page.label === label)) fail('That page label is already in use.');
      if (pages(s).length >= MAX_PAGES) fail('TaskSpace page limit reached.');
      let tab;
      if (p.action === 'adopt') {
        if (p.userConfirmed !== true) fail('Adopting an existing page requires explicit user authorization.');
        tab = await chrome.tabs.get(p.tabId);
        if (tab.windowId !== s.windowId) fail('Only pages already in this task window can be adopted.');
        if (Object.values(spaces).some(other => pages(other).some(page => page.tabId === tab.id))) fail('Page is already managed.');
      } else {
        tab = await chrome.tabs.create({ windowId: s.windowId, url: webUrl(p.url), active: false });
      }
      pages(s).push({ label, tabId: tab.id, openedBy: p.action === 'adopt' ? 'user' : 'agent' });
      await write(spaces);
      try { await cdp.retainBackground(tab.id); }
      catch { await pause(s, 'interrupted', spaces); }
      record(s, 'page-added', { pageLabel: label, tabId: tab.id });
    } else {
      const page = pages(s).find(page => page.label === label);
      if (!page) fail('Unknown page label.');
      if (p.action === 'close-page') {
        if (page.openedBy !== 'agent' && p.userConfirmed !== true) fail('Closing a user or popup page requires explicit user authorization.');
        const tab = await chrome.tabs.get(page.tabId);
        if (tab.windowId !== s.windowId) fail('Moved pages are protected; inspect them before closing.');
        await unmarkPage(s, tab);
        await chrome.tabs.remove(page.tabId);
      }
      if (p.action === 'release-page') await unmarkPage(s, await chrome.tabs.get(page.tabId));
      await cdp.releaseBackground(page.tabId);
      s.pages = pages(s).filter(item => item !== page);
      record(s, p.action === 'release-page' ? 'page-released' : 'page-closed', { pageLabel: label, tabId: page.tabId });
      if (!s.pages.length) s.state = 'finished';
    }
    await write(spaces);
    return publicSpace(s);
  }
  async function finish(s, p, spaces) {
    const keep = p.keep === undefined ? 'all' : p.keep;
    if (keep !== 'all' && (!Array.isArray(keep) || !keep.every(label => pages(s).some(page => page.label === label)))) fail('keep must be all or a list of managed page labels.');
    if (s.state !== 'stopped') await pause(s, 'finished', spaces);
    const retained = [], closed = [];
    for (const page of pages(s)) {
      const tab = await chrome.tabs.get(page.tabId).catch(() => null);
      if (!tab) continue;
      // Unmanaged tabs are never touched; user/popup/moved pages are protected.
      if (keep === 'all' || keep.includes(page.label) || page.openedBy !== 'agent' || tab.windowId !== s.windowId) retained.push(page.label);
      else { await unmarkPage(s, tab); await chrome.tabs.remove(page.tabId); closed.push(page.label); }
    }
    s.pages = pages(s).filter(page => retained.includes(page.label));
    record(s, 'receipt', { retained, closed });
    await notify(s, 'BeatBrowser · Completed');
    await write(spaces);
    return { ...publicSpace(s), receipt: { retained, closed, finishedAt: now() } };
  }
  async function cleanup(s, spaces) {
    const handedOff = s.pauseReason === 'handoff';
    if (handedOff) for (const page of pages(s)) page.handedToUser = true;
    if (!TERMINAL.has(s.state)) await pause(s, 'stopped', spaces);
    s.pauseReason = null;
    const failed = [], kept = [], closed = [];
    for (const page of pages(s)) {
      try {
        await cdp.releaseBackground(page.tabId);
        let tab;
        try { tab = await chrome.tabs.get(page.tabId); }
        catch (error) {
          if (!/No tab with id|Invalid tab ID/i.test(error.message)) throw error;
        }
        if (!tab) continue;
        await unmarkPage(s, tab);
        if (page.openedBy !== 'agent' || page.handedToUser || handedOff || tab.windowId !== s.windowId) kept.push(page.label);
        else { await chrome.tabs.remove(page.tabId); closed.push(page.label); }
      } catch { failed.push(page); }
    }
    // Keep unsuccessful pages retryable. Never remove a whole window: it may
    // contain tabs the person opened, or pages moved there after task creation.
    if (failed.length) {
      s.pages = failed;
      record(s, 'cleanup-incomplete');
    } else delete spaces[s.id];
    await write(spaces);
    return {removed:failed.length ? 0 : 1, closed:closed.length, kept:kept.length, failed:failed.length};
  }
  async function command(p, sid) {
    if (!sid) fail('TaskSpace requires an identified local session.');
    return serial(async () => {
      const spaces = await read();
      if (p.action === 'list') return { spaces: Object.values(spaces).filter(s => s.owner === sid || s.recovered).map(s=>({...publicSpace(s),owned:s.owner===sid})) };
      if (p.action === 'open') return open(p, sid, spaces);
      const s = spaces[p.spaceId];
      if(p.action==='claim' && s?.recovered && !TERMINAL.has(s.state) && s.state!=='running') {
        if(p.userConfirmed!==true)fail('Connecting a recovered task requires explicit user authorization.');
        s.owner=sid;record(s,'reconnected');await write(spaces);return publicSpace(s);
      }
      if (!s || s.owner !== sid) fail('Unknown TaskSpace for this session.');
      if (p.action === 'status' || p.action === 'pages') return publicSpace(s);
      if (p.action === 'events') return { ...publicSpace(s), events: (s.events || []).filter(e => e.sequence > (Number(p.after) || 0)), truncated: !!s.events?.length && Number(p.after) < s.events[0].sequence - 1 };
      if (['new-page', 'adopt', 'release-page', 'close-page'].includes(p.action)) return changePage(s, p, spaces);
      if (p.action === 'report') {
        await validateRunning(s, spaces);
        s.progress = String(p.message || '').slice(0, 1000);
        record(s, 'progress');
        if (p.needsConfirmation === true) {
          await pause(s, 'user', spaces, 'review-requested');
          await notify(s, 'BeatBrowser · Review');
        }
      } else if (p.action === 'notifications') {
        s.notifications = p.notifications === true;
      } else if (p.action === 'stop' || p.action === 'handoff') {
        if (!TERMINAL.has(s.state)) await pause(s, p.action === 'stop' ? 'stopped' : 'user', spaces, p.action === 'stop' ? 'stopped' : 'handoff');
        if (p.action === 'handoff') {
          if(!pages(s).length)fail('No linked page remains.');
          for (const page of pages(s)) if (!p.pageLabel || page.label === p.pageLabel) page.handedToUser = true;
          if (p.pageLabel) {
            const page = pages(s).find(page => page.label === p.pageLabel);
            if (!page) fail('This page is no longer managed.');
            const tab = await chrome.tabs.get(page.tabId);
            if (tab.windowId !== s.windowId) fail('The page moved; inspect its current window manually.');
            await chrome.tabs.update(page.tabId, {active:true});
          }
          await chrome.windows.update(s.windowId, { state: 'normal', focused: true });
        }
      } else if (p.action === 'resume') {
        if (p.userConfirmed !== true) fail('Resume requires userConfirmed:true after the user asks to return control.');
        if (TERMINAL.has(s.state)) fail('A stopped or finished TaskSpace cannot resume. Start a new explicitly authorized task.');
        if(!pages(s).length || s.missingPages?.length) fail('Reconnect missing pages before continuing.');
        for (const page of pages(s)) {
          const tab = await chrome.tabs.get(page.tabId);
          if (tab.windowId !== s.windowId) fail('The task page moved out of its window; start a new task instead.');
        }
        await retain(s);
        if (s.state === 'running') {s.recovered=false;for (const page of pages(s)) page.handedToUser = false;}
        s.expiresAt = now() + 900000;
        record(s, 'resumed');
      } else if (p.action === 'finish') return finish(s, p, spaces);
      else fail('Unknown TaskSpace action.');
      await write(spaces);
      return publicSpace(s);
    });
  }
  chrome.alarms?.create('beat-space-leases', { periodInMinutes: 1 });
  chrome.alarms?.onAlarm.addListener(alarm => {
    if (alarm.name !== 'beat-space-leases') return;
    void serial(async () => {
      const spaces = await read();
      for (const s of Object.values(spaces)) {
        if (s.state === 'running' && s.expiresAt <= now()) await pause(s, 'expired', spaces);
        else if (s.state === 'running' && s.progress && s.sequence !== s.lastNotifiedSequence && now() - (s.lastNotifiedAt || 0) >= s.reportIntervalMs) await notify(s, 'BeatBrowser · Progress');
      }
      await write(spaces);
    });
  });
  chrome.windows.onFocusChanged.addListener(windowId => {
    // Headless Chromium emits synthetic focus events without a human window.
    if (headless) return;
    void serial(async () => {
      const spaces = await read();
      const owned = Object.values(spaces).some(s => s.windowId === windowId && s.state === 'running');
      if (!owned) return;
      // macOS can deliver a queued activation after creation/minimization.
      // Check the current window instead of attributing the event to a person.
      // If inspection fails, keep the conservative pause below.
      try {
        const win = await chrome.windows.get(windowId);
        if (win.focused === false || win.state === 'minimized') return;
      } catch { /* Unknown current focus: pause rather than continuing input. */ }
      for (const s of Object.values(spaces)) if (s.windowId === windowId && s.state === 'running') await pause(s, 'user', spaces, 'window-focused');
    });
  });
  chrome.tabs.onRemoved.addListener(tabId => {
    void serial(async () => {
      const spaces = await read();
      for (const s of Object.values(spaces)) if (pages(s).some(p => p.tabId === tabId)) {
        await cdp.releaseBackground(tabId);
        const closed=pages(s).find(p=>p.tabId===tabId);
        const {tabId:closedId,...missing}=closed;
        s.missingPages=[...(s.missingPages || []),missing];
        s.pages = pages(s).filter(p => p.tabId !== tabId);
        record(s, 'page-closed', { tabId });
        if (!TERMINAL.has(s.state)) await pause(s, 'interrupted', spaces, 'page-closed');
      }
      await write(spaces);
    });
  });
  chrome.tabs.onCreated?.addListener(tab => {
    if (!tab.openerTabId) return;
    void serial(async () => {
      const spaces = await read();
      const s = Object.values(spaces).find(s => !TERMINAL.has(s.state) && pages(s).some(p => p.tabId === tab.openerTabId));
      if (!s) return;
      record(s, 'popup', { tabId: tab.id, windowId: tab.windowId, openerTabId: tab.openerTabId });
      // Observe popups, but never move a window or claim a new page implicitly.
      if (tab.windowId !== s.windowId) await pause(s, 'user', spaces, 'popup-outside');
      await write(spaces);
    });
  });
  chrome.tabs.onUpdated?.addListener((tabId,change)=>{
    if(!change.url)return;
    void serial(async()=>{const spaces=await read();if(Object.values(spaces).some(s=>pages(s).some(p=>p.tabId===tabId)))await write(spaces);});
  });
  // Initialize/migrate durable task metadata without adding browser UI.
  void serial(async()=>{await read();}).catch(()=>{});
  const contains = async tabId => Object.values(await read()).some(s => pages(s).some(p => p.tabId === tabId));
  async function humanCommand(p) {
    if (p.action === 'list') return serial(async()=>({ spaces: Object.values(await read()).map(publicSpace) }));
    if (p.action === 'cleanup' || p.action === 'cleanup-ended' || p.action === 'cleanup-all') {
      return serial(async () => {
        const spaces = await read();
        const selected = p.action === 'cleanup' ? [spaces[p.spaceId]].filter(Boolean)
          : Object.values(spaces).filter(s => p.action === 'cleanup-all' || TERMINAL.has(s.state));
        if (p.action === 'cleanup' && selected.some(s => !TERMINAL.has(s.state))) fail('Stop this task before cleaning it.');
        if (p.action === 'cleanup-all' && p.userConfirmed !== true) fail('Confirm before stopping all tasks.');
        const result = {removed:0,closed:0,kept:0,failed:0};
        for (const s of selected) {
          const receipt = await cleanup(s, spaces);
          for (const key of Object.keys(result)) result[key] += receipt[key];
        }
        return result;
      });
    }
    if(['candidates','relink','retry-recovery'].includes(p.action)) return serial(async()=>{
      const spaces=await read(),s=spaces[p.spaceId];
      if(!s || s.state==='running')fail('Pause the task before reconnecting pages.');
      if(p.action==='retry-recovery') {await store.retry(s);await write(spaces);return publicSpace(s);}
      if(p.action==='candidates') {
        const tabs=await chrome.tabs.query({});
        const used=new Set(Object.values(spaces).flatMap(task=>pages(task).map(page=>page.tabId)));
        return {pages:tabs.filter(t=>!used.has(t.id) && /^https?:/.test(t.url || ''))
          .map(t=>({tabId:t.id,windowId:t.windowId,title:t.title || '',url:t.url}))};
      }
      if(p.userConfirmed!==true)fail('Confirm the page association.');
      const missing=s.missingPages?.find(page=>page.label===p.pageLabel);
      if(!missing)fail('Missing page no longer exists.');
      const tab=await chrome.tabs.get(p.tabId);
      if(!tab || tab.url!==p.url || tab.windowId!==p.windowId)fail('Page changed; select it again.');
      if(Object.values(spaces).some(task=>pages(task).some(page=>page.tabId===tab.id)))fail('Page is already managed.');
      if(pages(s).length && s.windowId!==tab.windowId)fail('Select a page in the same task window.');
      webUrl(tab.url);s.windowId=tab.windowId;
      pages(s).push({...missing,tabId:tab.id,openedBy:'user',handedToUser:true});
      s.missingPages=s.missingPages.filter(page=>page!==missing);
      record(s,'page-linked',{pageLabel:p.pageLabel});await write(spaces);return publicSpace(s);
    });
    if (!['handoff', 'resume', 'stop', 'notifications', 'events'].includes(p.action)) fail('Unknown human control.');
    const s = (await read())[p.spaceId];
    if (!s) fail('TaskSpace no longer exists.');
    return command({ ...p, userConfirmed: p.action === 'resume' }, s.owner);
  }
  return { command, guard, contains, humanCommand };
}
