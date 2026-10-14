# Test results

This file records what has actually been executed against BeatBrowser. It is
evidence for specific claims in the README, not a certification. Numbers from
live runs are small samples and are labelled as such.

## Automated checks

### 1.3.0 local preview on 2026-10-14

- **242 tests passed**, zero failures/skips. Syntax: 59 JavaScript files. Narrow security/source scan: 95 files, no findings; not an exhaustive security audit.
- Isolated package installation: 83 files, matching 1.3.0 metadata, stable launcher, SDK import and 24 Normal MCP tools passed. No npm publication or daily-client upgrade was performed.
- Rechecked upstream heads: huashu-chrome `84d5ee4053`, Ego public SDK `dca7003349`; both match the reviewed revisions.
- Real Chrome 153 headless with a disposable profile/private bridge and mock keychain: two named pages, background input, file-input upload, byte-verified binary save, one POST with method/status evidence, confirmation pause, stop and screenshot passed. Rendering advanced from 122 to 513 frames.
- Actual extension popup and sidebar document rendered task progress; both human-resume controls passed through extension messaging. Sidebar page inventory and activity history passed; screenshot visually inspected. This does not certify the native side-panel container on the user's desktop.
- Connection replacement now fails pending requests explicitly with unknown-outcome guidance. Timeout diagnosis and action receipts never automatically replay an uncertain write. Tests cover these behaviors and named-page human handoff.
- Still unverified in this preview: headed macOS focus/minimization, minimized headed capture, native download/file-picker dialogs, system notification delivery, and individual Grok Bot/Muse clients. No real profile, credentials or keychain permission were used.
- See [preview installation and acceptance](docs/PREVIEW_TESTING.md) and [upstream maintenance](docs/UPSTREAM_MAINTENANCE.md). Older entries below are historical snapshots, not the current preview totals.

Run from a clean checkout with Node.js 20+ after `npm ci`:

| Command | Result |
| --- | --- |
| `npm test` | 216 passed, 0 failed, 0 skipped (2026-10-12) |
| `npm run check:syntax` | 45 JavaScript files pass `node --check` (2026-10-12) |
| `npm run check:security` | No findings (narrow source-pattern and extension cloud-boundary scan; not exhaustive secret detection) |
| `node src/cli.js run --dry-run --url https://example.com --goal 'Check page readiness'` | Exit 0; `status: "dry_run"`, zero model calls, no browser connection |

### Upstream follow-up on 2026-10-14

- Compared current huashu-chrome 1.3.0 (`84d5ee4053`) with the pre-TaskSpace and current BeatBrowser sources. See [the review](docs/HUASHU_UPSTREAM_REVIEW.md).
- Fixed the inherited undefined `childKey` call in tab-close cleanup. The regression test executes the actual listener with unrelated session keys and verifies cleanup plus `tab_closed` emission.
- Corrected the download tool's unconditional no-save-dialog wording while preserving its argument schema.
- **235 tests passed**, zero failures/skips; syntax checked 54 JavaScript files; the narrow scan checked 85 files with no findings.
- Extended isolated Chrome 153 headless acceptance: real file-input upload checked by selected filename; binary fetch/write checked byte-for-byte. Existing multi-page, rendering, confirmation/popup resume, stop and screenshot checks passed again. No native file-picker/save dialog was opened, and no personal profile was used.
- Side-panel migration, full upstream 1.3 integration and headed/minimized screenshot acceptance were not performed.

### Unreleased TaskSpace development on 2026-10-14

- Full suite: **234 passed, zero failures/skips**. Syntax: 53 JavaScript files.
- Narrow source-pattern/cloud-boundary scan: 84 files, no findings; not a full security audit.
- Clean isolated npm installation: 74 package files, SDK import without starting a bridge, stable CLI launcher and discovery of 24 Normal MCP tools passed. Package version remains 1.2.2 as development metadata; no new npm release was made.
- Real Chrome 153 headless, disposable profile/private bridge: two named pages, input, rendering across 6.5 seconds (40 to 431 frames), confirmation pause, actual extension-popup resume, stop and screenshot passed. The screenshot was visually inspected. System notification delivery was mocked in unit tests, not verified against macOS notification settings.
- Transport tests cover explicit multi-profile selection, ambiguity rejection, page membership after addition/release, connection replacement/disconnection and no cross-profile fallback.
- An earlier headed fixture preserved the human window/tab and minimized the task window, but minimized capture failed. No headed rerun after the keychain-prompt report; headless results do not establish headed focus or prompt behavior.
- Synthetic tests now default to headless, require OS-temporary profiles and use a mock keychain on macOS. They do not import passwords/cookies or change everyday Chrome settings.
- Daily installed extension, live Grok Bot/Muse clients and signed-in ChatGPT/Gemini were not upgraded or acceptance-tested in this change. See [TaskSpace limitations](docs/TASKSPACES.md).

### Extension download release preparation on 2026-10-12

- Final CLI, package lockfile and extension versions match at 1.2.2.
- `npm ci`, all 216 tests, syntax/source checks, isolated package installation
  and extension ZIP generation passed locally.
- The ZIP regression checks root-level manifest/runtime files, removal of
  `manifest.key`, inclusion of the license/privacy notice, identical stable and
  versioned ZIPs, SHA-256 checksums and rejection of mismatched CLI versions.
- Workflow YAML and each embedded Bash script passed syntax checks.
- The first v1.2.1 Actions attempt passed tests but failed the package check
  because npm 12 changed `npm pack --json` from an array to a keyed object.
  The check now accepts both formats; the failed tag is preserved and the
  corrected source ships as v1.2.2. GitHub upload and npm publication are
  verified separately after push.
- This preparation did not install the new extension into a real Chrome profile
  or repeat the live cross-client demo.

### Release preparation on 2026-10-08

- 215 automated tests passed; syntax and narrow source checks passed.
- The lockfile was refreshed within compatible dependency ranges, and the MCP
  SDK minimum was raised to 1.32.1. npm audit reported zero known vulnerabilities
  after the update (a point-in-time registry check, not a security guarantee).
- A tarball was installed in an isolated temporary prefix. Its CLI, extension
  files, fake-home installer and discovery of 23 Normal MCP tools passed.
- The existing Chrome extension (v1.2.0) was connected with no version mismatch.
  A logged-in GitHub page was observed read-only; no account settings were changed.
- A real-browser run against the explicitly labelled local demo fixture filled
  title/summary/team, read back its preview and persisted the draft across reload.
  A batch attempt at Publish note stopped at the sensitive-action guard.
- A separate MCP client read the same fixture tab to check explicit-tab handoff.
- Claude Code CLI authentication was unavailable during this check. A Claude-to-
  Codex recording has not been executed; docs/DEMO.md is the rehearsal script.
- The first pre-change suite run had one failure; an immediate repeat passed.
  The failing test was not retained in the truncated first output, so its cause
  is not established. The release checks above are new runs, not a claim that
  the earlier transient failure was diagnosed.

### What the suite covers

| Test file(s) | Main coverage |
| --- | --- |
| `test/bridge-boundary.test.js` | Malformed message isolation, multibyte-token rejection and Normal response ownership over loopback sockets. |
| `test/english-only.test.js` | Shipped files are English-only; no blanked user-facing messages; bundled learnings load and their `act` playbooks lint clean. |
| `test/fast-client.test.js` | Typed JEV request contract, malformed/unknown answers, confidence thresholds, bounded streams, abort/timeout, provider errors, optional text helper. |
| `test/fast-policy.test.js` | Action compatibility, exact hostname scope, supported labels/fields, select options, stale refs, cloud/trace redaction. |
| `test/fast-runner.test.js` | Disabled/default/key boundaries, budgets, cancellation, target narrowing and scrolling, stale recovery, no-effect/uncertain actions, verification, sanitized traces. |
| `test/fast-interface.test.js` | CLI flags and bounded input files, consent, dry run, optional MCP advertisement and dispatch, MCP stdio startup, unchanged schemas of the 23 Normal-mode tools. |
| `test/fast-transport.test.js` | Real loopback WebSocket transport with fake Chrome peers: owner pinning, cancellation routing, forged-receipt rejection, no queue/replay. |
| `test/fast-extension.test.js`, `test/fast-extension-background.test.js` | Structured DOM snapshots, node/ref ownership, live identity checks, pre-dispatch races, native submit behaviour, deadline/domain/new-tab checks. |
| `test/fast-benchmark.test.js` | Reproducible offline fixture outcomes with network disabled; external-record validation. |

Extension tests use DOM and Chrome API doubles; transport tests use real
loopback sockets with fake extensions. Neither substitutes for a live Chrome.
The Normal-mode tool schemas are checked for exact continuity; that does not
prove every interaction on every real site.

## Offline benchmark (mocked)

`npm run benchmark:offline -- --iterations 5` runs nine fixture tasks five times
per mode. All 135 trials are `offline-mock`: the HTML fixture is not rendered
and no real model is called. Raw output: `docs/JEV_BENCHMARK_RESULTS.json`.

| Metric | A: scripted outer agent | B: fast runner + mocks | C: scripted hybrid |
| --- | ---: | ---: | ---: |
| Trials | 45 | 45 | 45 |
| Fixture objective attained | 30 | 25 | 30 |
| Verified completed | 25 | 20 | 25 |
| Blocked | 15 | 20 | 15 |
| Expected outcomes matched | 45 | 45 | 45 |
| Simulated model calls | 75 | 50 | 80 |

The fixtures deliberately include rejection and unverified-completion cases.
Expected-outcome matching is a control-flow check, not a task-success rate, and
local millisecond timings say nothing about model speed or cost.

## Live browser smoke test: Normal vs Fast JEV (n=3)

One signed-in X account in a real Chrome profile published three approved
replies with Normal BeatBrowser tools and three with Fast JEV. Every reply was
confirmed by reading its permanent status URL from the page.

| Mode | Verified | Total wall time | Mean per reply |
| --- | ---: | ---: | ---: |
| Normal | 3/3 | 170.4 s | 56.8 s |
| Fast JEV (final attempts) | 3/3 | 36.2 s | 12.1 s |

- The three final Fast JEV runs used 10 JEV calls, 68,391 input tokens and
  2,385 output tokens.
- Counting every earlier Fast JEV attempt made while fixing integration bugs
  (dynamic-page settling, multilingual labels, off-screen composers, ambiguous
  reply controls, post-submit verification races), executor time was 112.6 s,
  or 37.5 s per published reply, with 27 JEV calls.
- One final Fast JEV run published successfully but first reported a
  verification false negative; the reply was then confirmed manually.

This is an early, single-site, small-sample smoke test. It is not a general
speed, success-rate, cost or safety claim.

## Not yet tested

- A cross-platform / Node-version matrix.
- Chrome Web Store installation (the extension is loaded unpacked).
- Real, repeated A/B latency, cost or success-rate measurements beyond the
  smoke test above.
- The optional Fast JEV text helper against a live text model.
