// [INPUT] The controlled page's fetch/XHR calls during an action.
// [OUTPUT] Bounded method/status observations; never URLs, headers, bodies or credentials.
// [POS] Action receipts inspired by huashu-chrome 1.3. [PROTOCOL] Evidence is not proof of business success.
export function installWriteProbe() {
  const key = '__beatWriteEvidence';
  if (window[key]) return window[key].sequence;
  const state = window[key] = {sequence:0,entries:[]};
  const add = method => {
    if (/^(GET|HEAD|OPTIONS)$/i.test(method || 'GET')) return null;
    const entry = {sequence:++state.sequence,method:String(method).toUpperCase().slice(0,20),status:null};
    state.entries.push(entry);
    if (state.entries.length > 40) state.entries.shift();
    return entry;
  };
  const originalFetch = window.fetch;
  if (originalFetch) window.fetch = function(input,init) {
    const request = originalFetch.apply(this,arguments);
    const entry = add(init?.method || input?.method || 'GET');
    if (entry) request.then(response=>{entry.status=response.status;},()=>{entry.status=0;});
    return request;
  };
  const methods = new WeakMap();
  const proto = XMLHttpRequest.prototype, open = proto.open, send = proto.send;
  proto.open = function(method) { methods.set(this,method); return open.apply(this,arguments); };
  proto.send = function() {
    const entry = add(methods.get(this));
    if (entry) this.addEventListener('loadend',()=>{entry.status=this.status;},{once:true});
    return send.apply(this,arguments);
  };
  return state.sequence;
}

export function createWriteEvidence(chrome) {
  return {
    async arm(tabId,frameId=0) {
      try {
        const [result] = await chrome.scripting.executeScript({target:{tabId,frameIds:[frameId]},world:'MAIN',func:installWriteProbe});
        return Number.isFinite(result?.result) ? result.result : null;
      } catch { return null; }
    },
    async read(tabId,since,frameId=0) {
      if (since === null) return [];
      try {
        const [result] = await chrome.scripting.executeScript({target:{tabId,frameIds:[frameId]},world:'MAIN',
          func: n => (window.__beatWriteEvidence?.entries || []).filter(item=>item.sequence>n).map(({method,status})=>({method,status})),args:[since]});
        return (Array.isArray(result?.result) ? result.result : []).slice(0,40).map(item=>({
          method: /^[A-Z]{1,20}$/.test(item.method) ? item.method : 'WRITE',
          status: Number.isInteger(item.status) && item.status>=0 && item.status<=599 ? item.status : null,
        }));
      } catch { return []; }
    },
  };
}

export const writesText = writes => writes.slice(0,4).map(item=>`${item.method} ${item.status === null ? 'pending' : item.status}`).join('; ');
