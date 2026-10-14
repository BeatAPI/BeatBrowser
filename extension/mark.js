
//

//

//

//

//

//

(() => {
  if (window.__hcMark) return;
  window.__hcMark = true;
  const ui = globalThis.BeatBrowserUI;
  let language = ui.resolve();
  const t = (key, params) => ui.text(key, language, params);
  ui.read().then(value => { language=value;render();updateAskLanguage(); }).catch(()=>{});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.uiLanguage) {
      language=ui.resolve(changes.uiLanguage.newValue);render();updateAskLanguage();
    }
  });

  
  
  const TOP = window.top === window;

  
  
  
  
  
  // BeatAPI brand mark; kept in sync with extension/icons/icon128.png.
  const AVATAR_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAgKADAAQAAAABAAAAgAAAAABIjgR3AAAOrElEQVR4Ae1de4wkRRmv6nntzszu3s7M7pEFjcdDYoIEOCIvQYmgiDwEPJAjXOAkBBQ08Q9FCAGSM2qMgBiCBALhCOHglLsAgghCMDwEoycXjIAHQe5A9m5n3zM7r67yVzPbx0zP7Ex3b/d012xV0tNV1fV9Vf37fl1dXT1dHyEqKAQUAgoBhYBCQCGgEFAIKAQUAisLARqk082cwwfK/cXRCImFNC03s/fh5Pjy2jeS7OsrjRDSRwv9pSyZmppZnr7ekw4EAVLfKnyVhCMbCdWOJ5yPUkQ4JXOE8LcoqzzK2O7NU1sPsWy8cHLkFI3zKwknJxLKR2E2cZ6T2HYQjdxfmstuR5xjW/HBVwKkLskOEn3oNth7Iw1RwvVFewjToGVUq+15hb3JWfGqqUfjL7e32Fg8lizcyjm9AtKhZhsvni4lj4cZuTqfn/iovb7eP+obAUbW7U3qWmobjYRO45X2QFdNycgE5eWzsluiry1ROhJNZB7CsXXNhjdLCHbxv5Yi7IyVflsQ15gvoaIN30CjnY0vGid6BvQGGc7DDwyctyfdqsGxZPpq5FswflUjlNLjIyV6YytdKynPFwIMrecHUxq6ptOVX2+IKgki9PBIKHNpfX4tPpLkjHy/85VfL8lxl6GXkcTIAfW5Ky3uCwE0nXyNhmnS9jCMwTzh8MXkyy+E6w3Vl+RrYc1D6vOsxWk6ytgJ1sr2ZilfCEApOcoJnFwMDjn9bGbwCDGy3x90xg7FTWJ/2k4EzxuftlHeWSU2Kuh20YYrqVuVw45xR0jWHtySOilk0Nb6EbxzIlNa07rEyYcHRk6mjF2Ax8q1nNI+FBPPKm9jEPlEaX7yCcSLS4hKke0LAYBMW9A7IEe5VnFu8A7KjcMJjA3KhN9OGMPAUsxLCMqKZlepexx6og2xeOZlRui15fy+HYacbHvPgfQEEFZx1IFYbsvAWKZM2JMofxE2YCQMb3DWiHNwgJykUf5MJJ5Za1l3wArKSQBvQaRRVrwdVzqMahh9qQpBAkJGKGX3kpGR5FKlgpwvJwG0cCfLOMY80p/+AoRx5VutQpTTjork9AsdV+qjoJwE8BAwTDh9E1e/7bERpfQ8D5vlmWpFgCZo6ZFNWR0zqr0FHkVJrGPRgBVQBDAZBHd1p0YcJKtW9ZvUBT6pCNBsIqs3f7OkUzmznq6mFQG6CnfwKpOTAF7PAzizk+oBnOHmQMrDx0AHrTFEvJ2cMmpxeW/7ccfl+leMOswWHqtRdhJeaH6KcjqpUfJ6IZd9EQCU/QRBTgJIdAuIxzNjmLi+DRNL53OihavdBH4YJprwLuElRivXlHPTb/hFAjnHAH6hZbfexOjqCuXinYKYJcTFJoYJxoYYJV+kJPRUNDH8ebuq3SqvCOAWkouvCevVxQj7KbKPrhm9/ogRF2SgY5RodyDiS28sJwGCOQg0rFrd9w0NreGUW3inUH2h9KVwf0q8g+h6kJMAXYfJfoVMDx2LPt7iG0JKNY2ebL+W5UsoAiwfQ0NDwzwA/md0oHHA0p6SAUvlXC6kCOAyoJ+o0+ze0xsI9Ikeb2OKAO7ha54I8sWgdk9HEcAuYj1WXhGgxwxq93QUAewi1mPlFQE8MyhTYwDPsA2mYikMboZO9QBmRJynTU8BeN8nQVAEkMBIXjZRTgIE83Wwl3byTLecBJDgZZBnFnNZsZwEcBkEb9SppwBvcFVaXUVAzh5AijGAJgW2UjTSVcorZQ0IyEkANQhsMOJyEnISYDlnrGQbEJCTAFKMARyuWtVgHu8TchJAhltAda1jWwb0ZepYTgJ42wM4NQQjmiZWMqwGnbN3jbiVPWf8PSvl3C4jJwHcRqFOH/7MOVuXtBHlWTI5mTMEKhH2N3wP8IGRbrvnfD7E2PNty3h0sFcI4PxVLJYWb8CWkqUWo24o1pgQKuhO/Ig1BGthenoaK8v9ssX3IkaJxT1kKf9toTD9vulAV5I9QQB4l0B364wDWGP4f/VIU43ClwDP1+dZiWPxwkfM5Yrz2bs457+pkaCRZ7WyyOP8sVIucrNZtlvpniBAYV7/BwD7r33Q+DScCrxaL1ecm3gbVrmz85VrSAnD8ieK+X3PGjl1e72cz2IRa7Iehn4FHBW3CDFOWID+f2KR0mtL+ey3CRnff+uok+1K1O5/17vSqI6VND0FCFcw6bsA6s9hjI7itQJwUEH45oWFyd1mgVIuflM0vnAwofSC9vqqxn8tQrQrS20+8y7lJh5GHY/EYqNrWIgP4ouB+eLsvveR5+un4eK85ewBWjwFlHL9d8Cgf7Z25QrDkTfKNLJJRJrDnoVSfvgSXLU3YlH58ZpOIVO/kVnK+Z2lUPnMXG7fx806mnJYsbj3XbGsLIz/Hxz13fiihXL2AE3Yiow9C2W6en2U6/fCUGfXirTqDWBEyl/Fx3gbyOzH+1qqqmbuKpbyZBO+77+vTPlpyDoGkquwYvk80eibmqY9B0PuWlpejiM9RAAAPj++F13xeZFEej1Sl8Ng+DSbrKqaQtx/Kfk38h4qJsL3kHFr991Fv0KboUNsPRd6iwA18+jlXPZBRB/s708dVCH0QB7WouGy9mGhMP4B8ivVoVjPmdLZCfUiAfYjgQHeHiTEBqur0AoBOQeBTU8BrU5N5VlBQE4CWDkzVcYSAooAlmDq3UI9PQYgAwPpGImlYT4a0sksRvQN0769a1brZ9aTBIjFh7+ONfmuxKTrcZgcGhZwYK2+HB4PxQub+/GUsAX7QEzEiLb5GeQkQIuZwBqIY/FoongXpn821GbtGiaC+uAo8lSUOxVEuBS+gy9fWMh+aAX8BNb7KzJyaEirxHWqlSO6/t7CwpR4pJQ+9NIYIBaNFzfD8DC+CA3Gr2VV86oeQ0/XKdlKhoeHFg+03EUTo0dGE+nNFcJ2apr+EiT/BPdxL+iathN+ip+MJVKntxSUKLNnCABjfLfzyxvDMiAHpSdES9p1Ro55j17iMrzefxEFL8VtZNR0XBDnGyDE09FkehPi0uIoZ8Ob5gEyA5ijv7b1VW8y3f6k6AnIRtG9789ajETj6XNx7B4kMY3cqicRBav5IawFeAPKX78oKt1OTgKYxgB9ycoxuKLX2EUfFBgtM/3EBrnBwRTR+K3Iszg+Er0JuT6aHD6iQU/rREw8mRAyFm99uPu5chLA1APoTDtMWMFJMPsOjujhcwnXDrani/bjn2Ubl5KJxEeOjiUz92A8sSPCov/CWEWMIR7BbeuMpWS6lS8nAZrRcWZ9ocfkOxhPCl9pVt8pB30JJcILeROekXjqO/jryV9wi7oCxz+Hhq4GVw9B/EJIYaXwNP7E0iyHvK6EpgZ3pdYAV4IO/QBHzeP0AHgPbejaMR9xJvwJ3o3/H2DNYPNYopoGH+iPQYIfOarTBSE5CWAaA7iAQ70Ks6Xqj7WLR0m5XDdu+Ewfp9otMHCondAiMa4Tr67bl/PmqJwE8AaL5WptIE54YPYYKFzbfOW3qoYOwR+6L3MKchLANAhsBanfeZSRw8UAw2o7cKsQ44KuBzkJ4O0twBUjANjaX9Gsa2voQayLLa+knARY3jl3S9ry1d+tBrWqRxGgFSorKE8RYAUZu9WpykkACQaBrcAOYp6cBAgiks1t8mVQ19yM9jmKAO3xWc5RNQhcDnryy8pxbcnRSjnYYOryxVfgwQ+KAG7aqOHNovIX4Ca0cuhqXG7G1CME8xRUDxBMu3StVYoA7kFtHvWb0+7V5KImRQAXwZRRlSKAjFZzsc2KAC6CKaMqOQkQzP8DmEb9ymWMdxdEUF8GNc4DeHf+LmqWswdwEQBXVTXOA6inAFfBlU6ZugVIZ7JlNth0xSunUcvEU25xxtmkDGegxgAeWYmHuFh02vRk0KYyTlC++0FOAgTzMbDBepW5ob/juwAsSWO6MzSUqiVQYgILTj/X4pDnWXISIJiPgaar/f0CPjO/pbMFqwT5hcUFpzurs1lCTgLYPMkuFW+61Etz2W2UsB+iFxD+AUzNqKZBGv6zYm7iV6aDXUvWfczYtTpXVEXF3ORtkf70K1Qj38OJH4ctiS/GCoTxnZg3uhvH/+gnIIoAXUC/vJAVfoiwHdRPhub6yEwfFjW3tlq5181TBPAa4Qb9exbIjHAXAwcnAQlqDBAQQ/jVDEUAv5APSL2KAM2GMA/Xm0u0zhELBZkeBVsXDFKuIoDJGljSYdqUZTHJJ8jUlG/u3yw2sqmYIoAZEk7g8tVuEJ1G1XOodI5J/CKA027WrmVsl4fn0G2YnLF5JaP3J1z4BpQu+EIAVDrvCKkqbWieaKumHMlbEILn0HdgzV83z9wtJYxGcbIdEzrPLlUiyPm+EABfzb3pCJQqAfTdmYWJBkeN+AjrA2EF+wEyTNtllivN92/C2n6PdSYBGkT5KxEaugo6PnEcbVYY4LQvBNB18gyvoBeoGtQ6OphOhZnZtl1PH1aslyqG9dehytLa//VyiH9UDBXELJ0pwHPofPZi1PYTWBhkEw01b2QWjqHvLGnls3O5vfAuKmewaQL3TjJ1Ufl2Gg3/gFv12yGoythuLT95/MTjIx+ZWxKNp24iVLvZek+AU6f8Rhh6k1lXfRqeQ8fgORTLx9KjcZ8fxYPeDCP0DU2nzxeL8nsO9Y0Aw+smh6g2+DiNhk7pRAKx1iZnbIaW5y7I/m4V/AO3CqsTkURlO9b6Pa0zCcRps6dKub516ARsu4pvVbuseb7cAgRYU1tTM+VS/nxe0beIpZKrC6oKuxiUxF7kUbytgPHfYsXSOUsbX2gcz5W1Elyxky01JYYiccwIRh7bUooRdPEr2/gCFQMRAyFf9umLiucTGtmAIZlYXjWDq1hDy2bgqeMduHv6vT6bf2DmD9ZH/rF45izIboSOY6FPeA0TQfxHbwfIdh/e02+v5qifYBDAsEPqEj6oV4ojERILFdj81PzWgTbevQ2pNvtUarAvH8mIEoX+UhYzdcF5Ddem2eqQQkAhoBBQCCgEFAIKAYWAQkAhoBDwDoH/AwPqyqmGd8gmAAAAAElFTkSuQmCC';

  let bitmapP = null;
  function avatarBitmap() {
    if (!bitmapP) {
      const bytes = Uint8Array.from(atob(AVATAR_B64), (ch) => ch.charCodeAt(0));
      bitmapP = createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    }
    return bitmapP;
  }

  
  
  function avatarCanvas(size, cls) {
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    c.style.width = c.style.height = `${size}px`;
    c.className = cls || 'ava';
    avatarBitmap().then((bmp) => {
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    }).catch(() => { c.style.background = '#a8a29e'; });
    return c;
  }

  

  let owners = [];      // [{ emoji, color, label, code, sid }]
  let logs = {};        
  let intents = {};     
  let plan = [];        
  let tabLabel = '';    
  let expanded = false; 
  let host = null, wrap = null;
  let watchdog = null, flashTimer = null, tickTimer = null;
  const actState = new Map();   

  const CSS = `
    :host { all: initial; }
    .wrap { color-scheme:light; --beat-bg:#f4f5fc; --beat-ink:#1a1a1c; --beat-line:#e4e7f0; --beat-accent:#3a5bc7; font: 500 12px/1.6 "DM Sans", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; }
    .edge {
      position: fixed; pointer-events: none; z-index: 2147483645;
      opacity: .38; transition: opacity .18s ease, filter .18s ease;
    }
    .edge.t { top: 0; left: 0; right: 0; height: 2px; }
    .edge.b { bottom: 0; left: 0; right: 0; height: 2px; }
    .edge.l { top: 0; bottom: 0; left: 0; width: 2px; }
    .edge.r { top: 0; bottom: 0; right: 0; width: 2px; }
    .lit .edge { opacity: 1; filter: saturate(1.3); }
    .cursor {
      position: fixed; left: 0; top: 0; z-index: 2147483645;
      pointer-events: none; opacity: 0;
      transition: transform .24s cubic-bezier(.2,.8,.3,1), opacity .4s ease;
      will-change: transform;
    }
    .cursor.on { opacity: 1; }
    .cursor .glow {
      position: absolute; left: -32px; top: -32px; width: 64px; height: 64px;
      border-radius: 50%; background: radial-gradient(circle, var(--c) 0%, transparent 62%);
      opacity: .5; animation: hcBreathe 2.4s ease-in-out infinite;
    }
    @keyframes hcBreathe {
      0%, 100% { transform: scale(1); opacity: .38; }
      50%      { transform: scale(1.35); opacity: .68; }
    }
    .cursor svg { position: absolute; left: -2px; top: -2px; filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)); }
    .cursor.doze { opacity: .45; }
    .cursor.doze .glow { animation: none; opacity: .15; transform: scale(.55); }
    .cursor.doze svg { opacity: .6; }
    .cursor .ring {
      position: absolute; left: -18px; top: -18px; width: 36px; height: 36px;
      border: 2.5px solid var(--c); border-radius: 50%;
      animation: hcRing .55s ease-out forwards;
    }
    @keyframes hcRing {
      from { transform: scale(.35); opacity: .95; }
      to   { transform: scale(1.9); opacity: 0; }
    }
    .cursor.typing .glow { animation: hcType .5s ease-in-out infinite; }
    @keyframes hcType {
      0%, 100% { transform: scale(.9); opacity: .5; }
      50%      { transform: scale(1.1); opacity: .8; }
    }
    .cursor.pressed svg { transform: scale(.85); transition: transform .12s; }
    .cursor.bob svg { animation: hcBob .5s ease-in-out; }
    @keyframes hcBob {
      0%, 100% { transform: none; }
      50%      { transform: translateY(26px); }
    }
    .dock {
      position: fixed; right: 16px; bottom: 16px; z-index: 2147483646;
      display: flex; flex-direction: column; align-items: flex-end; gap: 8px;
      transition: opacity .25s ease;
    }
    .dock.dodge { pointer-events: none; opacity: .12; }
    .chip {
      display: flex; align-items: center; gap: 6px;
      padding: 5px 11px 5px 9px; border-radius: 999px;
      background: rgba(244,245,252,.97); color: var(--beat-ink); border:1px solid var(--beat-line); cursor: pointer;
      -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
      font-size: 11px; letter-spacing: .1px; white-space: nowrap;
      max-width: 46vw; overflow: hidden;
      box-shadow: 0 3px 12px rgba(26,26,28,.10);
      opacity: .78; transition: opacity .18s ease, transform .18s ease;
      animation: hcIn .24s cubic-bezier(.2,.8,.3,1);
    }
    .chip:hover { opacity: 1; }
    .chip.act { opacity: 1; transform: scale(1.03); }
    @keyframes hcIn { from { opacity: 0; transform: translateY(8px); } }
    .dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
    .ava { border-radius: 50%; border: 1.5px solid transparent; flex: none; background: #fff; }
    .who { font-weight: 600; }
    .sep { opacity: .4; }
    .what { opacity: .78; font-variant-numeric: tabular-nums; }
    .card {
      width: 300px; max-width: calc(100vw - 40px);
      border-radius: 14px; overflow: hidden;
      background: #fff; color: var(--beat-ink); border:1px solid var(--beat-line);
      -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
      box-shadow: 0 12px 40px rgba(26,26,28,.12), 0 2px 8px rgba(26,26,28,.04);
      animation: hcIn .22s cubic-bezier(.2,.8,.3,1);
    }
    .card .head {
      display: flex; align-items: center; gap: 7px;
      padding: 10px 12px; border-bottom: 1px solid var(--beat-line); background:var(--beat-bg);
    }
    .card .head .code { opacity: .45; font-size: 11px; font-variant-numeric: tabular-nums; }
    .card .head .fold {
      margin-left: auto; cursor: pointer; opacity: .5; padding: 0 2px;
      background: none; border: none; color: inherit; font: inherit; font-size: 13px; line-height: 1;
    }
    .card .head .fold:hover { opacity: 1; }
    .card .sec { padding: 8px 12px; border-bottom: 1px solid var(--beat-line); }
    .card .sec:last-child { border-bottom: none; }
    .card .lab { font-size: 10px; letter-spacing: .8px; opacity: .45; margin-bottom: 3px; }
    .card .intent { border-left: 2px solid var(--c, #888); padding-left: 8px; opacity: .92; }
    .card .intent .ago { opacity: .45; font-size: 10px; margin-left: 6px; }
    .card .now { display: flex; align-items: center; gap: 6px; }
    .card .now .pulse { width: 6px; height: 6px; border-radius: 50%; flex: none; animation: hcPulse 1.6s ease-in-out infinite; }
    @keyframes hcPulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
    .card .plan { opacity: .75; }
    .card .tl { max-height: 132px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
    .card .tl .row { display: flex; gap: 8px; font-size: 11px; opacity: .62; }
    .card .tl .row:first-child { opacity: .95; }
    .card .tl .ago { flex: none; width: 44px; text-align: right; font-variant-numeric: tabular-nums; opacity: .7; }
    .ask {
      width: 340px; max-width: calc(100vw - 40px);
      background: #fff; color: #1a1a1a; border-radius: 14px;
      box-shadow: 0 12px 40px rgba(0,0,0,.18), 0 2px 8px rgba(0,0,0,.08);
      border: 1px solid rgba(0,0,0,.08); font-size: 14px;
      overflow: hidden; animation: hcIn .22s cubic-bezier(.2,.8,.3,1);
      pointer-events: auto;
    }
    .ask .head {
      display: flex; align-items: center; gap: 8px;
      padding: 13px 16px; background: var(--beat-bg);
      border-bottom: 1px solid rgba(0,0,0,.06); font-weight: 600; font-size: 14px;
    }
    .ask .head .dot { width: 8px; height: 8px; background: var(--beat-accent); animation: hcPulse 1.6s ease-in-out infinite; }
    .ask .body { padding: 14px 16px 4px; white-space: pre-wrap; word-break: break-word; }
    .ask .note { width: 100%; box-sizing: border-box; margin: 10px 0 2px; padding: 8px 10px;
                 border: 1px solid #e2e2e2; border-radius: 8px; font: inherit; font-size: 13px;
                 resize: vertical; min-height: 34px; }
    .ask .note:focus { outline: 2px solid var(--beat-accent); outline-offset: -1px; border-color: transparent; }
    .ask .foot { display: flex; gap: 8px; padding: 10px 16px 14px; align-items: center; }
    .ask .clock { font-size: 12px; color: #9a9a9a; margin-right: auto; font-variant-numeric: tabular-nums; }
    .ask button { font: inherit; font-size: 13px; border-radius: 8px; padding: 7px 14px;
                  border: 1px solid transparent; cursor: pointer; transition: .15s; }
    .ask .ok { background: var(--beat-ink); color: #fff; font-weight: 600; }
    .ask .ok:hover { background: #303034; }
    .ask .no { background: #fff; color: #666; border-color: #e2e2e2; }
    .ask .no:hover { background: #f6f6f6; }
    .ask.danger .head { background: linear-gradient(135deg,#fef2f2,#fee2e2); }
    .ask.danger .head .dot { background: #dc2626; }
    .ask.danger .ok { background: #dc2626; }
    .ask.danger .ok:hover { background: #b91c1c; }
    .ask .what { margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: #f8f8f8;
                 font-size: 13px; word-break: break-all; }
    .ask .amount { font-weight: 700; font-size: 16px; color: #dc2626; }
    .card .head::before { content: "//"; font-family:monospace; color:var(--beat-accent); }
    .ask button:focus-visible,.chip:focus-visible,.card button:focus-visible { outline:2px solid var(--beat-accent); outline-offset:3px; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation:none!important; transition:none!important; } }

  `;

  // ---------- host ----------

  function ensureHost() {
    if (host) return;
    
    
    
    host = document.createElement('div');
    host.style.cssText = 'all:initial;position:fixed;z-index:2147483647';
    const root = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = CSS;
    wrap = document.createElement('div');
    wrap.className = 'wrap';
    
    wrap.innerHTML = '<div class="edge t"></div><div class="edge b"></div>'
      + '<div class="edge l"></div><div class="edge r"></div>'
      + '<div class="cursor"><div class="glow"></div>'
      + '<svg width="26" height="26" viewBox="0 0 26 26">'
      + '<path d="M4 2 L4 21 L9 16.5 L12.5 24 L16 22.3 L12.5 15 L19 15 Z" fill="#fff" stroke="var(--c)" stroke-width="1.6" stroke-linejoin="round"/>'
      + '</svg></div>'
      
      
      + '<div class="dock"><div class="own"></div></div>';
    root.append(style, wrap);
    document.documentElement.appendChild(host);
    if (stealthed) host.style.visibility = 'hidden';
    watchContext();
  }

  
  
  function maybeTeardown() {
    if (owners.length || askSettle) return;
    if (host) { host.remove(); host = null; wrap = null; }
    for (const s of actState.values()) clearTimeout(s.timer);
    actState.clear();
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (dozeTimer) { clearTimeout(dozeTimer); dozeTimer = null; }
    cursorShown = false;
    if (watchdog) { clearInterval(watchdog); watchdog = null; }
  }

  
  
  
  
  
  function watchContext() {
    if (watchdog) return;
    watchdog = setInterval(() => {
      if (chrome.runtime?.id) return;
      owners = [];
      if (askSettle) closeAsk('cancelled', 'extension reloaded');
      askSettle = null;
      maybeTeardown();
    }, 5000);
  }

  

  
  
  function edgePaint() {
    if (owners.length === 1) return owners[0].color;
    const stops = [];
    const w = 9;
    owners.forEach((o, i) => stops.push(`${o.color} ${i * w}px ${(i + 1) * w}px`));
    return `repeating-linear-gradient(45deg, ${stops.join(', ')})`;
  }

  

  const relTime = (timestamp) => {
    const s = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (s < 5) return t('Just now');
    if (s < 60) return t('{n}s ago',{n:s});
    if (s < 3600) return t('{n}m ago',{n:Math.floor(s/60)});
    return t('{n}h ago',{n:Math.floor(s/3600)});
  };

  function render() {
    if (!TOP) return;
    if (!owners.length && !askSettle) return maybeTeardown();
    ensureHost();

    const paint = owners.length ? edgePaint() : '';
    wrap.querySelectorAll('.edge').forEach((e) => {
      e.style.background = paint;
      e.style.display = owners.length ? '' : 'none';
    });

    
    
    
    const own = wrap.querySelector('.own');
    own.textContent = '';
    for (const o of owners) {
      own.appendChild(expanded ? buildCard(o) : buildChip(o));
    }

    
    if (expanded && owners.length && !tickTimer) tickTimer = setInterval(render, 20000);
    if ((!expanded || !owners.length) && tickTimer) { clearInterval(tickTimer); tickTimer = null; }

    syncCursorIdle();
  }

  function buildChip(o) {
    const chip = document.createElement('div');
    chip.className = 'chip';
    const act = actState.get(o.sid);
    if (act) chip.classList.add('act');
    const av = avatarCanvas(18); av.style.borderColor = o.color;
    const who = document.createElement('span'); who.className = 'who'; who.textContent = o.label;
    const sep = document.createElement('span'); sep.className = 'sep'; sep.textContent = '·';
    const what = document.createElement('span'); what.className = 'what';
    
    what.textContent = act ? act.text : (tabLabel || o.code);
    chip.append(av, who, sep, what);
    chip.addEventListener('click', () => setExpanded(true));
    return chip;
  }

  function buildCard(o) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.setProperty('--c', o.color);

    const head = document.createElement('div');
    head.className = 'head';
    const av = avatarCanvas(20); av.style.borderColor = o.color;
    const who = document.createElement('span'); who.className = 'who'; who.textContent = o.label;
    const code = document.createElement('span'); code.className = 'code'; code.textContent = o.code;
    const fold = document.createElement('button'); fold.className = 'fold'; fold.textContent = '⌄';
    fold.title = t('Collapse');
    fold.addEventListener('click', () => setExpanded(false));
    head.append(av, who, code, fold);
    card.appendChild(head);

    const sec = (label) => {
      const s = document.createElement('div');
      s.className = 'sec';
      if (label) {
        const l = document.createElement('div'); l.className = 'lab'; l.textContent = label;
        s.appendChild(l);
      }
      card.appendChild(s);
      return s;
    };

    
    if (tabLabel) {
      const s = sec(t('Page'));
      const p2 = document.createElement('div'); p2.className = 'plan';
      p2.textContent = tabLabel;
      s.appendChild(p2);
    }

    
    
    const intent = intents[o.sid];
    if (intent?.text) {
      const s = sec(t('Next'));
      const q = document.createElement('div'); q.className = 'intent';
      q.textContent = intent.text;
      const ago = document.createElement('span'); ago.className = 'ago'; ago.textContent = relTime(intent.t);
      q.appendChild(ago);
      s.appendChild(q);
    }

    
    
    if (plan.length) {
      const s = sec(t('Plan'));
      const p = document.createElement('div'); p.className = 'plan';
      p.textContent = plan.slice(0, 3).join(' → ') + (plan.length > 3 ? ' → '+t('{n} more',{n:plan.length-3}) : '');
      s.appendChild(p);
    }

    const act = actState.get(o.sid);
    if (act) {
      const s = sec(t('Now'));
      const n = document.createElement('div'); n.className = 'now';
      const pulse = document.createElement('span'); pulse.className = 'pulse'; pulse.style.background = o.color;
      const actionText = document.createElement('span'); actionText.textContent = act.text;
      n.append(pulse, actionText);
      s.appendChild(n);
    }

    const rows = logs[o.sid] || [];
    if (rows.length) {
      const s = sec(t('Activity'));
      const tl = document.createElement('div'); tl.className = 'tl';
      for (const r of rows.slice(0, 12)) {
        const row = document.createElement('div'); row.className = 'row';
        const ago = document.createElement('span'); ago.className = 'ago'; ago.textContent = relTime(r.t);
        const txt = document.createElement('span'); txt.textContent = r.text;
        row.append(ago, txt);
        tl.appendChild(row);
      }
      s.appendChild(tl);
    }
    return card;
  }

  function setExpanded(on) {
    expanded = !!on;
    try { chrome.storage.local.set({ dockOpen: expanded }); } catch {  }
    render();
  }

  
  //
  
  
  
  //
  
  
  

  let cursorShown = false, dozeTimer = null, dodgeTimer = null;
  let curX = 0, curY = 0;

  const dozeSpot = () => ({ x: innerWidth - 30, y: innerHeight - 150 });

  function moveCursor(x, y) {
    const c = wrap.querySelector('.cursor');
    curX = x; curY = y;
    c.style.transform = `translate(${x}px, ${y}px)`;
    return c;
  }

  function syncCursorIdle() {
    if (!wrap) return;
    const c = wrap.querySelector('.cursor');
    c.style.setProperty('--c', owners[0]?.color || '#a855f7');
    if (!owners.length) { c.classList.remove('on'); cursorShown = false; return; }
    
    
    if (!cursorShown) {
      const p = dozeSpot();
      c.classList.add('on', 'doze');
      moveCursor(p.x, p.y);
      cursorShown = true;
    }
  }

  function dodgeIfOver(x, y) {
    const dock = wrap.querySelector('.dock');
    const r = dock.getBoundingClientRect();
    if (!r.width || x < r.left - 8 || x > r.right + 8 || y < r.top - 8 || y > r.bottom + 8) return;
    dock.classList.add('dodge');
    clearTimeout(dodgeTimer);
    dodgeTimer = setTimeout(() => wrap && dock.classList.remove('dodge'), 1600);
  }

  window.__hcCursor = (x, y, kind) => {
    if (!TOP || !wrap || !owners.length) return;
    const c = wrap.querySelector('.cursor');
    c.classList.add('on');
    c.classList.remove('doze');

    if (x != null && y != null) {
      dodgeIfOver(x, y);
      moveCursor(x, y);
    }
    if (kind === 'click') {
      
      setTimeout(() => {
        if (!wrap) return;
        const ring = document.createElement('span');
        ring.className = 'ring';
        ring.addEventListener('animationend', () => ring.remove());
        c.appendChild(ring);
      }, 240);
    } else if (kind === 'type') {
      c.classList.add('typing');
      setTimeout(() => wrap && c.classList.remove('typing'), 900);
    } else if (kind === 'key') {
      c.classList.add('pressed');
      setTimeout(() => wrap && c.classList.remove('pressed'), 200);
    } else if (kind === 'scroll') {
      c.classList.remove('bob');
      void c.offsetWidth;   
      c.classList.add('bob');
    }

    
    clearTimeout(dozeTimer);
    dozeTimer = setTimeout(() => {
      if (!wrap) return;
      const p = dozeSpot();
      c.classList.add('doze');
      moveCursor(p.x, p.y);
    }, 30000);
  };

  
  //
  
  
  

  let askEl = null;
  let askMessage = null;
  let askSettle = null;   
  let askOutcome = null;  
  let askTimer = null;

  function closeAsk(result, note) {
    if (askEl) { askEl.remove(); askEl = null; }
    if (askTimer) { clearInterval(askTimer); askTimer = null; }
    askSettle = null;
    askOutcome = { outcome: result, note: note || '' };
    maybeTeardown();
  }

  function updateAskLanguage() {
    if (!askEl || !askMessage) return;
    askEl.lang=language === 'zh' ? 'zh-CN' : 'en';
    askEl.querySelector('.t').textContent=t(askMessage.title || 'Your turn');
    askEl.querySelector('.p').textContent=t(askMessage.prompt || '');
    askEl.querySelector('.ok').textContent=t(askMessage.okText || 'Done');
    askEl.querySelector('.no').textContent=t(askMessage.noText || 'Cancel');
    askEl.querySelectorAll('[data-fact-label]').forEach(el => { el.textContent=t(el.dataset.factLabel)+': '; });
    const note=askEl.querySelector('.note');
    if (note) note.placeholder=t('Note (optional)');
  }

  function showAsk(msg) {
    ensureHost();
    
    if (askSettle) closeAsk('cancelled', 'superseded by a new request');
    askOutcome = null;
    askSettle = true;

    askMessage=msg;
    askEl = document.createElement('div');
    askEl.className = 'ask';
    askEl.innerHTML = `
      <div class="head"><span class="dot"></span><span class="t"></span></div>
      <div class="body"><span class="p"></span></div>
      <div class="foot">
        <span class="clock"></span>
        <button class="no"></button>
        <button class="ok"></button>
      </div>`;
    
    
    
    askEl.querySelector('.head').prepend(avatarCanvas(20));   

    if (msg.danger) askEl.classList.add('danger');

    
    
    if (msg.facts) {
      const box = document.createElement('div');
      box.className = 'what';
      for (const [k, v] of msg.facts) {
        if (!v) continue;
        const line = document.createElement('div');
        const key = document.createElement('span');
        key.dataset.factLabel=k;
        key.textContent=t(k)+': ';
        const val = document.createElement('span');
        val.textContent = v;
        if (k === 'Amount') val.className = 'amount';
        line.append(key, val);
        box.appendChild(line);
      }
      askEl.querySelector('.body').appendChild(box);
    }

    let noteEl = null;
    if (msg.wantNote) {
      noteEl = document.createElement('textarea');
      noteEl.className = 'note';
      noteEl.placeholder = t('Note (optional)');
      askEl.querySelector('.body').appendChild(noteEl);
    }

    updateAskLanguage();
    askEl.querySelector('.ok').addEventListener('click', () => closeAsk('continued', noteEl?.value));
    askEl.querySelector('.no').addEventListener('click', () => closeAsk('cancelled', noteEl?.value));

    
    wrap.querySelector('.dock').appendChild(askEl);

    
    
    const deadline = Date.now() + (msg.timeout || 300000);
    const clock = askEl.querySelector('.clock');
    askTimer = setInterval(() => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      clock.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
      if (left <= 0) closeAsk('timed_out', noteEl?.value);
    }, 500);
  }

  
  
  
  function flashTargets(els) {
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      const ring = document.createElement('div');
      ring.style.cssText = `position:fixed;left:${r.left - 4}px;top:${r.top - 4}px;`
        + `width:${r.width + 8}px;height:${r.height + 8}px;border:2px solid #3a5bc7;`
        + `border-radius:8px;pointer-events:none;z-index:2147483646;`
        + `box-shadow:0 0 0 9999px rgba(0,0,0,.04);transition:opacity .3s`;
      document.documentElement.appendChild(ring);
      let n = 0;
      const blink = setInterval(() => {
        ring.style.opacity = (++n % 2) ? '0.25' : '1';
        if (n > 7) { clearInterval(blink); ring.remove(); }
      }, 300);
    }
  }

  
  //
  
  
  
  

  let stealthed = false;
  function setStealth(on) {
    stealthed = !!on;
    if (host) host.style.visibility = stealthed ? 'hidden' : '';
  }

  

  
  
  function recordAct(sid, text) {
    const prev = actState.get(sid);
    if (prev) clearTimeout(prev.timer);
    actState.set(sid, {
      text: String(text).slice(0, 40),
      timer: setTimeout(() => { actState.delete(sid); if (owners.length) render(); }, 5000),
    });
  }

  
  
  function flashEdges() {
    if (!wrap) return;
    wrap.classList.add('lit');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => wrap?.classList.remove('lit'), 420);
  }

  chrome.runtime.onMessage.addListener((msg, _s, sendResponse) => {
    if (msg && msg.__hcMark !== undefined) {
      
      
      if (msg.__hcMark === 'ping') { sendResponse({ pong: true, top: TOP }); return true; }
      if (msg.__hcMark === 'set') {
        logs = msg.logs || {};
        intents = msg.intents || {};
        plan = Array.isArray(msg.plan) ? msg.plan : [];
        tabLabel = typeof msg.tabLabel === 'string' ? msg.tabLabel : '';
        owners = Array.isArray(msg.owners) ? msg.owners.filter((o) => o && o.sid) : [];
        
        if (msg.act && msg.sid) recordAct(msg.sid, msg.act);
        if (TOP) { render(); if (msg.act) flashEdges(); }
        sendResponse({ ok: true });
        return true;
      }
      
      
      
      if (msg.__hcMark === 'clear') { owners = []; plan = []; render(); sendResponse({ ok: true }); return true; }
      if (msg.__hcMark === 'stealth') { setStealth(msg.on); sendResponse({ ok: true }); return true; }
      return;
    }
    if (msg && msg.__hcAsk !== undefined) {
      
      if (msg.__hcAsk === 'show') { showAsk(msg); sendResponse({ shown: true }); return true; }
      if (msg.__hcAsk === 'poll') { sendResponse(askOutcome || { pending: true }); return true; }
      if (msg.__hcAsk === 'flash') {
        const els = (msg.selectors || []).map((s) => {
          try { return document.querySelector(s); } catch { return null; }
        }).filter(Boolean);
        if (els[0]) els[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        flashTargets(els);
        sendResponse({ matched: els.length });
        return true;
      }
      if (msg.__hcAsk === 'abort') { closeAsk('cancelled', 'cancelled by the agent'); sendResponse({ ok: true }); return true; }
    }
  });

  
  
  try {
    chrome.storage.local.get('dockOpen').then((v) => {
      if (v?.dockOpen && !expanded) { expanded = true; if (owners.length) render(); }
    }).catch(() => {});
  } catch {  }
})();
