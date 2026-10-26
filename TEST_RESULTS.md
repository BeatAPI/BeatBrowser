# Test results

### GitHub source submission validation, 2026-10-26

- Re-ran all 292 tests: zero failures, cancellations or skips. Syntax checks
  passed for 78 JavaScript files; the narrow source-pattern security scan found
  no findings in 128 files. Clean package installation (134 files), 24 normal
  MCP tools, and local extension packaging passed.
- Re-ran isolated Chrome for Testing acceptance with synthetic provider responses.
  Popup/sidebar setup, consent, test without saving, enable/disable/remove,
  credential boundaries, Chinese layout and collapsed Settings passed. The real
  browser runner performed one click and passed its outcome assertion with
  `status: completed`, `verified: true`.
- This recheck made no real BeatAPI model calls and does not revalidate the
  dated live-provider observations below. Source submission does not publish
  a new npm version, GitHub Release or extension download.

### Source preview: extension FAST entry, 2026-10-25

- The revised popup/sidebar keep tasks first and nest FAST inside the collapsed
  Settings section. Expanding Settings shows a compact FAST row; only Configure
  reveals API key/model/consent fields. Isolated Chromium acceptance confirmed
  this initial state, configuration expansion, and unsaved-key clearing when
  Settings is closed. Default, Settings-row and expanded-form screenshots were
  regenerated without making additional live model calls for the layout change.
- 292 tests passed with zero failures/skips. Eight new integration tests cover
  ephemeral connection testing, private key persistence, consent, fixed BeatAPI
  routing, failure preservation, permission/symlink rejection, opt-out precedence,
  live MCP tool discovery, revocation, and credential-free bridge replies/audits.
- `node scripts/check-fast-browser.mjs` with `BEAT_TEST_CHROME` uses an isolated
  Chrome for Testing profile, temporary bridge and synthetic model responses.
  Actual popup and sidebar controls passed: consent gating, invalid-key response,
  test-without-saving, enable/disable/remove, saved-state recovery, Chinese UI and
  340px layout. Keys were absent from Chrome local/session storage, and an injected
  content script could not change FAST settings.
- The real extension/bridge runner completed a local fixture task with one JEV
  decision and one actual browser click, followed by a passing page assertion.
  The provider response was synthetic: this does not establish current real JEV
  availability, billing, latency, or decision quality.
- Syntax: 78 JavaScript files. Narrow source-pattern scan: no findings. Clean
  134-file package installation, stable launcher and 24 normal MCP tools passed.
- A subsequent explicit live run used the operator-authorized credential through
  process memory. The non-billable `GET /v1/usage` check returned HTTP 200.
  Exactly two `POST /v1/systemone` calls to BeatAPI with `jev-1.13` returned 200:
  the popup's **Test & enable** request (1,773 ms response-header latency) and
  the actual browser runner decision (614 ms response-header latency). The
  runner performed one real click and passed its page assertion with
  `status: completed`, `verified: true`. These are two observed requests,
  not a general latency or reliability benchmark. The popup/sidebar and
  enable/disable/remove controls passed with this real provider configuration.
- The live run used a disposable browser profile and owner-only temporary settings;
  the key was removed from those settings and the test profile was deleted.
  It was not written to the repository, result report or Chrome storage. The
  authorized existing secret-store entry was unchanged. No exact billing charge
  was audited. Signed-in websites, complex workflows and native macOS focus
  behavior remain unverified. This is an unreleased development branch; the
  active extension was not replaced.

### 1.4 release validation, 2026-10-18

- 1.4.0 includes the optional remote adapter and current WorkBuddy configuration detection. The 284-test suite, syntax, source-pattern security scan, comparison assets, clean package installation, MCP discovery and extension packaging passed.
- GitHub extension and CLI download checksums matched. Public npm availability is verified separately from a successful publish job.
- 1.4.1 corrects remaining version guidance in the Agent directory and workspace documentation; runtime behavior is unchanged.
- Remote client compatibility, public tunnels, real signed-in workflows and native macOS focus behavior still need separate acceptance. The dated source-preview entry below records the earlier pre-release review.

### Source preview: cloud Agent adapter and documentation, 2026-10-18

- **284 tests passed**, zero failures or skips. Remote coverage includes credential
  expiry/rotation/revocation, HTTP MCP with the official client, HTTP calls,
  WebSocket, resource limits and background adapter lifecycle.
- An isolated runtime check connects the HTTP MCP client through the real local
  stdio server and ephemeral bridge to a synthetic extension. It does not use a
  personal Chrome profile or a real website login.
- Syntax: 74 JavaScript files. Narrow source-pattern scan: 124 files, no findings;
  this is not a comprehensive security audit.
- The 123-file tarball installs in an isolated directory, discovers 24 normal
  tools, preserves existing WorkBuddy servers and selects its current config path.
  Remote credential/configuration commands do not print the generated token.
- Extension packaging and comparison-table/SVG consistency checks passed.
  English and Chinese README rendering, local links and heading anchors were
  checked; there is no published demo recording.
- This source preview is not an npm or extension-download release. Published
  `1.3.2` does not include the remote adapter or updated WorkBuddy config detection.
  Public tunnels, Muse/Grok Bot client UI, real signed-in workflows and native
  macOS focus behavior remain unverified by these checks.

### 1.3.2 group-free workspace, 2026-10-16

- Ordinary agent pages and TaskSpaces create no native Chrome groups.
- Unit coverage checks target-based reload recovery, same-URL page separation,
  restart ownership boundaries, v1 migration and preservation of user groups.
- Isolated real Chromium verifies task input, popup/sidebar controls, explicit
  cleanup and page-list error/retry UI. No daily Chrome profile is used.
- The recovery check verifies actual extension reload and browser restart:
  reload retains exact live page associations; restart retains metadata and
  requires explicit reassociation, then a separate resume. No input is replayed.
- Native macOS no-focus acceptance remains unverified for this release.


This file records what has actually been executed against BeatBrowser. It is
evidence for specific claims in the README, not a certification. Numbers from
live runs are small samples and are labelled as such.

## Automated checks

### 1.3.1 task cleanup follow-up on 2026-10-15

- **256 tests passed**, zero failures. Coverage includes single/bulk cleanup, explicit confirmation for active tasks, adopted/moved/handed-over/unmanaged page protection, retryable failures and human-only cleanup commands.
- Syntax: 63 JavaScript files. Source/security scan: 99 files, no findings.
- Isolated Chrome 153 headless: popup/sidebar controls and bilingual persistence passed. The actual sidebar document displayed cleanup controls at 340px without horizontal overflow; cancel preserved the task, and Clear ended removed the card and both task tabs while leaving the ordinary fixture tab open. Screenshot visually reviewed.
- This used a disposable profile, private bridge and mock keychain. It did not clean the user's live tasks or reload the daily extension, and does not establish native macOS focus behavior.


### 1.3.1 bilingual compact UI follow-up on 2026-10-14

- Follow-up design refinement replaces the OS-native dropdown with inline language buttons, compacts connection/workspace controls, moves the build label into Settings and uses the homepage palette for empty/task cards. The actual daily Chrome popup displayed both language buttons and the new layout without another extension reload. Isolated bilingual switch/persistence and task interaction checks passed again (121 to 512 frames).

- **249 tests passed**, zero failures/skips. Syntax: 63 JavaScript files; narrow source/security scan: 99 files, no findings.
- Isolated install: 89 files, matching versions, stable launcher and 24 Normal MCP tools passed.
- Chrome 153 headless: real extension popup/sidebar changed English to Chinese and back; saved language applied to newly opened documents. Both language screenshots were visually inspected. Task controls continued to pass through actual extension messaging. Background input, upload, binary save and confirmation/stop checks also passed (122 to 513 rendered frames).
- Reloaded the existing daily Chrome 155 extension via BeatBrowser. Its native popup visibly showed Chinese language selection, Connected, Workspace, Tasks and Settings in Chinese. No MCP restart was needed for this UI-only update. A subsequent selector interaction was stopped because the user changed Chrome's active UI; the live desktop switch was not completed. The full switch/persistence check above used the isolated browser.
- The previous Xiaohongshu demo task finished with its page retained before extension reload. No site login or personal profile was migrated.
- Chinese and English UI copy is shared across popup/sidebar/control marks and confirmation surfaces. Agent-authored text stays unchanged. Injected control and payment-panel localization is implemented but not comprehensively visual-tested on the user's sites.


### 1.3.1 light UI local preview on 2026-10-14

- **246 tests passed**, zero failures/skips. Syntax: 61 JavaScript files; narrow source/security scan: 97 files, no findings.
- Popup and sidebar use the BeatAPI homepage palette and bundled licensed fonts. Real extension documents rendered in isolated Chrome 153 headless; screenshots visually inspected, light color scheme and horizontal overflow checks passed. In-page control marks and confirmation surfaces were restyled; their complete visual states were not separately acceptance-tested.
- Disposable profile/private bridge, mock keychain: two named pages, input, upload, byte-verified binary save, request evidence, explicit review/resume and stop passed. Rendering advanced from 122 to 512 frames. These results do not establish native focus/minimization behavior.
- Actual daily Chrome 155 with the previous 1.3.0 extension: native sidebar opened; two Example Domain pages read and finished with both retained after explicit user resumes. The user reported the task window appeared on its own. **No-interruption acceptance failed.**
- A separate headed Chrome 153 diagnostic observed a queued focus event while the task window was minimized. It paused before page-read readiness. Its disposable visible fixture disturbed the user and was closed; no personal profile was imported.
- Final focus handling now checks current window state before interpreting an activation event. Regression coverage verifies stale/minimized/unfocused events, real focus pausing and conservative pause on inspection failure. Native macOS acceptance of this final change remains pending; headless checks are not proof that focus stealing is resolved.
- The final 1.3.1 preview has not been reloaded into daily Chrome or published. Existing site logins are reused only when running in that same ordinary Chrome profile; a separate test profile deliberately has none.


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
