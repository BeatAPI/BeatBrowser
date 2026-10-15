# BeatBrowser 1.3.1 local preview

Unpublished preview. Both package and extension use 1.3.1; the extension is labelled `1.3.1 local preview`. This is not an npm release. AEO work remains separate.

## Install the current GitHub source

For BeatGEO users, use [BeatGEO's setup](https://github.com/BeatAPI/BeatGEO#quick-start): it installs a pinned BeatBrowser and prepares the extension. Do not clone a second repository or install a global CLI for that route.

To try BeatBrowser independently, use the current source (Node.js 20+ and Git):

```sh
git clone --branch main https://github.com/BeatAPI/BeatBrowser.git
cd BeatBrowser
npm ci
node src/cli.js install --dry-run
node src/cli.js install
node src/cli.js extension
```

Keep this checkout in a permanent folder. In the intended Chrome profile, open `chrome://extensions`, enable Developer mode and load the extension folder printed above. Restart your Agent client, then run `node src/cli.js doctor --json`. No Chrome profile or cookies need importing. Click BeatBrowser's toolbar icon, then **Workspace**; the sidebar does not open automatically during task execution.

Existing users should finish browser tasks before updating. Load only one BeatBrowser extension per profile, and keep the CLI and extension on the same source revision. The regular README download links still point to the stable 1.2.2 GitHub/npm release; they do not contain these source-preview features.

## Language and compact UI

The inline language switch offers Chinese and English without a native dropdown. On first use it follows Chrome's UI language (Chinese locales use Simplified Chinese; others use English). An explicit choice is saved in local extension storage and updates the popup, sidebar, injected controls and future notification titles. Task labels, agent progress and website text retain their original content. No model call or translation service is involved.

The workspace removes the large slogan, duplicate introduction and routine connection metadata. It keeps tasks, status, actions and pause reasons; connection help lives under Settings. Payment confirmations retain the amount, destination and explicit confirmation.

## Task cleanup follow-up

Update the source/dependency and reload the existing extension. This revision also changes bridge routing: after active Agent work finishes, restart the shared BeatBrowser bridge and reconnect Agent clients so both sides use the same revision. Do not install a second extension or import Chrome data.

Task records now survive reload/update in local extension storage. Unfinished tasks show **Ready to restore** until you inspect their pages and choose **Continue**. Finished tasks remain finished. Missing pages offer **Check again** and **Reconnect pages**. No prior input or submission is automatically replayed. Recovery after a full browser restart also requires Chrome to restore the corresponding tabs/groups.

Records already lost by an older version cannot be recovered retroactively. Use **Browser pages** for retained grouped pages. Open the popup/sidebar and try **Clear** on an ended task, **Clear ended** for a batch, or **Clear all** with confirmation. Explicitly handed-over, adopted and moved pages remain open.

## Linked browser pages

The workspace separates background **Tasks** from **Browser pages**. Ordinary agent-controlled tabs and tabs in BeatBrowser groups appear in Browser pages even when there are zero TaskSpaces. Counts cover the current Chrome profile, not other profiles or browsers. A group indicates a page association, not a running task.

View locates a page. Close and Close pages require confirmation; they act only on the listed snapshot. Unrelated tabs, task pages, and pages moved or navigated since confirmation remain open. Closing the last listed tab may close its window. This inventory also finds legacy grouped/associated pages whose original task records were never saved. Those pages do not imply a running task.

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
