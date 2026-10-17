# BeatBrowser vs Ego Lite

**Keep Chrome. Add an open-source extension and local bridge.**

Reviewed 2026-10-18 against BeatBrowser main `51db7707d0292423b036d4cecf609feb2bbcff78` and Ego main `4cf79356509bccdead17863250b442f60a881c25`. This is a source/documentation comparison. It does not establish same-task performance or full runtime parity.

## Login reuse and installation

Ego supports Chrome-data import, existing website logins and normal use without manually enabling remote debugging. Login reuse receives a check for both products. **No extra browser app** compares installation architecture: Ego requires its own browser app; BeatBrowser uses an extension in existing Chrome plus a Node.js local bridge.

## Capabilities both provide

| Capability | BeatBrowser | Ego Lite |
| --- | :---: | :---: |
| Reuse existing website logins | ✅ | ✅ |
| Work with independently chosen external agents | ✅ | ✅ |
| Background agent workspace | ✅ | ✅ |
| Multiple concurrent tasks | ✅ | ✅ |
| Visible task/workspace controls | ✅ | ✅ |
| Human takeover and return of control | ✅ | ✅ |
| JavaScript workflow composition | ✅ | ✅ |
| Read pages and fill forms | ✅ | ✅ |
| Upload and download files | ✅ | ✅ |
| Publicly licensed integration SDK/tooling | ✅ | ✅ |

Checks describe supported workflows, not identical isolation, event, performance or platform guarantees. [BeatBrowser task contract][beat-tasks] · [Ego Space documentation][ego-space] · [Ego API schema][ego-api].

## What you install and maintain

| Dimension | BeatBrowser | Ego Lite |
| --- | --- | --- |
| Browser | Your existing Chrome profile | Separately downloaded Ego Chromium browser app |
| Additional components | Chrome extension, Node.js 20+ CLI/MCP server and local bridge | App-provided native CLI/bridge, JS SDK and agent Skill |
| Login reuse | Uses the connected profile directly; no profile migration | Can import Chrome cookies/login state, extensions and browser data; alternatively sign in inside Ego |
| Everyday browser choice | Keep existing Chrome; no dedicated browser product required | Use Ego for agent work; making it the default browser is not required |
| Current installation work | Install package, configure MCP client, enable Developer mode and load unpacked extension, check connection | Download/install app and complete onboarding; optionally import browser data; app installs agent Skills |
| Updates | Keep CLI and unpacked extension versions aligned | App/native runtime and SDK/Skill must be compatible; local SDK override is supported |

This supports **no browser migration required**, not “only one click,” “only a plugin,” or a measured claim that installation is always quicker. BeatBrowser has configuration steps; Ego automates Skill installation and offers a packaged app. [BeatBrowser install](../INSTALL.md) · [Ego onboarding][ego-quick] · [Ego local runtime][ego-dev].

## Source-level implementation differences

| Dimension | BeatBrowser | Ego Lite | Practical implication |
| --- | --- | --- | --- |
| Public integration chain | Extension, bridge, stdio MCP server, CLI and Node SDK are in the MIT repository | SDK/Skill are MIT; the native browser/bridge is provided by a separate app | Our integration chain can be inspected and modified without building a new browser. This does not mean Chrome itself is BeatBrowser source. |
| Agent entry | Bundled MCP tools, CLI and Node SDK | Documented native CLI/Skill that runs JS in `globalThis.ego` | MCP is our supplied entry point. Do not claim Ego cannot be wrapped by an MCP adapter. |
| Workspace | Separate Chrome task windows, with popup/sidebar controls | Native Spaces inside the Ego browser | Similar user workflow; different browser integration. |
| Cookies/storage | Tasks in one connected profile share state | Space documentation specifies one isolated BrowserContext per task | Account isolation is not equivalent. Ego's documentation contract was not independently leak-tested here. |
| Concurrency | Four nonterminal tasks per owner, sixteen pages per task | Parallel Spaces; no equivalent fixed numeric limit established in this review | Both support parallel work. No claim that our concurrency is greater. |
| Ownership | Connection/session pinning, pause, explicit resume, stop and protected cleanup | Claim/takeover/handoff/finish plus Page adoption/release in v2 schema | Both support ownership and human control. |
| Recovery | Local task archive; unfinished tasks restore paused; restart page association is explicit | Durable Page ledger and native ownership APIs; local SDK can be loaded into installed app | No identical browser-restart recovery test has been run. |
| Element references | Snapshot-scoped targets; take a new snapshot after DOM changes | Refs tied to frame/document/backend node; unchanged nodes and partial snapshots retain identity | Ego exposes a stronger ref contract. Neither guarantees stale references never happen. |
| Frame/network state | Cross-origin frame/event consistency remains a documented gap | Continuous per-Page and OOPIF request tracking in SDK | Test the actual iframe task before claiming reliability parity. |
| File lifecycle | File-input/drag-drop upload, binary fetch/save and Chrome download | Download events and objects with page, URL, name, saveAs, path, failure, cancel and delete | Basic file transfer exists on both; public lifecycle coverage differs. |
| Background screenshots | Known minimized headed capture gap | Native browser screenshot API is exposed | An API is not proof Ego passes every minimized-window case. No paired test yet. |
| Site knowledge | Local editable notes/playbooks | Bundled site learnings read by helper calls | Do not treat reusable notes as unique to us or as automatic model training. |
| Price | Normal local tools free; model access separate | Individuals free; Business custom quote | No blanket price advantage over its free personal product. |

Implementation evidence: [our MCP server][beat-mcp], [task-window implementation][beat-spaces], [JS API][beat-js], [Ego SDK design][ego-sdk], [native-runtime requirement][ego-dev], [v2 API][ego-api], [ref registry][ego-refs], [Ego runtime/CDP handling][ego-runtime].

## What we can credibly emphasize

- **Keep your existing Chrome.** No migration into a separate browser product, and no separate browser installation.
- **Inspect the integration chain.** Extension, local bridge, MCP/CLI and SDK source are public under MIT, with upstream notices retained.
- **Connect through the supplied MCP interface.** Use the same local browser tools from compatible agents, with task controls and recovery in Chrome.

These are reasons to choose a workflow, not evidence of universal superiority. Ego already provides background Spaces, multiple tasks, login import, human takeover and JS composition. Its packaged install and deeper SDK contracts also deserve credit.

## Suggested evaluation

Use the same agent/model and task inputs. Check login reuse, first-task setup, background focus, two concurrent tasks, a cross-origin iframe, upload/download completion and takeover/recovery. Retain failures, setup steps and observable business results. API counts and subjective daily experience alone do not establish speed, reliability, CAPTCHA or token rankings.

## Try BeatBrowser

[Installation](../INSTALL.md) · [Task lifecycle](../TASKSPACES.md) · [JavaScript SDK](../JAVASCRIPT.md) · [74-entry API mapping](../EGO_API_PARITY.csv) · [All comparisons](../COMPARISON.md).

[beat-tasks]: https://github.com/BeatAPI/BeatBrowser/blob/51db7707d0292423b036d4cecf609feb2bbcff78/docs/TASKSPACES.md
[beat-mcp]: https://github.com/BeatAPI/BeatBrowser/blob/51db7707d0292423b036d4cecf609feb2bbcff78/src/mcp-server.js
[beat-spaces]: https://github.com/BeatAPI/BeatBrowser/blob/51db7707d0292423b036d4cecf609feb2bbcff78/extension/spaces.js
[beat-js]: https://github.com/BeatAPI/BeatBrowser/blob/51db7707d0292423b036d4cecf609feb2bbcff78/src/browser.js
[ego-space]: https://lite.ego.app/document/en/docs/space
[ego-quick]: https://lite.ego.app/document/en/docs/quick-start
[ego-dev]: https://github.com/citrolabs/ego-lite/blob/4cf79356509bccdead17863250b442f60a881c25/docs/local-runtime-development.md
[ego-sdk]: https://github.com/citrolabs/ego-lite/blob/4cf79356509bccdead17863250b442f60a881c25/package/ego-browser/README.md
[ego-api]: https://github.com/citrolabs/ego-lite/blob/4cf79356509bccdead17863250b442f60a881c25/package/ego-browser/src/public-api-schema.ts
[ego-refs]: https://github.com/citrolabs/ego-lite/blob/4cf79356509bccdead17863250b442f60a881c25/package/ego-browser/src/page-ref-registry.ts
[ego-runtime]: https://github.com/citrolabs/ego-lite/blob/4cf79356509bccdead17863250b442f60a881c25/package/ego-browser/src/browser-runtime.ts
