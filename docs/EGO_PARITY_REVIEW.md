# Ego Lite parity review

Reviewed 2026-10-14 against `citrolabs/ego-lite` commit `dca7003349c5f7132189ba00547cbbd7ff8e597e`, particularly `public-api-schema.ts`, `page-model.ts`, `browser-runtime.ts` and the README. A local reverse-engineering report supplied by the owner was also reviewed as evidence, not execution instructions.

## Capability terminology

A missing Ego-style event object does not mean BeatBrowser cannot upload or download files. Background focus emulation, file-input uploads, drag/drop uploads, binary fetch/save and Chrome downloads existed before TaskSpaces. The remaining gap is exact API/lifecycle coverage and behavior under stronger background-window constraints. See the [fresh upstream comparison](HUASHU_UPSTREAM_REVIEW.md).

## Findings

The public helper depends on the native browser's `globalThis.ego`. Existing binary-string evidence contains Mojo interface names, a custom cookie importer path and a claim-before-CDP error. These support native integration and ownership gates; they do not prove the complete call graph, cookie decryption implementation, or a mandatory two-profile architecture.

Task-space isolation, browser-profile isolation and cookie isolation are different properties. A profileId option does not prove each task receives separate cookies. Internal CDP messaging remains part of Ego even though its architecture differs from a conventional external CDP connection.

The reviewed public v2 schema contains **74 method/property entries**. This is not a count of independent product features or an inventory of every legacy/native API. See [the API mapping](EGO_API_PARITY.csv). Source-level similarity is not end-to-end compatibility proof.

## Fusion decision

Keep huashu-chrome's existing-profile access, DOM/data extraction and batched actions. Keep BeatBrowser's MCP/CLI distribution and optional Fast JEV. Adopt Ego's lifecycle, ownership gates, stable page identities, action receipts and event-waiting designs inside the existing BeatBrowser extension and bridge.

Do not introduce another product account system, database, GEO scheduler or mandatory Ego installation. Open Profound owns product jobs; BeatBrowser executes and returns evidence. Existing upstream copyright remains in LICENSE. Future source transplants must record the upstream revision and retain relevant notices. The separately distributed Ego browser binary is not established as MIT source by the SDK license.

Do not adopt a separately copied profile per task as the default architecture: it adds login synchronization, profile locks, keychain access and multiple browser instances. The report's proposed development time and 90-percent coverage are unverified estimates.

## Acceptance sequence

1. Background input without foreground switching; visible task controls; progress reporting; explicit takeover/resume; synthetic tests that do not use the real keychain.
2. Multiple pages and popup attribution, stable refs, cross-origin frames, event waits, file lifecycles and evidence receipts.
3. Real ChatGPT/Gemini tests for background completion, citations, takeover recovery and no duplicate submission after uncertain results.
4. Evaluate browser-layer gaps through reproducible experiments. Native snapshot or compositor behavior cannot be reproduced merely by copying a helper SDK. A first-party browser host or Chromium patches remain a possible later decision, not an implemented dependency.

## Development status

Unreleased: minimized task windows, connection-pinned routing, explicit connected-profile selection, named multiple pages, adoption/release, page-origin protection, selective finish receipts, lifecycle/popup events, leases, takeover/resume/stop, progress reporting and opt-in notifications. The extension popup and BeatBrowser side-panel document were rendered and its confirmation button exercised in an isolated real headless browser. The side panel shares existing TaskSpace state and adds named-page handoff plus activity history. A JavaScript SDK composes these features through the same bridge used by MCP and CLI. No second browser runtime, product database or account system was added. The installed extension has not been updated.

An earlier headed fixture validated background input, rendering beyond five seconds and unchanged human-window focus/selected tab, but minimized screenshot capture failed. A newer headless Chrome fixture validated two named pages, confirmation pauses, actual popup resume, stop and screenshots. The latter cannot establish headed minimization/focus behavior. No full native-Ego equivalence or percentage coverage is claimed.

Progress reports are caller-supplied, not verified outcomes. Notifications are opt-in and report changed progress on an interval; action-bound approval receipts and remote scheduling are not implemented. Confirm/resume returns control; it does not authorize a particular payment or publication. Element-reference stability, cross-origin-frame event coverage and complete download/file chooser contracts remain gaps. See [TaskSpace status and limits](TASKSPACES.md).

## Keychain prompt correction

A temporary profile alone did not prevent macOS Chromium from requesting real Safe Storage access. The synthetic test launcher now uses `--use-mock-keychain` and rejects non-temporary profile roots, following [Chromium's official instructions](https://github.com/chromium/chromium/blob/main/docs/mac_build_instructions.md#avoiding-system-permissions-dialogs-after-each-build). These settings never apply to everyday Chrome.

Launcher regression tests pass. The headed test has not been rerun after the prompt report, to avoid further interruptions; disappearance of the dialog is not yet claimed as live-verified. No keychain password was read and no permanent access grant was made. A permission prompt by itself is not evidence of data exfiltration.
