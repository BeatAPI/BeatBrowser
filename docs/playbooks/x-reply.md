# X Reply playbook (BeatBrowser)

Sanitized operating notes for agents controlling a signed-in Chrome tab on `x.com`.
Sources: BeatAPI team X Reply runs + local beat-browser learnings (2026-08 / 2026-09).
Verify live DOM when X changes UI. Never store cookies, keys, or unpublished drafts here.

## Goals

Use this controller as the **hands** for an X Reply Agent:

1. Discover / open a status URL
2. Draft reply text outside the browser (BeatAPI Text API / plugin / skill)
3. Fill the composer with a reliable paste recipe
4. Stop with the verified draft and let the user click Reply
5. Prove success with a durable `https://x.com/<handle>/status/<id>` URL (not “clicked”)

## Session discipline

- Keep **one dedicated X tab** per batch. Pass the exact `tabId` on every command when multiple agents run.
- Background tabs on X often **do not render React**. If GraphQL returned 200 but `article[data-testid="tweet"]` is empty, select the tab with **focus:true**. Reload / waiting / screenshots without focus will not fix it.
- Before any mutation, verify the **visible signed-in handle**. Never silent-switch accounts.
- Call `learnings({ domain: "x.com" })` at session start when the host supports it.

## Reliable reply draft and verification recipe

For each approved item:

1. `navigate` to the target status URL
2. `wait` for `[data-testid="tweetTextarea_0"]`
3. `click` that textarea to expand the composer (real click)
4. Insert the **full** reply with its paragraph layout intact. Clear the editor, insert one line at a time with `insertText`, insert line boundaries with `insertLineBreak`, and verify the normalized `innerText` layout. Then stop: the user clicks Reply. This workflow does not use a bulk publisher. A verified paste event remains a fallback:

```js
(function () {
  var box = document.querySelector('[role="textbox"]');
  if (!box) return 'no textbox';
  box.focus();
  var dt = new DataTransfer();
  dt.setData('text/plain', FULL_TEXT_WITH_NEWLINES);
  box.dispatchEvent(new ClipboardEvent('paste', {
    clipboardData: dt, bubbles: true, cancelable: true
  }));
  return 'pasted';
})()
```

Notes:
- Prefer `[role="textbox"]` over nested contenteditable selectors that often miss.
- Do not send a whole multiline draft through `Input.insertText` or the generic `type` tool. X can silently remove `\n\n`, joining paragraph boundaries such as `Jev.Open`.
- Before handing the draft to the user, compare paragraph layout as well as non-whitespace text. Comparison may normalize `\r\n` and runs of 3+ newlines, but it must preserve every intended blank-line boundary.
- CSP may block `const`/`let` in page eval — use `var` or an IIFE.

5. Tell the user the draft is ready and wait for them to click Reply. Do not activate the submit control or run a publisher.
6. After the user submits, verify the matching reply under the target and on the approved account's replies surface. An observed `CreateTweet` or `CreateNoteTweet` HTTP 200 is supporting evidence, not sufficient proof by itself.
7. Capture the newly created durable reply URL under the approved handle.
8. Write back to the caller's ledger when authorized. A composer closing or tool receipt is **not** publication proof. If the outcome is uncertain, check the target and account replies before any retry.

## Draft review defaults

- Preserve each intended paragraph boundary. For link-bearing replies, keep a real blank line before the product bridge/link.
- Prepare and review one draft at a time. This repository does not prescribe a daily quota or an automated publication schedule.
- Stop on a blank/loading page without a composer; re-observe before continuing. A rate limit, CAPTCHA, login challenge, warning or account mismatch requires handoff.
- Never delete or repost an existing reply to repair its formatting without explicit authorization.

## Hard lessons

- Bring the tab to the foreground before submit — background clicks often no-op.
- Frequent automation can trigger Cloudflare / Arkose — hand off to the human.
- Do not forge GraphQL yourself (`x-client-transaction-id`); drive the page and read `network`.
- Search coverage and filters can vary. Verify the visible source and current metrics rather than treating search results as complete.
- Virtualized timelines unload off-screen tweets — accumulate with a MutationObserver while scrolling.

## Safety defaults for BeatAPI demos

- Separate authorizations: discover ≠ draft ≠ approve ≠ publish.
- The user performs the final Reply click in this playbook.
- Stop on rate limits, captchas, login challenges, or account mismatch.
- No cold DM automation in the default playbook.

## Related BeatAPI pieces

- X Reply Chrome plugin (draft UI): `BeatAPI/x-reply-plugin`
- X Reply Skill (batch state machine): `x-reply` skill (in this repo: skills/x-reply)
- Text generation: BeatAPI `POST /v1/chat/completions` with a caller-selected model
- Social discovery: BeatAPI Social Data actions
