# huashu-chrome upstream review — 2026-10-14

Checked live GitHub and fetched upstream `master` at `84d5ee40532ca586650d3d5f78f3952d3061cd06` (1.3.0, 2026-10-13). Compared with BeatBrowser before TaskSpaces (`742b2d0`) and the TaskSpace development commit (`7e0fc81`). This is a source review plus the specific local tests listed below, not acceptance of every upstream feature.

## What changed upstream

[1.3 feature commit](https://github.com/alchaincyf/huashu-chrome/commit/bda9a1a50c) adds a side-panel cockpit, welcome page, version compatibility handling, write-request evidence, playbook drafts, background readiness timing, screenshot-driven frame forcing and stalled-page diagnostics. Its reported upstream test counts are maintainer claims, not tests rerun here.

The new `forceFrame` calls screenshot; screenshot pins viewport dimensions to reduce debugger-banner geometry changes. Neither code path establishes reliable minimized macOS window capture. The diagnostics distinguish discarded tabs, confirmed dialogs and busy pages, and can unfreeze a tab. Upstream retries the original message after unfreezing; importing that behavior needs care because an earlier timed-out write could execute later. BeatBrowser must preserve its no-replay rule for uncertain writes and TaskSpace control gates.

The September [tab-close fix](https://github.com/alchaincyf/huashu-chrome/commit/6cd7363539) removes an undefined `childKey` call. BeatBrowser still had this bug: unrelated session keys could throw before cleanup and `tab_closed`. This review ports the fix with a behavioral test executing the actual registered listener.

The September [download documentation correction](https://github.com/alchaincyf/huashu-chrome/commit/9999702303) withdraws the unconditional no-save-dialog promise. BeatBrowser still had that wording. The tool description now prefers binary fetch to disk, describes Chrome download as a fallback and discloses possible save dialogs.

## Existing capability versus exact Ego API parity

| Capability | Before TaskSpaces | Development TaskSpaces | Remaining distinction |
|---|---|---|---|
| Background trusted input | CDP focus emulation already in `ensureAttached` | Retains debugging while task runs; pauses on human takeover | Page focus emulation is not control over all OS/browser focus behavior |
| Screenshots | CDP background-tab capture already present | Bounded failure without foreground fallback | A background tab in a rendered window differs from a minimized headed window |
| File input upload | `DOM.setFileInputFiles` reads local path | Same handler with space/page routing | No generic FileChooser event object; existing uploads do not require it |
| Drag/drop upload | Existing content path, 48 MiB transfer cap | Same handler | Not every custom uploader is supported |
| Binary fetch/save | Extension/page fetch and local MCP save, 12 MiB channel cap | Existing path works inside task | Not a browser-wide download event tracker |
| Native Chrome download | `chrome.downloads.download` and completion/interruption listener | Same handler, explicitly scoped when used in a task | Chrome may show save UI; no full Download handle for all website-triggered downloads |
| Dialogs | Internal CDP dialog tracking/handling exists | Existing functionality plus task handoff constraints | No uniform public Ego-style Page dialog contract |

The isolated Chrome 153 headless fixture now verifies file-input upload by inspecting `input.files[0].name`, and binary fetch/save by exact byte comparison. It also retains the previous multi-page, pause/resume and stop checks. No native OS file chooser or Chrome save dialog was opened. This does not certify every site or headed/minimized behavior.

## Browser and UI ownership

BeatBrowser currently runs on the existing Chrome extension and bridge. `spaces open` uses `chrome.windows.create`; no Ego executable, `globalThis.ego`, Ego panel or Ego account system is required. The installed Ego application from earlier exploration is separate and is not this execution backend.

Ego's reviewed SDK at `dca7003349c5f7132189ba00547cbbd7ff8e597e` expects a native `globalThis.ego` host. Its public helper code alone is not an entire rebrandable browser implementation. See [its SDK architecture](https://github.com/citrolabs/ego-lite/tree/dca7003349c5f7132189ba00547cbbd7ff8e597e/package/ego-browser).

Our task window contains ordinary website pages and Chrome's toolbar. BeatBrowser owns the extension icon/popup, page control marks and task controls. There is no Ego product UI to strip out. Chrome's address/tab bars cannot become BeatBrowser chrome through CSS in an extension; replacing those requires a separate browser product, which is not the current architecture.

Recommended next UI consolidation: a BeatBrowser-branded side panel reusing the existing TaskSpace state and controls. It should show tasks/pages, recent progress, review requests and View/Resume/Stop without automatically opening or focusing. The upstream panel is a useful interaction reference; its Chinese branding, connection IDs and task model should not be copied wholesale. This review did not migrate the popup to a side panel.

## Porting decisions

- Applied: tab-close cleanup fix and corrected native-download guidance.
- Verified existing functionality: focus emulation is already present; background TaskSpace file-input upload and binary fetch/save work in the isolated headless fixture.
- Next candidates: own side panel, readiness timing, bounded stall diagnostics, write-request evidence. Integrate separately with TaskSpace ownership and uncertain-write tests.
- Not established as solved upstream: minimized headed screenshot rendering, browser-native ownership/focus interception, complete Download/FileChooser event APIs.
- No upstream whole-tree merge, browser restart, extension reload, npm publication or daily-profile changes were performed.

Upstream MIT attribution remains in LICENSE; its repository and commits above identify provenance for the small fix and documentation correction.
