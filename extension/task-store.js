// [INPUT] Local task records, live tabs and Chrome debug-target identities.
// [OUTPUT] Durable metadata and conservatively recovered, paused tasks.
// [POS] TaskSpace storage. [PROTOCOL] No cookies, page bodies or raw URLs persisted.
const KEY = 'beatTaskSpaces';
const ARCHIVE = 'beatTaskArchive';
const TERMINAL = new Set(['finished','stopped']);
export async function pageFingerprint(url) {
  if (!url) return null;
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
}
export function createTaskStore(chrome, {now=Date.now}={}) {
  let initialized;
  async function targets() {
    // Read-only: getTargets does not attach a debugger or foreground a page.
    return (await chrome.debugger.getTargets()).filter(t=>t.type==='page' && Number.isInteger(t.tabId));
  }
  async function persist(spaces) {
    const identities=await targets();
    const archive=structuredClone(spaces);
    for(const s of Object.values(archive)) for(const page of s.pages || []) {
      const tab=await chrome.tabs.get(page.tabId).catch(()=>null);
      if(tab && tab.windowId===s.windowId) {
        page.windowId=tab.windowId;
        page.fingerprint=await pageFingerprint(tab.url || tab.pendingUrl);
        page.targetId=identities.find(t=>t.tabId===tab.id)?.id || null;
      }
    }
    await chrome.storage.local.set({[ARCHIVE]:{version:2,tasks:archive}});
    await chrome.storage.session.set({[KEY]:archive});
  }
  async function reconcile(s, tabs, identities, groups=[]) {
    // Version 1 used a uniquely named group. Read it only for migration; never
    // create a group or use numeric tab IDs alone to reattach an archived page.
    const candidates=groups.filter(g=>s.groupTitle && g.title===s.groupTitle);
    const group=candidates.length===1?candidates[0]:null;
    const fingerprints=await Promise.all(tabs.map(async tab=>({tab,fingerprint:await pageFingerprint(tab.url || tab.pendingUrl)})));
    const records=[...(s.pages || []),...(s.missingPages || [])];
    const linked=[],missing=[],used=new Set();
    for(const record of records) {
      const target=record.targetId?identities.find(t=>t.id===record.targetId):null;
      const matches=record.targetId
        ? fingerprints.filter(p=>target?.tabId===p.tab.id && p.tab.windowId===(record.windowId ?? s.windowId) && p.fingerprint===record.fingerprint)
        : group?fingerprints.filter(p=>p.tab.groupId===group.id && p.fingerprint===record.fingerprint):[];
      const uniqueRecord=record.targetId
        ? records.filter(p=>p.targetId===record.targetId).length===1
        : records.filter(p=>p.fingerprint===record.fingerprint).length===1;
      if(matches.length===1 && uniqueRecord && !used.has(matches[0].tab.id)) {
        const tab=matches[0].tab;used.add(tab.id);linked.push({...record,tabId:tab.id});
      } else {
        const {tabId,...safe}=record;missing.push(safe);
      }
    }
    s.pages=linked;s.missingPages=missing;
    s.windowId=linked.length?tabs.find(t=>t.id===linked[0].tabId).windowId:null;
    s.recovered=true;
    if(!TERMINAL.has(s.state)) {s.state='recovered';s.pauseReason='reload';}
    s.updatedAt=now();
  }
  async function removeLegacyGroups(tasks) {
    for(const s of Object.values(tasks)) {
      if(!s.groupTitle)continue;
      let failed=false;
      for(const page of s.pages || []) {
        const tab=await chrome.tabs.get(page.tabId).catch(()=>null);
        if(!tab || tab.windowId!==s.windowId || tab.groupId<0)continue;
        const group=await chrome.tabGroups.get(tab.groupId).catch(()=>null);
        if(group?.title!==s.groupTitle || group.windowId!==s.windowId)continue;
        try { await chrome.tabs.ungroup(tab.id); }
        catch { failed=true; }
      }
      if(!failed) {delete s.groupId;delete s.groupTitle;}
    }
  }
  async function initialize() {
    const session=(await chrome.storage.session.get(KEY))[KEY];
    let tasks=session;
    if(!tasks) {
      const saved=(await chrome.storage.local.get(ARCHIVE))[ARCHIVE];
      tasks=[1,2].includes(saved?.version)?saved.tasks || {}:{};
      const [tabs,identities,groups]=await Promise.all([
        chrome.tabs.query({}),targets(),
        Object.values(tasks).some(s=>s.groupTitle)?chrome.tabGroups.query({}):Promise.resolve([]),
      ]);
      for(const s of Object.values(tasks)) await reconcile(s,tabs,identities,groups);
    }
    // Save native identities before removing the old visual marker so a worker
    // restart during migration cannot lose page associations.
    await persist(tasks);
    await removeLegacyGroups(tasks);
    await persist(tasks);
  }
  async function ready() {
    initialized ||= initialize().catch(error=>{initialized=null;throw error;});
    await initialized;
  }
  return {
    async read(){await ready();return (await chrome.storage.session.get(KEY))[KEY] || {};},
    write:persist,
    async retry(s){const [tabs,identities]=await Promise.all([chrome.tabs.query({}),targets()]);await reconcile(s,tabs,identities);},
  };
}
