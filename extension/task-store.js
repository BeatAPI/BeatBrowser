// [INPUT] Local task records and live Chrome tab-group membership.
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
  async function persist(spaces) {
    const archive=structuredClone(spaces);
    for(const s of Object.values(archive)) for(const page of s.pages || []) {
      const tab=await chrome.tabs.get(page.tabId).catch(()=>null);
      if(tab && tab.windowId===s.windowId) {
        page.fingerprint=await pageFingerprint(tab.url || tab.pendingUrl);
      }
    }
    await chrome.storage.local.set({[ARCHIVE]:{version:1,tasks:archive}});
    await chrome.storage.session.set({[KEY]:archive});
  }
  async function reconcile(s, tabs, groups) {
    const candidates=groups.filter(g=>s.groupTitle && g.title===s.groupTitle);
    const group=candidates.length===1?candidates[0]:null;
    const members=group?tabs.filter(t=>t.groupId===group.id):[];
    const fingerprints=await Promise.all(members.map(async tab=>({tab,fingerprint:await pageFingerprint(tab.url || tab.pendingUrl)})));
    const records=[...(s.pages || []),...(s.missingPages || [])];
    const linked=[],missing=[],used=new Set();
    for(const record of records) {
      const matches=record.fingerprint?fingerprints.filter(p=>p.fingerprint===record.fingerprint):[];
      const uniqueRecord=records.filter(p=>p.fingerprint===record.fingerprint).length===1;
      if(matches.length===1 && uniqueRecord && !used.has(matches[0].tab.id)) {
        const tab=matches[0].tab;used.add(tab.id);linked.push({...record,tabId:tab.id});
      } else {
        const {tabId,...safe}=record;missing.push(safe);
      }
    }
    s.pages=linked;s.missingPages=missing;s.windowId=group?.windowId ?? null;s.groupId=group?.id ?? null;
    s.recovered=true;
    if(!TERMINAL.has(s.state)) {s.state='recovered';s.pauseReason='reload';}
    s.updatedAt=now();
  }
  async function initialize() {
    const session=await chrome.storage.session.get(KEY);
    if(session[KEY]) {await persist(session[KEY]);return;}
    const saved=(await chrome.storage.local.get(ARCHIVE))[ARCHIVE];
    const tasks=saved?.version===1?saved.tasks || {}:{};
    const [tabs,groups]=await Promise.all([chrome.tabs.query({}),chrome.tabGroups.query({})]);
    for(const s of Object.values(tasks)) await reconcile(s,tabs,groups);
    await persist(tasks);
  }
  async function ready() {
    initialized ||= initialize().catch(error=>{initialized=null;throw error;});
    await initialized;
  }
  return {
    async read(){await ready();return (await chrome.storage.session.get(KEY))[KEY] || {};},
    write:persist,
    async retry(s){const [tabs,groups]=await Promise.all([chrome.tabs.query({}),chrome.tabGroups.query({})]);await reconcile(s,tabs,groups);},
  };
}
