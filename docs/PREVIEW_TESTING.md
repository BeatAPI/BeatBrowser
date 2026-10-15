# BeatBrowser 1.3.1 local preview

Unpublished preview. Both package and extension use 1.3.1; the extension is labelled `1.3.1 local preview`. This is not an npm release. AEO work remains separate.

## Install the matching pair

Finish active browser tasks and restart Agent clients during the update: old in-memory MCP processes can otherwise reconnect with their previous bridge version. Keep the existing extension and CLI until ready to test.

1. Install the supplied local CLI tarball with `npm install -g /absolute/path/to/beatapi-beat-browser-1.3.1.tgz`.
2. Run `beat-browser install` to point compatible Agent clients at the stable installation. This updates their local MCP configuration.
3. Run `beat-browser extension` to get the installed extension path. In the intended Chrome profile, reload/update the existing unpacked extension to that path. Avoid two enabled BeatBrowser extensions competing for one bridge.
4. Restart the Agent client and run `beat-browser doctor`. Check matching 1.3.1 versions and the intended connected profile. No Chrome profile or cookies need importing.
5. Click BeatBrowser's toolbar icon, then **Workspace**. The sidebar does not open automatically during task execution.

Do not install only the extension ZIP while leaving an old CLI/bridge running.

## Language and compact UI

The inline language switch offers Chinese and English without a native dropdown. On first use it follows Chrome's UI language (Chinese locales use Simplified Chinese; others use English). An explicit choice is saved in local extension storage and updates the popup, sidebar, injected controls and future notification titles. Task labels, agent progress and website text retain their original content. No model call or translation service is involved.

The workspace removes the large slogan, duplicate introduction and routine connection metadata. It keeps tasks, status, actions and pause reasons; connection help lives under Settings. Payment confirmations retain the amount, destination and explicit confirmation.

## Task cleanup follow-up

For an existing matching 1.3.1 installation, this extension-only change needs an extension reload after active tasks finish. It does not require an MCP reinstall. Open the popup/sidebar and try **Clear** on an ended task, **Clear ended** for a batch, or **Clear all** with confirmation to stop and clear every task. Explicitly handed-over, adopted and moved pages remain open. Reloading the extension loses session task records, so finish existing tasks and keep track of retained pages before reloading.

## What changed in this preview

The popup, workspace sidebar and in-page control/confirmation surfaces use BeatAPI's light blue-gray palette, local DM Sans/DM Mono fonts, white cards and black primary buttons. Font licenses are included. No remote font request is made.

Focus pauses and agent review requests have separate explanations. A queued focus event is checked against the current window before pausing; a currently focused window still pauses, and an unavailable focus reading pauses conservatively. Window creation/minimization no longer sends `focused:false`, which can change native window stacking.

The previous 1.3.0 live run opened the native sidebar and completed a two-page task after explicit resumes, but the task window appeared without a user click. A headed 1.3.1 diagnostic also observed a focus event after minimized creation. These observations are failures of the no-interruption expectation. The revised current-state check has unit coverage, but the final revision has not passed headed macOS acceptance. Do not promise invisible execution on that basis.

## First acceptance task

Use this request in your Agent:

> Use BeatBrowser's spaces tool. List connected profiles and use the profile I choose. Open a background task on https://example.com and add a named reference page at https://example.org. Read each page title. Report the two titles with needsConfirmation:true. Wait for me to inspect and confirm in the BeatBrowser sidebar; do not resume automatically. After I return control, finish with keep:all and show the receipt.

While the Agent runs, continue typing in your own tab. In the sidebar verify:

- The task and both page labels appear; progress and activity update.
- The human tab remains selected. Background execution does not activate task pages.
- **View** hands a selected task page to you and pauses further execution.
- **Continue** returns control and minimizes the task window.
- **Stop** prevents subsequent input. Finished/stopped tasks cannot silently restart.
- Notifications are opt-in and quiet when no progress changes.

Then try an explicitly authorized file upload on a test page and a binary fetch/save. Native Chrome downloads may show save UI; use fetch/save when possible. Website-generated popups can still interact with Chrome behavior.

## Known acceptance boundaries

The isolated headless fixture validates the panel document, real extension messaging, controls, upload, binary fetch/save and request evidence. It does not certify the native side-panel container on every Chrome version, macOS focus/minimization, all login sites or every Agent client. Minimized headed screenshot capture is still a known gap; it fails explicitly instead of foregrounding the page.

## Developer checks

`npm test`, `npm run check:syntax`, `npm run check:security`, `npm run check:package`, and `BEAT_TEST_CHROME=/path/to/chrome node scripts/check-spaces-browser.mjs`.

The automated fixture runs headless by default. Do not launch a visible test browser during ordinary product use: the temporary fixture has no personal logins and is not the BeatBrowser interface. Native focus acceptance should be a separately arranged test.

Tests use a disposable profile and private bridge, with a mock keychain on macOS. Do not replace these with the user's everyday Chrome profile.
