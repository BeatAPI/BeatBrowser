// [INPUT] One content command, existing Chrome/CDP adapters and readiness injection.
// [OUTPUT] A single response or a bounded, accurately classified failure.
// [POS] Background transport. [PROTOCOL] Never replay a timed-out command or foreground a page.
export function createContentTransport({chrome, cdp, ensureContent, contentBudget, diagnosticBudget = 2500}) {
  const error = (code, message) => Object.assign(new Error(message), {code});
  const bounded = (work, ms, failure) => {
    let timer;
    return Promise.race([work, new Promise((_, reject) => { timer=setTimeout(()=>reject(failure),ms); })]).finally(()=>clearTimeout(timer));
  };
  async function tabState(tabId) {
    const tab = await chrome.tabs.get(tabId).catch(()=>null);
    if (!tab) throw error('NO_TAB','The tab is no longer available.');
    if (tab.discarded) throw error('TAB_DISCARDED','Chrome discarded this page. Inspect and explicitly reload it; no command was replayed.');
    return tab;
  }
  async function diagnose(tabId) {
    const tab = await tabState(tabId);
    let dialog = cdp.pendingDialog(tabId);
    if (!dialog && await cdp.isEnabled()) {
      dialog = await bounded(cdp.probeDialog(tabId), diagnosticBudget, error('PAGE_BUSY','Dialog probe timed out.')).catch(()=>null);
    }
    if (dialog) return error('DIALOG_BLOCKING',`A ${dialog.type} dialog is confirmed. Ask the user to inspect it; no command was replayed.`);
    if (tab.frozen) return error('PAGE_FROZEN','Chrome froze the page during this operation. Its outcome is unknown; inspect before continuing. No command was replayed.');
    return error('PAGE_BUSY','The page did not respond, and no dialog was confirmed. The previous operation may still complete. Inspect with read tools before further actions; do not repeat a write.');
  }
  return async function send(tabId,payload,frameId=0) {
    const tab = await tabState(tabId);
    // Recover before dispatch only. Unfreezing after timeout and resending could duplicate a write.
    if (tab.frozen) {
      await bounded(cdp.unfreeze(tabId),diagnosticBudget,error('PAGE_FROZEN','Could not unfreeze this page before sending the command.'));
    }
    await ensureContent(tabId,frameId);
    const stalled = error('CONTENT_STALLED','Content response timed out.');
    let result;
    try {
      result = await bounded(chrome.tabs.sendMessage(tabId,payload,{frameId}),contentBudget(payload),stalled);
    } catch (failure) {
      if (failure === stalled) throw await diagnose(tabId);
      if (failure?.code) throw failure;
      throw error('TIMEOUT',`Page communication failed; outcome may be unknown. ${failure?.message || 'No response'}`);
    }
    if (!result) throw error('INTERNAL','The page script returned nothing.');
    if (result.error) throw error(result.error.code,result.error.message);
    return result.data;
  };
}
