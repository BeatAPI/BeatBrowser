# Maintaining BeatBrowser's upstream integrations

BeatBrowser owns its MCP/CLI/JavaScript interfaces, TaskSpaces and UI. Preserve upstream MIT notices in LICENSE. Ego's public helper license does not grant source access to its separately distributed native browser.

Run `npm run check:upstream` to compare live GitHub heads with [reviewed revisions](upstream-sources.json). The command reads metadata only; it does not update code, install anything or create scheduled monitoring. A changed head is a review signal, not permission to merge it.

For each upstream update:

1. Fetch into a review ref with `--no-tags`; never import another product's release tags into our release workflow.
2. Review the actual runtime diff, not only release prose. Record which changes are incorporated, adapted, deferred or rejected.
3. Preserve existing Agent adapters and explicit TaskSpace profile/page ownership. Do not add an account system, product queue or mandatory browser fork.
4. Test focus, popup behavior, file transfer, disconnect/replacement, pause/resume and uncertain outcomes. A successful request is not verified business success. Never retry an uncertain write automatically.
5. Keep UI and runtime on the same state model. Opening an attention panel or foreground window requires a user gesture or explicit handoff. Never hide the native debugger warning by changing the user's Chrome launch options.
6. Run tests, syntax/security checks, isolated package installation and the disposable browser probe. Label headless, headed, installed and published evidence separately.
7. Build a matching CLI and extension preview; test it before release. Publish only through the project's release workflow with owner authorization. Update reviewed revisions only after actual source review.

## 2026-10-14 integration ledger

| Reference | Adopted or adapted | Not imported in this preview |
|---|---|---|
| huashu-chrome 1.3 | Own side panel, worker-side readiness timing, bounded stall diagnosis, pre-dispatch thaw, request evidence, tab-close cleanup, accurate download guidance | Automatic replay after thaw; automatic playbook capture/adoption; entire welcome and connection-version implementation |
| Ego public SDK | Owned TaskSpaces, named pages, explicit handoff/resume, scoped routing, lifecycle history and page-retention receipts | Native browser binary/branding, raw task CDP session, complete Download/FileChooser contracts |

The new write probe intentionally omits URLs as well as headers/bodies; it cannot distinguish analytics from business writes. Receipts therefore describe observations without declaring success. Existing reviewed site learnings remain the workflow-reuse mechanism; this preview does not silently save users' input as new playbooks.
