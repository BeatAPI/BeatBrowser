# JavaScript access for any agent

Development API; use the matching source extension and bridge. This SDK reuses BeatBrowser's existing local connection, browser profile and task ownership. It does not launch a second browser, import cookies, require an Ego app or create an account.

MCP agents can continue using tools. CLI agents can use `beat-browser call spaces '{"action":"profiles"}'`. Node agents can compose a workflow:

```js
import { createBrowser } from '@beatapi/beat-browser/browser';

const browser = createBrowser({ client: 'my-agent' });
const profiles = await browser.profiles();
// Choose the intended connected profile. Do not guess when several are present.
if (profiles.length !== 1) throw new Error('Select the intended profile first.');
const task = await browser.openSpace({
  url: 'https://example.com',
  label: 'Compare sources',
  profileId: profiles[0].profileId,
  notifications: false,
});
try {
  const main = task.page('main');
  console.log(await main.snapshot());
  const reference = await task.newPage('reference', 'https://example.org');
  console.log(await reference.readText());
  await task.report('Both sources are ready for review.', { needsConfirmation: true });
  // The human can review the task and explicitly return control in the popup.
  // Waiting never sends a resume request on behalf of the human.
  await task.waitForControl({ timeout: 300000 });
  console.log(await task.finish({ keep: ['main', 'reference'] }));
} finally {
  // Disconnecting does not silently finish/delete browser evidence.
  browser.close();
}
```

## Contracts

- `task.page(label)` is a durable task-local page handle, not a durable element reference. After DOM changes, obtain a new snapshot before using element refs.
- Page operations include `goto`, `reload`, `snapshot`, `readText`, `screenshot`, `click`, `fill`, `select`, `press`, `scroll`, `query`, `evaluate`, `fetch`, `network`, `act`, `waitForSelector`, `waitForText`, `waitForIdle`, `waitForURL`, `waitForPopup` and `close`.
- Selectors are strings. A snapshot target is an object such as `{ref, snapshotId}` or `{find:{role,name}}`. Structured query and snapshot results preserve the existing BeatBrowser result format.
- `task.adopt(tabId, label, {userConfirmed:true})` requires explicit authorization and only adopts a page already inside that task window. It does not move a user's tab into another window.
- `task.events(after)` returns a bounded lifecycle log and a truncation flag. `waitForPopup` observes an event, not permission to adopt or act on the new page. A popup outside the task window pauses execution.
- `finish({keep})` closes only agent-created pages omitted from the keep list. User-owned, popup and moved pages are protected. The receipt separates retained and closed labels. Default keep is `all`.
- A disconnect, stop, lost ownership or uncertain click fails without rerouting to another profile or replaying the action.
- `report` is a caller-supplied progress note, not proof an action succeeded. Notifications are off by default. Enable them with the task checkbox or `openSpace({notifications:true,reportIntervalMs:300000})`; unchanged progress stays quiet. Review/completion can notify immediately.
- Multiple connected Chrome profiles require an explicit profileId when opening or listing spaces (`listSpaces({profileId})`). Only profiles with a connected extension appear; this is not a scan of local browser data.
- Do not equate returning task control with approval of every future consequential action. Keep action-specific authorization in the calling application.

See [TaskSpace limits](TASKSPACES.md) and [Ego parity assessment](EGO_PARITY_REVIEW.md).

After reconnecting, call `listSpaces({profileId})` before retrieving an existing `space(spaceId)`. If a new agent session is explicitly authorized to take over a recovered task, call `claimSpace(spaceId, {profileId, userConfirmed:true})`. This returns a paused handle; missing pages must be associated in the workspace and resuming still needs explicit user authorization.
