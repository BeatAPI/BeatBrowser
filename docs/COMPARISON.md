# Browser integration comparison

Reviewed on 2026-10-17. Scope: Codex and Claude Code built-in desktop browsers,
their official browser extensions, and BeatBrowser. Compare the browser
integrations, not their models or the hosts' support for third-party MCP.

## Choose a browser integration

| Integration | Browser and login state | Task workspace | Native access |
| --- | --- | --- | --- |
| Codex built-in browser (desktop) | Separate profile; sign in directly. Available import features depend on the device. | In-app browser panel for local previews and page interaction. | OpenAI desktop integration; built-in Browser is not a Codex CLI or IDE feature. |
| Codex browser extension | Existing browser profile and signed-in sites. | Existing tabs; background and parallel-tab work. | Supported OpenAI desktop experiences. |
| Claude Code built-in browser (desktop Code tab) | Clean profile separate from your browser. Sign in inside the panel; Keep cookies can retain logins after quitting. | In-app Browser panel for local previews and external sites. | Claude Code desktop. |
| Claude Code + Claude in Chrome | Existing browser profile and signed-in sites. | Session-linked tab group. Background and multi-tab behavior depends on entry point and version. | Claude Code and other supported Claude entry points. |
| **BeatBrowser** | **Existing connected Chrome profile, without exporting cookies.** | **Separate task windows; progress, pause, takeover, stop and recovery.** | **Local MCP clients, CLI and JavaScript SDK.** |

Native access describes each browser integration, not whether its host can install other MCP servers. Claude Cowork's built-in browser is a different entry point; its import features should not be assumed to apply to the Code tab.

BeatBrowser provides one MIT-licensed browser toolkit across compatible agents. It includes 24 normal MCP tools, TaskSpaces with explicit connected-profile selection, editable local site notes and optional Fast JEV execution. Native integrations can also be useful when you prefer a vendor's setup, permissions and debugging workflow.

Official browser extensions support background and multi-tab work too. Login reuse, retained sessions and parallel browsing are not exclusive BeatBrowser capabilities. These are documentation and implementation comparisons, not a controlled performance benchmark.

## What the official sources establish

| Source | Verified scope |
| --- | --- |
| [Claude Code Chrome integration](https://code.claude.com/docs/en/chrome) | Shares browser login state; supports browser/coding workflows, site permissions, challenge handoff and GIF recording. Requires a direct Anthropic plan and supported sign-in; API-key and third-party-provider sessions have restrictions on the native Chrome integration. |
| [Claude Code desktop Browser](https://code.claude.com/docs/en/desktop#browse-external-sites) | Local previews, external browsing, in-panel sign-in, Keep cookies and a profile separate from the personal browser. |
| [OpenAI Browser](https://learn.chatgpt.com/docs/browser) | Desktop built-in browser has a separate profile; supports preview, annotations, rendered-page interaction and optional developer mode. Use the extension for regular browser context. |
| [OpenAI browser extension](https://learn.chatgpt.com/docs/chrome-extension) | ChatGPT Work/Codex desktop can operate supported regular browsers through the extension; website access is controlled in the product. |
| [Codex for Chrome changelog](https://learn.chatgpt.com/docs/changelog) | Background and parallel-tab work through the official extension. |
| [Claude in Chrome](https://support.claude.com/en/articles/12012173-get-started-with-claude-in-chrome) | Supported Claude entry points, background workflows and multi-tab functionality. |

Native integrations can be the better choice for someone staying in one host
and wanting the vendor's setup, approvals and debugging experience. BeatBrowser
is useful for a user who changes agents or wants to inspect/adapt a common
browser toolkit. Availability and permissions remain host- and account-dependent.

## Our limits

Separate task windows share their profile's website sessions; they are not cookie containers. Background work does not guarantee that popups or native browser behavior never take focus. Focusing a running task pauses subsequent automation, without undoing an action already in flight.

BeatBrowser does not ship a cloud browser, a turnkey store extension, isolated
concurrent writers, or a universal approval policy. TaskSpaces profile selection
and each Agent client's end-to-end compatibility have separate acceptance scopes. Some tools can write directly. Normal allowlisting covers only
URL-bearing commands. The loopback bridge is not cryptographically paired to its
extension and assumes a trusted local machine.

Fast JEV is optional, with narrower DOM/action support and explicit cloud consent.
The historical X timing smoke test in TEST_RESULTS.md is not a native-tool A/B
test. It must not appear as a speed win over Claude or Codex.

## Suggested public wording

> Your Chrome. Your choice of agent. BeatBrowser gives local MCP clients a common
> toolkit for your signed-in Chrome, with batched actions, editable site notes and
> a local audit trail.

Avoid: "Only BeatBrowser uses your logins", "Claude/Codex cannot do browser
tasks", "all operations stay on your machine", "automatic learning", or
"every sensitive operation is blocked".
