const dot = document.getElementById('dot');
const state = document.getElementById('state');
const btn = document.getElementById('btn');
const conntip = document.getElementById('conntip');

document.getElementById('ver').textContent = 'v' + chrome.runtime.getManifest().version;

function render(connected, r = {}) {
  dot.classList.toggle('on', connected);
  state.textContent = connected ? 'Connected' : 'Not connected';
  btn.hidden = connected;
  btn.disabled = false;
  btn.textContent = 'Reconnect';

  const age = r.lastRx ? Math.round((Date.now() - r.lastRx) / 1000) : null;
  const bits = [];
  if (r.bridge) {
    const mismatch =
      r.bridge !== chrome.runtime.getManifest().version
        ? ' (reload extension)'
        : '';
    bits.push('bridge ' + r.bridge + mismatch);
  }
  if (connected && age !== null) bits.push(age + 's');
  if (!connected && r.offscreenError) bits.push(String(r.offscreenError));
  conntip.textContent = bits.join(' · ');
  conntip.hidden = !bits.length;
}

chrome.runtime.sendMessage({ __hcPopup: 'status' }, (r) => render(!!r?.connected, r || {}));

btn.onclick = () => {
  btn.disabled = true;
  btn.textContent = 'Connecting…';
  chrome.runtime.sendMessage({ __hcPopup: 'connect' }, (r) => render(!!r?.connected, r || {}));
};

const l2btn = document.getElementById('l2btn');
const l2state = document.getElementById('l2state');

function renderL2(on) {
  l2btn.classList.toggle('on', on);
  l2btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  l2state.textContent = on ? 'High-fidelity input' : 'High-fidelity input';
}

chrome.storage.local.get('l2Disabled', ({ l2Disabled }) => renderL2(!l2Disabled));

const markbtn = document.getElementById('markbtn');
const markstate = document.getElementById('markstate');
const sess = document.getElementById('sess');

function renderMark(on) {
  markbtn.classList.toggle('on', on);
  markbtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  markstate.textContent = 'Show control marks';
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
    page.textContent = r.title ? '· ' + r.title : '· idle';
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

async function refreshSpaces() {
  const root=document.getElementById('spaces-list');
  const result=await chrome.runtime.sendMessage({__hcPopup:'spaces',params:{action:'list'}});
  if (result?.error) { document.getElementById('spaces-message').textContent=result.error;return; }
  root.replaceChildren();
  const spaces=result?.spaces || [];
  if (!spaces.length) { root.textContent='No task spaces yet.';return; }
  for (const space of spaces.slice(-20).reverse()) {
    const card=document.createElement('div');card.className='space';
    const title=document.createElement('strong');title.textContent=space.label;
    const state=document.createElement('small');state.textContent=space.state==='user'?'Paused · your confirmation needed':space.state;
    const progress=document.createElement('p');progress.textContent=space.progress || 'No progress report yet.';
    const pageCount=document.createElement('small');pageCount.textContent=`${space.pages?.length || 0} managed pages`;
    const notifyLabel=document.createElement('label');notifyLabel.className='space-notify';
    const notify=document.createElement('input');notify.type='checkbox';notify.checked=space.notifications;
    notify.onchange=async()=>{
      const reply=await chrome.runtime.sendMessage({__hcPopup:'spaces',params:{action:'notifications',spaceId:space.spaceId,notifications:notify.checked}});
      if(reply?.error) document.getElementById('spaces-message').textContent=reply.error;
    };
    notifyLabel.append(notify,document.createTextNode(' Notify me of progress'));
    const actions=document.createElement('div');actions.className='space-actions';
    const choices=[['handoff','View / take over']];
    if (['user','interrupted','expired'].includes(space.state)) choices.push(['resume','Confirm / resume']);
    if (!['stopped','finished'].includes(space.state)) choices.push(['stop','Stop']);
    for (const [action,label] of choices) {
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=async()=>{
        button.disabled=true;
        const reply=await chrome.runtime.sendMessage({__hcPopup:'spaces',params:{action,spaceId:space.spaceId}});
        document.getElementById('spaces-message').textContent=reply?.error || (action==='resume'?'Control returned to the agent.':'Updated.');
        await refreshSpaces();
      };
      actions.append(button);
    }
    card.append(title,state,progress,pageCount,notifyLabel,actions);root.append(card);
  }
}
refreshSpaces().catch(()=>{document.getElementById('spaces-message').textContent='Task spaces are unavailable.';});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='session' && changes.beatTaskSpaces) refreshSpaces().catch(()=>{});
});
