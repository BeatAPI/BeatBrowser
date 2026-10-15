// [INPUT] Live Chrome tabs, BeatBrowser tab groups and existing page associations.
// [OUTPUT] Inspectable non-task pages with explicitly confirmed, bounded cleanup.
// [POS] Popup/sidebar inventory. [PROTOCOL] Never infer task state from a tab group.
export function createWorkspacePages(chrome, taskSpaces) {
  async function list() {
    const [tabs, groups, stored, tasks] = await Promise.all([
      chrome.tabs.query({}), chrome.tabGroups.query({}), chrome.storage.local.get(null),
      taskSpaces.humanCommand({action:'list'}),
    ]);
    const taskTabs = new Set(tasks.spaces.flatMap(s => s.pages.map(p => p.tabId)));
    const associated = new Set();
    const groupIds = new Set(groups.filter(g => g.title === 'BeatBrowser').map(g => g.id));
    for (const [key, value] of Object.entries(stored)) {
      if (key.startsWith('ownTabs:') && Array.isArray(value)) value.forEach(id => associated.add(id));
      if (key.startsWith('agentTab:') && Number.isInteger(value)) associated.add(value);
    }
    const pages = tabs.filter(t => !taskTabs.has(t.id) && (associated.has(t.id) || groupIds.has(t.groupId)))
      .map(t => ({tabId:t.id, windowId:t.windowId, url:t.url || t.pendingUrl || '', title:t.title || ''}));
    return {pages, windows:new Set(pages.map(p => p.windowId)).size};
  }
  async function command(p) {
    if (p.action === 'list') return list();
    if (p.action === 'view') {
      const page = (await list()).pages.find(t => t.tabId === p.tabId);
      if (!page) throw Error('Page is no longer linked.');
      await chrome.tabs.update(page.tabId, {active:true});
      await chrome.windows.update(page.windowId, {focused:true});
      return {viewed:true};
    }
    if (p.action !== 'close' || p.userConfirmed !== true || !Array.isArray(p.pages) || p.pages.length > 500) {
      throw Error('Confirm which pages to close.');
    }
    const result = {closed:0, skipped:0, failed:0};
    const seen = new Set();
    for (const requested of p.pages) {
      if (!requested || !Number.isInteger(requested.tabId) || seen.has(requested.tabId)) continue;
      seen.add(requested.tabId);
      // Recheck each page: navigation, moving, or adoption into a task invalidates
      // the confirmation snapshot. New tabs are never added to a pending batch.
      const current = (await list()).pages.find(t => t.tabId === requested.tabId);
      if (!current || current.windowId !== requested.windowId || current.url !== requested.url) {
        result.skipped++;continue;
      }
      try { await chrome.tabs.remove(current.tabId);result.closed++; }
      catch { result.failed++; }
    }
    return result;
  }
  return {list, command};
}
