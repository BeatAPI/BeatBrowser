// [INPUT] Human settings actions in the extension popup/workspace.
// [OUTPUT] Local-bridge setup requests and credential-free FAST status.
// [POS] Extension UI. [PROTOCOL] Never persist, prefill or echo API keys.
export function mountFastSettings({ t }) {
  const root = document.createElement('section');
  root.className = 'fast-card';
  root.innerHTML = `
    <div class="fast-heading"><span class="fast-word">FAST</span><span id="fast-status" class="count" role="status"></span>
      <button id="fast-configure" type="button" aria-expanded="false" aria-controls="fast-form" data-i18n="Configure">Configure</button></div>
    <form id="fast-form" hidden autocomplete="off">
      <p class="meta" data-i18n="Browser actions powered by JEV">Browser actions powered by JEV</p>
      <label for="fast-key" data-i18n="BeatAPI API Key">BeatAPI API Key</label>
      <input id="fast-key" type="password" autocomplete="off" spellcheck="false" maxlength="4096" aria-describedby="fast-key-hint" />
      <p id="fast-key-hint" class="meta" data-i18n="Stored only by the local bridge on this computer.">Stored only by the local bridge on this computer.</p>
      <a href="https://beatapi.io/dashboard" target="_blank" rel="noreferrer" data-i18n="Get a BeatAPI key">Get a BeatAPI key</a>
      <label for="fast-model" data-i18n="JEV model">JEV model</label>
      <input id="fast-model" type="text" value="jev-1.13" spellcheck="false" maxlength="128" required />
      <label class="fast-consent"><input id="fast-consent" type="checkbox" />
        <span data-i18n="Allow BeatAPI model calls. FAST tasks send limited page context; calls may use credits.">Allow BeatAPI model calls. FAST tasks send limited page context; calls may use credits.</span></label>
      <p class="meta" data-i18n="Your agent starts each FAST task. Turning this on does not operate any page.">Your agent starts each FAST task. Turning this on does not operate any page.</p>
      <div class="fast-actions"><button id="fast-test" type="button" data-i18n="Test connection">Test connection</button>
        <button id="fast-enable" type="submit" data-i18n="Test & enable">Test & enable</button>
        <button id="fast-disable" type="button" hidden data-i18n="Turn off FAST">Turn off FAST</button></div>
      <button id="fast-forget" class="fast-forget" type="button" data-i18n="Remove saved key">Remove saved key</button>
    </form>
    <p id="fast-message" class="meta" role="status" aria-live="polite"></p>`;
  const settings = document.querySelector('details.adv');
  settings.querySelector('.sess').before(root);
  const el = id => root.querySelector(`#fast-${id}`);
  let current = null, busy = false, message = '', failed = false;
  const errors = {
    FAST_PROCESS_DISABLED: 'Remove the local FAST opt-out and restart your agent.',
    FAST_BRIDGE_REQUIRED: 'Open your agent and reconnect to set up FAST.',
    FAST_BRIDGE_TIMEOUT: 'Update the local BeatBrowser package and restart your agent.',
    INVALID_SETTINGS: 'Enter a valid BeatAPI key and JEV model.',
    MISSING_API_KEY: 'Enter a valid BeatAPI key and JEV model.',
    INVALID_API_KEY: 'Enter a valid BeatAPI key and JEV model.',
    PROVIDER_HTTP_ERROR: 'BeatAPI rejected the test. Check the key, balance and model.',
    INVALID_DECISION: 'The model did not return a valid JEV decision.',
    INVALID_RESPONSE: 'The model did not return a valid JEV decision.',
    NETWORK_ERROR: 'BeatAPI timed out. Try the connection test again.',
    TIMEOUT: 'BeatAPI timed out. Try the connection test again.',
  };
  function render() {
    el('disable').hidden = current?.enabled !== true;
    el('status').textContent = t(current ? current.enabled ? 'On' : 'Off' : 'Unavailable');
    el('status').dataset.on = String(current?.enabled === true);
    el('key').placeholder = t(current?.configured ? 'Key configured · leave blank to keep' : 'Paste your BeatAPI key');
    el('forget').hidden = !current?.savedKey;
    el('message').textContent = t(message);
    el('message').dataset.error = String(failed);
    root.querySelectorAll('button').forEach(button => { button.disabled = busy; });
    el('consent').disabled = busy;
    el('key').disabled = busy;
    el('model').disabled = busy;
  }
  async function request(params) {
    const result = await chrome.runtime.sendMessage({ __hcPopup: 'fastSettings', params });
    if (!result) throw new Error('FAST_BRIDGE_TIMEOUT');
    if (result.error) throw new Error(result.error);
    return result;
  }
  async function refresh() {
    if (busy) return;
    try {
      current = await request({ action: 'status' });
      if (el('form').hidden) el('model').value = current.model;
      if (message === errors.FAST_BRIDGE_REQUIRED || message === errors.FAST_BRIDGE_TIMEOUT) message = '';
    } catch (error) {
      current = null;
      if (!message) { message = errors[error.message] || 'FAST settings unavailable. Reconnect and try again.'; failed = true; }
    }
    render();
  }
  function configure() {
    el('form').hidden = !el('form').hidden;
    el('configure').setAttribute('aria-expanded', String(!el('form').hidden));
    if (!el('form').hidden) { el('model').value = current?.model || 'jev-1.13'; el('key').focus(); }
    else { el('key').value = ''; el('consent').checked = false; }
  }
  async function perform(action) {
    if (busy) return;
    if (['test', 'enable'].includes(action) && !el('consent').checked) {
      message = 'Confirm model calls before testing or enabling FAST.'; failed = true; render(); return;
    }
    busy = true; failed = false; message = ['test', 'enable'].includes(action) ? 'Testing JEV…' : 'Saving…'; render();
    const params = { action };
    if (['test', 'enable'].includes(action)) {
      params.apiKey = el('key').value.trim(); params.model = el('model').value.trim(); params.cloudConsent = true;
    }
    // Keep a tested draft only in this password field until saved or closed.
    try {
      const result = await request(params);
      current = result;
      message = action === 'enable' ? 'FAST enabled. Your agent can now use browser_task.'
        : action === 'test' ? 'JEV connection verified. FAST has not been changed.'
        : action === 'forget' ? 'Saved key removed. FAST is off.' : 'FAST is off. Running FAST tasks are being stopped.';
      if (action !== 'test') el('key').value = '';
      if (action === 'enable' || action === 'forget') {
        el('form').hidden = true; el('consent').checked = false;
        el('configure').setAttribute('aria-expanded', 'false');
      }
    } catch (error) {
      message = errors[error.message] || 'FAST settings unavailable. Reconnect and try again.'; failed = true;
    } finally { params.apiKey = undefined; busy = false; render(); }
  }
  el('configure').onclick = configure;
  el('disable').onclick = () => perform('disable');
  el('test').onclick = () => perform('test');
  el('forget').onclick = () => perform('forget');
  el('form').onsubmit = event => { event.preventDefault(); void perform('enable'); };
  const timer = setInterval(refresh, 5000);
  settings.addEventListener('toggle', () => {
    if (!settings.open && !el('form').hidden) configure();
  });
  window.addEventListener('pagehide', () => { clearInterval(timer); el('key').value = ''; });
  void refresh();
  return { render };
}
