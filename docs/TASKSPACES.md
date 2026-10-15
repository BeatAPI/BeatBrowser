# Background TaskSpaces — development status

Unreleased 1.3.1 source preview, reviewed 2026-10-14. The installed 1.2.2 extension does not acquire it merely because local source changed. No Ego installation or native browser engine is required.

## Execution model

`spaces open` creates a minimized Chrome window in an explicitly selected connected profile. It reuses that profile's website sessions without copying cookies, passwords or profile files. A task window is not cookie isolation: tasks in the same profile share website login state and storage. The human continues in their ordinary window. Window creation or website-created popups can still interact with OS/browser behavior; this is not a guarantee of complete invisibility.

The bridge pins each space to its original extension connection and owner session. Disconnection, extension replacement, a moved page or loss of background debugging fails closed instead of selecting another browser. Multiple connected profiles require `profileId` for `open` and `list`. `profiles` lists connected extensions only, not every profile on disk. Ordinary unscoped legacy commands still use the selected primary extension.

## Lifecycle and pages

- `open`, `list`, `status`, `pages`: inspect owned tasks and their named pages.
- `new-page`: create a background page within the task window. Labels are stable task-local identifiers; DOM element refs still need fresh snapshots after page changes.
- `adopt`: explicitly adopt an authorized existing tab already in the task window. It never moves a human tab into the task window.
- `release-page`, `close-page`: return control or close a managed page. Closing user-origin pages needs explicit authorization; moved pages are protected.
- `report`: save a caller-supplied progress note. `needsConfirmation:true` pauses further actions.
- `handoff`, `resume`, `stop`: let the human inspect, explicitly return control, or terminate execution. Stopped or finished tasks cannot resume.
- `finish`: release debugging, optionally close only agent-created pages omitted from `keep`, and return retained/closed labels as a receipt. Default retains all pages; user-origin and moved pages remain protected.
- `events`: read a bounded lifecycle log including popup origin. This is not a full CDP or download-event stream. Popups are observed, not silently adopted; a popup outside the task window pauses execution.
- `notifications`: opt in to local system progress/review/completion notifications. Changed progress reports are delivered on a configurable interval (default five minutes, minimum one); unchanged progress stays quiet. OS notification settings still apply.

The extension popup and persistent BeatBrowser workspace sidebar share the same task state. The sidebar adds named pages, per-page View and activity history. Open it explicitly from the toolbar popup; background work never opens it automatically. Both surfaces expose View / take over, Confirm / resume and Stop. Focusing a running task window pauses subsequent automation. This does not undo in-flight input. Returning control is not blanket approval for future consequential actions.

### Cleanup in the popup and sidebar

Ended tasks offer **Clear**. **Clear ended** removes all finished/stopped task cards; **Clear all** asks for confirmation, stops active tasks and cleans all cards. Cleanup closes only agent-created pages still in their task window. Adopted, moved and explicitly handed-over pages remain open. It never closes a whole window with unrelated tabs. Failed page closures remain retryable. These controls belong to the human UI, not the agent command API.

Agent session titles are labelled **Linked page**: they identify that session's associated tab, not necessarily the active tab or an ongoing action. Ended tasks do not display stale pause instructions.

The default lease is 15 minutes; requested leases range from 30 seconds to one hour. Explicit resume renews for 15 minutes. There are at most four nonterminal tasks per owner, 16 pages per task and 80 retained lifecycle events per task. Session state uses existing `chrome.storage.session`; it is not a durable job queue. An extension/browser restart loses task state, and bridge reconnection does not automatically recover ownership. Finish or stop when done.

## Agent access

Use the existing MCP or CLI `spaces` command with explicit `spaceId` and `tabId`. Node agents can use [the JavaScript SDK](JAVASCRIPT.md), including named pages and waits for human control, URLs and popups. Existing page tools are reused. Ordinary input with no visible effect is not automatically repeated through another input layer. Write-request receipts include method/status only and do not prove business success. Frozen tabs can be thawed before dispatch; timed-out writes are never resent. Discarded, busy and confirmed-dialog states are distinguished. The optional Fast JEV loop has not been validated with TaskSpaces. Grok Bot and Muse have not individually undergone client acceptance in this change.

Open Profound will own schedules and product run records. BeatBrowser executes assigned work and returns evidence. BeatAPI remains an optional capability layer for analysis, research and generation, not a prerequisite to ordinary local browser control.

## Verification and remaining gaps

Unit/transport tests cover ownership, multi-profile selection, page membership, moved/user-page protection, leases, progress, popup attribution and explicit human resume. An isolated real Chrome 153 headless fixture exercised two named pages, input, rendering beyond five seconds, confirmation pause, the actual extension popup's resume button, stop and screenshots. Headless tests do not establish foreground focus or macOS minimization behavior.

An earlier headed fixture observed unchanged human-window focus and selected tab, a minimized task window, background input and rendering. Its minimized screenshot failed. That gap remains: `BACKGROUND_CAPTURE_UNAVAILABLE` is returned after a bounded wait; the code does not restore/focus the window to obtain a screenshot. The headed test was not repeated after the keychain-prompt report.

The synthetic launcher defaults to headless, enforces a disposable OS-temp profile and uses `--use-mock-keychain` on macOS. Those settings never apply to everyday Chrome. No real keychain permission was granted and no user password/cookie extraction was added. Headless success does not prove a headed permission dialog has disappeared.

Existing upload and binary fetch/save paths were also exercised successfully inside the headless task fixture. Missing full Download/FileChooser contracts do not mean ordinary uploads/downloads are missing; native Chrome downloads can still show save UI depending on settings. See [upstream review](HUASHU_UPSTREAM_REVIEW.md).

Remaining work: reliable minimized headed screenshot rendering; native-level focus/ownership interception; durable element references; uniform cross-origin-frame event handling; complete Download/FileChooser/dialog contracts; action-bound approval evidence; real signed-in model-site acceptance. Progress notes are not verified outcomes. A finish receipt reports page disposition, not proof a business action succeeded.

```sh
npm test
npm run check:syntax
npm run check:security
npm run check:package
BEAT_TEST_CHROME='/absolute/path/to/Chrome for Testing' node scripts/check-spaces-browser.mjs
```

The browser check uses a private bridge and synthetic pages; it never imports personal login data. Set `BEAT_TEST_HEADED=1` only for an intentional foreground-behavior experiment.
