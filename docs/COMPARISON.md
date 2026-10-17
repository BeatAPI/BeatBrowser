# Browser integration comparison

Reviewed 2026-10-18 against BeatBrowser main `51db7707d0292423b036d4cecf609feb2bbcff78` and the linked primary documentation. This compares browser integrations and connection modes, not model intelligence or market-wide performance.

## Quick comparison

| Capability | BeatBrowser | Claude built-in | Codex built-in | Claude extension | Codex extension |
| --- | :---: | :---: | :---: | :---: | :---: |
| Access signed-in websites | ✅ | ✅ | ✅ | ✅ | ✅ |
| Works across external agents | ✅ | ❎ | ❎ | ❎ | ❎ |
| Open-source integration | ✅ | ❎ | ❎ | ❎ | ❎ |
| No tool vendor account | ✅ | ❎ | ❎ | ❎ | ❎ |
| No extra browser app | ✅ | ✅ | ✅ | ✅ | ✅ |
| Visual task or session UI | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read pages and fill forms | ✅ | ✅ | ✅ | ✅ | ✅ |

| Capability | BeatBrowser | Ego Lite | Playwright MCP | Browser Use | agent-browser |
| --- | :---: | :---: | :---: | :---: | :---: |
| Access signed-in websites | ✅ | ✅ | ✅ | ✅ | ✅ |
| Works across external agents | ✅ | ✅ | ✅ | ✅ | ✅ |
| Open-source integration | ✅ | ✅ | ✅ | ✅ | ✅ |
| No tool vendor account | ✅ | ✅ | ✅ | ✅ | ✅ |
| No extra browser app | ✅ | ❎ | ✅ | ✅ | ✅ |
| Visual task or session UI | ✅ | ✅ | ❎ | ❎ | ✅ |
| Read pages and fill forms | ✅ | ✅ | ✅ | ✅ | ✅ |

## Read the rows consistently

| Row | Exact scope |
| --- | --- |
| Signed-in website access | The agent can work with authenticated pages after the user signs in or imports site authentication. Built-in browsers can keep their own signed-in sessions, so they also count as yes. This does not imply direct reuse of the user's regular Chrome profile; connection and import paths are compared in the product pages. |
| External AI agents | The browser integration is supplied for independently chosen external agents, rather than only its vendor's native agent entry points. A host's ability to install another MCP server does not make its built-in browser an external-agent tool. |
| Open source | Publicly licensed browser-control integration/tooling. Codex CLI's open source does not establish that the desktop browser integration is self-hostable. Ego's SDK/Skill is open; its separately downloaded native browser is a different licensing scope. |
| No tool vendor account | The local browser tooling does not require an account with its own vendor. Agent/model access may still require a separate account or key. This is not a zero-total-cost claim. |
| No separate dedicated browser app | Can work through an existing supported browser or a browser bundled in the chosen agent app, without separately installing a dedicated browser product. BeatBrowser still requires its extension, Node.js and local bridge. Ego requires the Ego browser app. Playwright extension mode, Browser Use system-Chrome mode and agent-browser existing-browser modes count. This is not an install-time, step-count or zero-setup ranking. |
| Visual interface | A bundled UI for inspecting browser tasks or sessions. Native app/extension interfaces and agent-browser's Dashboard count. Terminal logs, Playwright's connection permission screen, Browser Use Cloud and separate WebUI projects are outside this row. |
| Page actions | Reading and form interaction. This does not certify any particular website, CAPTCHA bypass or successful submission. |

Ego supports Chrome login import and normal use without manually enabling remote debugging. The separate-browser row asks whether another dedicated browser app is required; it does not mean browser automation or login reuse is missing. [Ego source audit and implementation differences](comparisons/ego-lite.md).

## Compare one product at a time

- [BeatBrowser vs Ego Lite](comparisons/ego-lite.md)
- [BeatBrowser vs Claude built-in browser](comparisons/claude-built-in.md)
- [BeatBrowser vs Codex built-in browser](comparisons/codex-built-in.md)
- [BeatBrowser vs Claude Chrome extension](comparisons/claude-extension.md)
- [BeatBrowser vs Codex Chrome extension](comparisons/codex-extension.md)
- [BeatBrowser vs Playwright MCP](comparisons/playwright-mcp.md)
- [BeatBrowser vs Browser Use](comparisons/browser-use.md)
- [BeatBrowser vs agent-browser](comparisons/agent-browser.md)

## BeatBrowser capability inventory

| Area | Current capability | Evidence / boundary |
| --- | --- | --- |
| Chrome access | Reuses the explicitly connected profile | No cookie/profile-file export; no scan of disconnected profiles |
| Agent access | 24 normal stdio MCP tools, CLI, Node SDK | [SDK](JAVASCRIPT.md); individual clients need their own acceptance |
| Profiles | List connected extensions and choose a profile | [TaskSpaces](TASKSPACES.md); multiple connections require explicit selection |
| Tasks | Separate windows with labels and state | Same-profile cookies/storage are shared |
| Multiple tasks | Up to four nonterminal tasks per owner | Up to 16 pages per task; not unlimited parallel throughput |
| Ownership | Task pinned to extension and owner | Lost connection or ownership fails closed |
| Page identity | Named task-local page handles | Does not make element refs durable across DOM changes |
| Observation | Snapshot, text, structured queries, screenshots | Minimized headed screenshot remains a gap |
| Actions | Click, type, select, keys, scroll | Single tools are not a universal approval system |
| Composition | `act` with repeat/if/assert and Node workflows | Optional Fast JEV has a separate consent and support scope |
| Human control | View, pause/handoff, explicit resume, stop | Focus pauses subsequent actions, not already dispatched input |
| Progress | Caller-supplied notes and lifecycle history | A note is not an independently verified result |
| Notifications | Opt-in local progress/review/completion | Changed progress at a bounded interval, not an always-on monitor |
| Reload recovery | Records, labels and progress restore paused | [Recovery checks](PREVIEW_TESTING.md) |
| Restart recovery | Records survive; explicitly reconnect missing pages | Matching URLs alone never grant control |
| Agent recovery | Explicitly authorized claim by a new session | Claim leaves execution paused |
| Cleanup | Clear ended tasks, selectively retain pages | Protects adopted, moved and handed-over pages |
| Files | File-input and drag/drop upload, fetch/save, Chrome download | Full Download/FileChooser event objects remain incomplete |
| Local context | Editable site notes and playbooks | No automatic model training claim |
| Privacy | Local bridge and task state; no normal-mode Beat cloud | Tool output still reaches the chosen agent/provider |
| Distribution | npm/source, matching extension archive | Unpacked extension; no store-install claim |

## Primary sources

- [Claude Code Chrome](https://code.claude.com/docs/en/chrome) and [desktop Browser](https://code.claude.com/docs/en/desktop#browse-external-sites)
- [OpenAI Browser](https://learn.chatgpt.com/docs/browser), [browser extension](https://learn.chatgpt.com/docs/chrome-extension), [changelog](https://learn.chatgpt.com/docs/changelog)
- [Ego repository](https://github.com/citrolabs/ego-lite), [Space](https://lite.ego.app/document/en/docs/space), [SDK](https://github.com/citrolabs/ego-lite/tree/main/package/ego-browser)
- [Playwright MCP](https://github.com/microsoft/playwright-mcp), including its extension-mode and isolated-mode documentation
- [Browser Use](https://github.com/browser-use/browser-use), [real browser](https://docs.browser-use.com/open-source/customize/browser/real-browser)
- [agent-browser](https://github.com/vercel-labs/agent-browser), [CDP mode](https://agent-browser.dev/cdp-mode), [Dashboard](https://agent-browser.dev/dashboard)

No timing, token, reliability or anti-bot ranking is claimed. A vendor's advertised benchmark and the owner's reported daily experience do not establish a controlled BeatBrowser-vs-competitor result. The task UI and existing-Chrome integration are useful product choices; native browser contexts, full protocol events and CI infrastructure are separate capabilities.
