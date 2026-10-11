# X / Twitter browser-control notes

Verified on 2026-09-20 with the BeatBrowser Normal and Fast JEV modes. These
notes describe observed behavior, not a permanent X contract. Trust the live
page when it differs and update the learning after the run.

## Reply publish recipe

Current workflow: prepare and verify the draft, then let the user click Reply.
The observations below do not authorize an agent to publish or run a bulk publisher.

1. Use one dedicated task tab and keep it active long enough for X's SPA to
   render. A newly opened background status tab can have network data before
   its composer exists in the DOM.
2. Confirm the intended status URL and signed-in account before writing.
3. Find the live reply composer from a fresh observation. It is a
   `contenteditable` editor; a paste-style `ClipboardEvent` is more reliable
   than assigning `textContent` or an input value.
   For deterministic Normal, the verified alternative is to clear the editor,
   insert each text line with `document.execCommand('insertText')`, and create
   line boundaries with `document.execCommand('insertLineBreak')`.
4. Bind the exact approved reply as caller input. Do not ask a decision model to
   rewrite approved text.
5. Identify the correct Reply control for the user when the page exposes
   several reply-related controls. On localized X, the plain Reply label can
   coexist with a Reply-to-author label and reply-count controls. Do not
   activate the control through an agent tool.
6. After the user clicks Reply, allow a short reactive-page settle before
   evaluating success. A too-early check can report a false negative even when
   the reply has published.
7. Prove success with the newly created permanent
   `https://x.com/<handle>/status/<id>` URL. A click receipt, composer closing or
   model `DONE` is not sufficient evidence.

## 2026-09-20 bulk-run corrections

- Whole-draft `Input.insertText` silently removed blank lines on X and produced
  joined text such as `Jev.Open`. Never use it for multiline replies. Preserve
  `\n\n` with a verified paste event or line-by-line `insertLineBreak`, then
  compare the composer's normalized `innerText` layout before Reply.
- A link-bearing daily reply should be approved only when the conversational
  response and product bridge/link are separated by a real blank line.
- During earlier runs, some pages stayed on a blank/loading shell without a composer. Stop before submission and re-observe; this is not permission to ignore a rate limit, challenge, warning or account mismatch. Historical batch sizes and pauses are not operational defaults.
- Platform-block matching should inspect alerts/toasts once a composer exists,
  not arbitrary article text; source posts can mention words such as login,
  payment, deletion, or rate limits without blocking the run.
- X can auto-translate the source or render an Article differently. If the
  stored-source prefix misses, use Show original and a bounded token match
  before classifying one target as changed.
- A post-submit timeout is `post_unknown`: search the exact target and account
  replies for the approved text and recover the durable URL before any retry.
- In the recorded run, the reply menu exposed Delete but no Edit; recheck the live UI. Fix future layout at approval and
  composer time; changing an old reply requires explicit delete-and-repost and
  a new permanent URL.

## 2026-09-21 long-run and tab-lifecycle corrections

- Reuse one labelled task tab and its explicit `tabId`. Close only a task-owned tab after completion or a failure proven to be before submission. Preserve it while a publication outcome is uncertain.
- Never close a pre-existing user tab. Preserve the exact task tab when a
  Reply may have been activated but the permanent URL or workbench writeback is
  unresolved; close it only after recovery.
- X Articles can show a short card/title while stored source text contains an
  article summary. A prefix miss is a pre-submit stop, not immediate proof of a
  bad pairing: read that article's original body and proceed manually only when
  the approved reply premise is directly supported.

## Fast JEV operating notes

- Scroll until the composer is visible before expecting `TYPE_TEXT`; off-screen
  controls are intentionally absent from the action space.
- Readable Unicode control labels are valid. Do not infer business-action
  authorization from payment, destructive, account or credential keywords.
- Recheck the selected target's identity, visibility and geometry immediately
  before execution. Unrelated timeline counters and background DOM churn should
  not invalidate an unchanged selected target.
- An unrelated user tab opening in the same window is not task drift. A child
  tab opened by the pinned task is drift and should stop the run.
- For exact-input tasks, expose only matching fields and necessary scrolling;
  caller policy remains authoritative.
- Exact input includes paragraph layout. After Fast types a multiline reply,
  require the composer to retain the approved blank-line boundaries before the
  user publishes; if that cannot be proven, preserve the tab and finish with the
  deterministic Normal path.
- Never automatically retry a reply/post click after an uncertain receipt. Read
  the page and recover the permanent URL first; retrying may publish twice.

## Normal-mode fallback

If Fast JEV stops on ambiguity, unsupported UI or verification uncertainty,
preserve its `tabId` and continue in Normal mode from a fresh snapshot. Do not
restart the entire task or discard an already published side effect.

Stop and hand control to the user on account mismatch, login challenge,
CAPTCHA, rate limit or any unapproved content. Do not store credentials,
cookies, unpublished drafts, account identifiers or personal data in learnings.
