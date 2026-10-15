import {taskPresentation, activityLabel} from './workspace-state.js';
const ui = globalThis.BeatBrowserUI;
let language = await ui.read();
const t = (key, params) => ui.text(key, language, params);
const languageSelect = document.getElementById('language');
function applyLanguage() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  languageSelect.querySelectorAll('button').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.language === language)); });
  languageSelect.setAttribute('aria-label', t('Language'));
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}
applyLanguage();
languageSelect.querySelectorAll('button').forEach(button => {
  button.onclick = async () => {
    try { await chrome.storage.local.set({uiLanguage:button.dataset.language}); }
    catch { showMessage(t('Connection unavailable. Try reconnecting.'),true); }
  };
});
const dot = document.getElementById('dot');
const state = document.getElementById('state');
const btn = document.getElementById('btn');
const conntip = document.getElementById('conntip');

document.getElementById('ver').textContent = 'v' + chrome.runtime.getManifest().version;

function render(connected, r = {}) {
  dot.classList.toggle('on', connected);
  const mismatch = connected && r.bridge && r.bridge !== chrome.runtime.getManifest().version;
  state.textContent = t(mismatch ? 'Update required' : connected ? 'Connected' : 'Disconnected');
  btn.hidden = connected;
  btn.disabled = false;
  btn.textContent = t('Reconnect');

  conntip.textContent = mismatch ? t('Reload the extension and restart your agent.') : connected ? '' : t('Open your agent to connect.');
  conntip.hidden = connected && !mismatch;
}

function refreshConnection() {
  chrome.runtime.sendMessage({ __hcPopup: 'status' }, (r) => {
    if (chrome.runtime.lastError) return render(false);
    render(!!r?.connected, r || {});
  });
}
refreshConnection();
const connectionTimer=setInterval(refreshConnection,5000);
window.addEventListener('pagehide',()=>clearInterval(connectionTimer));

btn.onclick = () => {
  btn.disabled = true;
  btn.textContent = t('Connecting…');
  chrome.runtime.sendMessage({ __hcPopup: 'connect' }, (r) => render(!!r?.connected, r || {}));
};

const l2btn = document.getElementById('l2btn');
const l2state = document.getElementById('l2state');

function renderL2(on) {
  l2btn.classList.toggle('on', on);
  l2btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  l2state.textContent = t('Precise input');
}

chrome.storage.local.get('l2Disabled', ({ l2Disabled }) => renderL2(!l2Disabled));

const markbtn = document.getElementById('markbtn');
const markstate = document.getElementById('markstate');
const sess = document.getElementById('sess');

function renderMark(on) {
  markbtn.classList.toggle('on', on);
  markbtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  markstate.textContent = t('Control marks');
}

function renderSessions(rows) {
  sess.textContent = '';
  for (const r of rows) {
    const line = document.createElement('div');
    line.className = 's';
    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = r.color;
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = r.label;
    const page = document.createElement('span');
    page.className = 'page';
    page.textContent = r.title ? t('Linked page') + ' · ' + r.title : t('No linked page');
    page.title = page.textContent;
    line.append(sw, who, page);
    sess.appendChild(line);
  }
}

function refreshMark() {
  chrome.runtime.sendMessage({ __hcPopup: 'sessions' }, (r) => {
    renderMark(r?.enabled !== false);
    renderSessions(r?.sessions || []);
  });
}
refreshMark();

markbtn.onclick = () => {
  chrome.storage.local.get('markDisabled', ({ markDisabled }) => {
    chrome.storage.local.set({ markDisabled: !markDisabled }, () => {
      chrome.runtime.sendMessage({ __hcPopup: 'markSync' }, () => refreshMark());
    });
  });
};

l2btn.onclick = () => {
  chrome.storage.local.get('l2Disabled', ({ l2Disabled }) => {
    const turningOff = !l2Disabled;
    if (turningOff) {
      chrome.runtime.sendMessage({ __hcPopup: 'detachAll' }, () => {
        chrome.storage.local.set({ l2Disabled: true }, () => renderL2(false));
      });
    } else {
      chrome.storage.local.set({ l2Disabled: false }, () => renderL2(true));
    }
  });
};

const isPanel = document.body.classList.contains('panel');
const messageArea = document.getElementById('spaces-message');
function showMessage(message,isError=false) { messageArea.textContent=message;messageArea.dataset.error=String(isError); }
async function control(params) {
  try {
    const reply=await chrome.runtime.sendMessage({__hcPopup:'spaces',params});
    if (!reply || reply.error) throw Error(reply?.error || 'No response from the extension. Reload BeatBrowser and reconnect.');
    return reply;
  } catch(error) { showMessage(t(error.message),true);throw error; }
}
const workspaceButton = document.getElementById('open-workspace');
if (workspaceButton) {
  workspaceButton.disabled = true;
  chrome.windows.getCurrent().then(win => {
    workspaceButton.disabled = false;
    workspaceButton.onclick = () => {
      chrome.sidePanel.open({windowId:win.id}).then(() => window.close()).catch(error => {
        messageArea.textContent = t('Could not open the sidebar.');
      });
    };
  }).catch(() => { messageArea.textContent = t('Open from the Chrome toolbar.'); });
}
let cleanupBusy = false;
const clearEnded = document.getElementById('cleanup-ended');
const clearAll = document.getElementById('cleanup-all');
const confirmation = document.getElementById('cleanup-confirm');
async function clean(params) {
  if (cleanupBusy) return;
  cleanupBusy = true;clearEnded.disabled = true;clearAll.disabled = true;
  confirmation.hidden = true;
  try {
    const r = await control(params);
    showMessage(t('Removed {removed} · Closed {closed} · Kept {kept}', r) + (r.failed ? ' · '+t('{failed} failed; retry',r) : ''), !!r.failed);
  } catch {} finally { cleanupBusy = false;await refreshSpaces().catch(() => showMessage(t('Connection unavailable. Try reconnecting.'),true)); }
}
clearEnded.onclick = () => clean({action:'cleanup-ended'});
clearAll.onclick = () => {confirmation.hidden = false;};
document.getElementById('cleanup-cancel').onclick = () => {confirmation.hidden = true;};
document.getElementById('cleanup-confirm-yes').onclick = () => clean({action:'cleanup-all',userConfirmed:true});
let renderSequence = 0;
async function refreshSpaces() {
  const sequence = ++renderSequence;
  const root=document.getElementById('spaces-list');
  const result=await chrome.runtime.sendMessage({__hcPopup:'spaces',params:{action:'list'}});
  const openHistory=new Set([...root.querySelectorAll('.space')].filter(c=>c.querySelector('.timeline')?.open).map(c=>c.dataset.spaceId));
  if (sequence !== renderSequence) return;
  if (!Array.isArray(result?.spaces) || result?.error) {
    document.getElementById('task-count').textContent='—';
    clearEnded.disabled=true;clearAll.disabled=true;
    root.replaceChildren();showMessage(t('Task spaces unavailable'),true);return;
  }
  root.replaceChildren();
  const spaces=result?.spaces || [];
  document.getElementById('task-count').textContent=String(spaces.length);
  clearEnded.disabled = cleanupBusy || !spaces.some(s=>taskPresentation(s, language).terminal);
  clearAll.disabled = cleanupBusy || !spaces.length;
  const active=spaces.filter(s=>['opening','running'].includes(s.state)).length;
  const review=spaces.filter(s=>taskPresentation(s, language).canResume).length;
  document.getElementById('task-summary').textContent=spaces.length ? t('{active} active · {review} paused',{active,review}) : '';
  if (!spaces.length) {
    root.className='empty-space';
    const title=document.createElement('strong');title.textContent=t('No background tasks');
    const description=document.createElement('p');description.textContent=t('Browser pages are listed below.');
    const icon=document.createElement('span');icon.className='empty-icon';icon.setAttribute('aria-hidden','true');icon.textContent='{ }';
    root.append(icon,title,description);return;
  }
  root.className='';
  const priority = state => state === 'user' ? 0 : ['stopped','finished'].includes(state) ? 2 : 1;
  for (const space of [...spaces].reverse().sort((a,b)=>priority(a.state)-priority(b.state)).slice(0,20)) {
    const card=document.createElement('div');card.className='space';card.dataset.state=space.state;card.dataset.spaceId=space.spaceId;
    const presentation=taskPresentation(space, language);
    const title=document.createElement('strong');title.textContent=space.label;
    const state=document.createElement('small');state.className='state-badge';state.textContent=presentation.label;
    const detail=document.createElement('p');detail.className='pause-detail';detail.textContent=presentation.detail;detail.hidden=!presentation.detail;
    const progress=document.createElement('p');progress.textContent=space.progress || t(presentation.terminal ? 'Task ended' : 'No updates yet');
    const pageCount=document.createElement('small');pageCount.className='page-count';pageCount.textContent=t('{count} pages',{count:space.pages?.length || 0});
    const notifyLabel=document.createElement('label');notifyLabel.className='space-notify';
    const notify=document.createElement('input');notify.type='checkbox';notify.checked=space.notifications;
    notify.onchange=async()=>{
      notify.disabled=true;
      try { await control({action:'notifications',spaceId:space.spaceId,notifications:notify.checked}); }
      catch { notify.checked=!notify.checked; }
      finally { notify.disabled=false; }
    };
    notifyLabel.append(notify,document.createTextNode(' '+t('Progress notifications')));
    const actions=document.createElement('div');actions.className='space-actions';
    const choices=[];
    if (space.pages?.length) choices.push(['handoff',presentation.terminal?'View':'Take over']);
    if (presentation.terminal) choices.push(['cleanup','Clear']);
    if (presentation.canResume) choices.push(['resume','Continue']);
    if (!presentation.terminal) choices.push(['stop','Stop']);
    for (const [action,label] of choices) {
      const button=document.createElement('button');button.type='button';button.textContent=t(label);button.dataset.action=action;
      button.onclick=async()=>{
        button.disabled=true;
        if (action === 'cleanup') { await clean({action,spaceId:space.spaceId});return; }
        try {
          const reply=await control({action,spaceId:space.spaceId});
          showMessage(t(action==='resume' ? (reply.state==='running'?'Control returned':'Control unavailable') : action==='handoff' ? 'You have control' : 'Stopped'), action==='resume' && reply.state!=='running');
          await refreshSpaces();
        } catch {} finally { button.disabled=false; }
      };
      actions.append(button);
    }
    card.append(title,state,detail,progress,pageCount);
    if (!presentation.terminal) card.append(notifyLabel);
    card.append(actions);
    if(space.missingPages?.length) {
      const missing=document.createElement('p');missing.className='pause-detail';missing.textContent=t('Missing pages: {count}',{count:space.missingPages.length});
      const reconnect=document.createElement('button');reconnect.type='button';reconnect.textContent=t('Reconnect pages');
      const retry=document.createElement('button');retry.type='button';retry.textContent=t('Check again');
      retry.onclick=async()=>{try{await control({action:'retry-recovery',spaceId:space.spaceId});await refreshSpaces();}catch{}};
      const picker=document.createElement('div');picker.className='recovery-picker';
      reconnect.onclick=async()=>{
        try {
          const result=await control({action:'candidates',spaceId:space.spaceId});picker.replaceChildren();
          for(const page of space.missingPages) {
            const row=document.createElement('div');
            const label=document.createElement('label');label.textContent=page.label;
            const select=document.createElement('select');select.setAttribute('aria-label',page.label+' · '+t('Select page'));
            const empty=document.createElement('option');empty.value='';empty.textContent=t('Select page');select.append(empty);
            for(const candidate of result.pages) {
              const option=document.createElement('option');option.value=String(candidate.tabId);
              option.textContent=(candidate.title || new URL(candidate.url).hostname).slice(0,70);select.append(option);
            }
            const link=document.createElement('button');link.type='button';link.textContent=t('Link');link.disabled=true;
            select.onchange=()=>{link.disabled=!select.value;};
            link.onclick=async()=>{
              const selected=result.pages.find(p=>p.tabId===Number(select.value));if(!selected)return;
              link.disabled=true;
              try {await control({action:'relink',spaceId:space.spaceId,pageLabel:page.label,...selected,userConfirmed:true});await refreshSpaces();}
              catch {link.disabled=false;}
            };
            label.append(select);row.append(label,link);picker.append(row);
          }
        } catch {}
      };
      const recoveryActions=document.createElement('div');recoveryActions.className='cleanup-actions';recoveryActions.append(reconnect,retry);
      card.append(missing,recoveryActions,picker);
    }
    if (isPanel) {
      const list=document.createElement('ul');list.className='page-list';
      for (const page of space.pages || []) {
        const row=document.createElement('li');
        const name=document.createElement('span');name.textContent=`${page.label} · ${t(page.openedBy === 'user' ? 'Your page' : 'Agent page')}`;
        const view=document.createElement('button');view.textContent=t('View');view.type='button';
        view.onclick=async()=>{
          view.disabled=true;
          try {
            await control({action:'handoff',spaceId:space.spaceId,pageLabel:page.label});
            showMessage(t('You have control'));
          } catch {}
          finally { view.disabled=false; }
        };
        row.append(name,view);list.append(row);
      }
      const history=document.createElement('details');history.className='timeline';
      const summary=document.createElement('summary');summary.textContent=t('Activity');
      const entries=document.createElement('ol');history.append(summary,entries);
      history.ontoggle=async()=>{
        if (!history.open) return;
        let log;
        try { log=await control({action:'events',spaceId:space.spaceId,after:0}); }
        catch { return; }
        entries.replaceChildren();
        for (const event of (log?.events || []).slice(-12).reverse()) {
          const item=document.createElement('li');
          item.textContent=`${new Date(event.at).toLocaleTimeString(language==='zh'?'zh-CN':'en', {hour:'2-digit',minute:'2-digit'})} · ${activityLabel(event, language)}${event.pageLabel ? ' · '+event.pageLabel : ''}`;
          entries.append(item);
        }
        if (log?.error) { const item=document.createElement('li');item.textContent=t('Task spaces unavailable');entries.append(item); }
      };
      card.append(list,history);
      if (openHistory.has(space.spaceId)) history.open=true;
    }
    root.append(card);
  }
}
refreshSpaces().catch(()=>{document.getElementById('spaces-message').textContent=t('Task spaces unavailable');});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='local' && changes.uiLanguage) {
    language=ui.resolve(changes.uiLanguage.newValue);applyLanguage();showMessage('');refreshConnection();refreshMark();refreshSpaces().catch(()=>{});
  }
  if(area==='session' && changes.beatTaskSpaces) refreshSpaces().catch(()=>{});
});

const retryPages = document.getElementById('retry-browser-pages');
const pageRoot = document.getElementById('browser-pages-list');
const closePages = document.getElementById('close-browser-pages');
const pageConfirmation = document.getElementById('browser-pages-confirm');
const pageMessage = document.getElementById('browser-pages-message');
let browserPages = [], pendingPages = [], pagesBusy = false, pagesSequence = 0;
async function pageControl(params) {
  const result = await chrome.runtime.sendMessage({__hcPopup:'workspacePages',params});
  if (!result) throw Error('Reload BeatBrowser to update its background service.');
  if (result.error) throw Error(result.error);
  return result;
}
function confirmPages(pages) {
  pendingPages = pages.map(p => ({tabId:p.tabId,windowId:p.windowId,url:p.url}));
  document.getElementById('browser-pages-confirm-text').textContent=t('Close {count} selected pages?',{count:pendingPages.length});
  pageConfirmation.hidden=false;
}
async function refreshBrowserPages() {
  const sequence=++pagesSequence;
  try {
    const result=await pageControl({action:'list'});
    if(sequence!==pagesSequence)return;
    browserPages=result.pages;
    retryPages.hidden=true;
    closePages.hidden=!browserPages.length;
    document.getElementById('browser-page-count').textContent=String(browserPages.length);
    document.getElementById('browser-page-summary').textContent=t('Linked pages in this Chrome profile')+' · '+t('{windows} windows · {pages} pages',{windows:result.windows,pages:browserPages.length});
    closePages.disabled=pagesBusy || !browserPages.length;
    pageRoot.replaceChildren();
    if (!browserPages.length) {
      const empty=document.createElement('p');empty.className='meta';empty.textContent=t('No linked pages');pageRoot.append(empty);
    }
    for (const page of browserPages) {
      const row=document.createElement('div');row.className='browser-page';row.dataset.tabId=page.tabId;
      const name=document.createElement('span');name.className='browser-page-title';name.textContent=page.title || t('Page');name.title=page.url;
      const actions=document.createElement('div');actions.className='cleanup-actions';
      const view=document.createElement('button');view.type='button';view.textContent=t('View');view.dataset.pageAction='view';
      view.onclick=async()=>{try{await pageControl({action:'view',tabId:page.tabId});}catch{pageMessage.textContent=t('Pages unavailable');}};
      const close=document.createElement('button');close.type='button';close.textContent=t('Close');close.dataset.pageAction='close';close.disabled=pagesBusy;
      close.onclick=()=>confirmPages([page]);actions.append(view,close);row.append(name,actions);pageRoot.append(row);
    }
  } catch (error) {
    if(sequence!==pagesSequence)return;
    browserPages=[];closePages.disabled=true;pageRoot.replaceChildren();
    document.getElementById('browser-page-count').textContent='—';
    retryPages.hidden=false;closePages.hidden=true;
    document.getElementById('browser-page-summary').textContent=t(error.message === 'Reload BeatBrowser to update its background service.' ? error.message : 'Page list failed to load. Retry or reload BeatBrowser.');
  }
}
retryPages.onclick=()=>refreshBrowserPages();
closePages.onclick=()=>confirmPages(browserPages);
document.getElementById('browser-pages-cancel').onclick=()=>{pendingPages=[];pageConfirmation.hidden=true;};
document.getElementById('browser-pages-confirm-yes').onclick=async()=>{
  if(pagesBusy)return;
  pagesBusy=true;closePages.disabled=true;pageConfirmation.hidden=true;
  try {
    const result=await pageControl({action:'close',userConfirmed:true,pages:pendingPages});
    pageMessage.textContent=t('Closed {closed} · Kept {skipped}',result)+(result.failed?' · '+t('{failed} failed; retry',result):'');
  } catch {pageMessage.textContent=t('Pages unavailable');}
  finally {pendingPages=[];pagesBusy=false;await refreshBrowserPages();}
};
const pagesTimer=setInterval(refreshBrowserPages,3000);
window.addEventListener('pagehide',()=>clearInterval(pagesTimer));
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='local' && changes.uiLanguage) {
    pageMessage.textContent='';
    if(!pageConfirmation.hidden)confirmPages(pendingPages);
    refreshBrowserPages();
  }
});
refreshBrowserPages();
