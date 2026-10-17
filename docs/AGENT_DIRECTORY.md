# Agent directory

**Your Chrome, for local and cloud agents.** BeatBrowser supplies browser tools;
your chosen agent supplies the reasoning. This directory maps the ecosystem and
the work needed to connect each client. It is not an end-to-end certification list.

[Chinese directory](AGENT_DIRECTORY.zh-CN.md) · [Local setup](INSTALL.md) · [Cloud setup](REMOTE.md)

Reviewed **2026-10-18** against the linked first-party documentation and
[installer catalog](../src/agents.json). Client editions and configuration formats
can change. A product name alone does not identify where its tools execute.

## Two modes

| Mode | Where the agent tools run | BeatBrowser connection |
| --- | --- | --- |
| Local Agent | Your computer | Local stdio MCP server and Chrome extension |
| Cloud Agent | A remote service or computer | Your authenticated tunnel and optional remote adapter, then local Chrome |

CLI, IDE and desktop are product categories within Local Agent mode, not extra
connection modes. OpenClaw and Hermes belong to either mode according to where
you deploy them. Both modes use Chrome on your computer.

**Release status:** the current npm package and release downloads include local mode and the optional cloud adapter. Cloud mode remains an opt-in preview, disabled by default.

## Local CLI agents

An **installer entry** means `beat-browser install` knows a configuration path and
writer. It detects existing files; it does not install the agent or guarantee the
current configuration on every OS. Preview with `beat-browser install --dry-run`.
**Manual** means configure the client's local MCP server using its own schema.
The current installer detects WorkBuddy’s `~/.workbuddy/mcp.json`. See the
[manual configuration note](INSTALL.md#manual-mcp-config) if automatic detection is unavailable.

| Agent | BeatBrowser configuration | First-party reference |
| --- | --- | --- |
| Codex CLI | Installer entry: `codex`; local stdio MCP | [MCP](https://developers.openai.com/codex/mcp/) |
| Claude Code | Installer entry: `claude-code`; local stdio MCP | [MCP](https://code.claude.com/docs/en/mcp) |
| OpenCode | Installer entry: `opencode`; uses the client's `mcp` schema | [MCP servers](https://opencode.ai/docs/mcp-servers/) |
| Gemini CLI | Installer entry: `gemini` | [MCP server configuration](https://geminicli.com/docs/tools/mcp-server/) |
| GitHub Copilot CLI | Manual; no dedicated installer entry | [Add MCP servers](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) |
| Qwen Code | Installer entry: `qwen` | [MCP servers](https://qwenlm.github.io/qwen-code-docs/en/developers/tools/mcp-server/) |
| Kimi Code | Installer entry: `kimi-code`; recheck the current path against the client | [MCP customization](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/mcp.html) |
| CodeBuddy | Installer entry: `codebuddy`; recheck the current CLI config location | [Plugin and MCP reference](https://www.codebuddy.ai/docs/cli/plugins-reference) |
| Qoder CLI | Manual; current CLI docs use `~/.qoder/settings.json`; the catalog's `qoder` path is different | [CLI MCP reference](https://docs.qoder.com/cli/mcp-reference) |

## Local IDE and desktop agents

Use the local tool-execution mode of each product. A cloud-agent edition of the
same brand belongs in the cloud section below.

| Agent | BeatBrowser configuration | First-party reference |
| --- | --- | --- |
| Cursor IDE | Installer entry: `cursor`; Cursor CLI also documents MCP | [MCP](https://cursor.com/help/customization/mcp) |
| VS Code with GitHub Copilot | Manual; VS Code uses a `servers` configuration, not the generic `mcpServers` example | [MCP servers in VS Code](https://code.visualstudio.com/docs/agent-customization/mcp-servers) |
| Cline | Installer entry: `cline`; extension storage paths vary by platform/version | [MCP overview](https://docs.cline.bot/mcp/mcp-overview) |
| Roo Code | Installer entry: `roo`; extension storage paths vary by platform/version | [Using MCP](https://roocodeinc.github.io/Roo-Code/features/mcp/using-mcp-in-roo/) |
| Qoder IDE | Catalog entry: `qoder`; verify the IDE configuration location | [Model Context Protocol](https://docs.qoder.com/user-guide/chat/model-context-protocol) |
| Windsurf / legacy Cascade | Legacy installer entry: `windsurf`; newer Devin editions need their own configuration | [Cascade MCP documentation](https://docs.devin.ai/desktop/cascade/mcp) |
| WorkBuddy | Installer entry: `workbuddy`; prefer `~/.workbuddy/mcp.json`, retain `.mcp.json` as a legacy fallback | [WorkBuddy MCP guide](https://www.codebuddy.ai/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/MCP-Guide) |
| Claude Desktop, local MCP | Installer entry: `claude-desktop`; use the local MCP configuration | [Local MCP servers](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop) |
| Goose | Manual; no dedicated installer entry | [Project and documentation](https://block.github.io/goose/index.html) |

## Agents you can deploy locally or on a server

| Agent | Connection choice | First-party reference |
| --- | --- | --- |
| OpenClaw | Local stdio when on your computer; remote HTTP when on a server. Current docs describe `mcp.servers`; do not assume the legacy catalog path is current. | [MCP](https://docs.openclaw.ai/tools/mcp) |
| Hermes Agent | Manual local command configuration or remote URL and headers, depending on deployment | [MCP configuration](https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference) |

The README lists their cloud deployments as examples; a local deployment uses
Local Agent mode instead. See [OpenClaw deployment options](https://docs.openclaw.ai/gateway/remote)
and [Hermes local and remote backends](https://hermes-agent.nousresearch.com/docs/user-guide/desktop).
Their MCP interfaces are documented; BeatBrowser client-level browser tasks
remain to be verified.

## Cloud agents and connector candidates

Cloud mode needs a client that can send the required credential. A remote MCP
feature alone does not prove that its authentication, transport or tool policy
matches BeatBrowser. No client in this table is marked end-to-end certified by
this directory.

| Agent / surface | Current evidence and next step | Reference |
| --- | --- | --- |
| Muse | Priority deployment target. Confirm that deployment's MCP/HTTP/WebSocket settings, then test a real browser task. | [BeatBrowser cloud setup](REMOTE.md) |
| Grok Bot | Priority deployment target. Confirm that deployment's MCP/HTTP/WebSocket settings, then test a real browser task. | [BeatBrowser cloud setup](REMOTE.md) |
| Claude web custom connectors | Documents remote MCP with request headers, including Bearer credentials; candidate for a client configuration and browser task test | [Custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) |
| Cursor Cloud Agent | Documents HTTP MCP and encrypted headers; use Streamable HTTP, not SSE or `mcp-remote`; client test pending | [Cloud agent capabilities](https://cursor.com/docs/cloud-agent/capabilities) |
| GitHub Copilot cloud agent | Documents HTTP MCP and headers/secrets; configure allowed tools and test a task. This row does not cover Copilot code review. | [Configure MCP servers](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers) |
| ChatGPT web | Remote MCP apps exist; authentication and account availability need validation for this adapter | [Custom MCP servers](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt) |
| Manus | Custom MCP connectors exist; validate transport and outgoing authentication before claiming compatibility | [Connectors](https://www.manus.im/features/connectors) |
| Codex Cloud | Separate cloud execution surface; local Codex MCP support does not establish cloud compatibility. Integration research pending. | [Using Codex Cloud](https://help.openai.com/en/articles/20001545-using-codex-cloud) |

Muse and Grok Bot identify the user's deployment targets here. They do not imply
that every product with a similar name, or xAI's standard Grok chat, accepts the
same connection configuration.

## Build your own agent

These are development frameworks rather than ready-made agent products. Choose
local or cloud mode according to where your program executes.

| Framework | Documented integration surface | First-party reference |
| --- | --- | --- |
| OpenAI Agents SDK | Local stdio and remote MCP clients; configure the remote client's authentication | [MCP](https://openai.github.io/openai-agents-python/mcp/) |
| LangChain / LangGraph | MCP adapters for stdio and HTTP; pass the remote credential through headers | [MCP integration](https://docs.langchain.com/oss/python/langchain/mcp) |

## Older catalog entries to recheck

The installer also contains entries named **Lingma, MiniMax Mavis, Trae, Doubao,
DeepSeek and iFlow**. Their current product editions, paths and MCP configuration
were not established in this review. Keep these separate from advertised
integrations until their client configuration and a browser task have been
verified. A model provider name, by itself, is not an agent client.

## What counts as a verified integration

1. Confirm the product edition and where its tool process runs.
2. Configure the client using its actual schema; preserve existing tools.
3. Discover BeatBrowser tools from that client, not only from the local CLI.
4. List connected profiles, open a harmless background task, read its title and
   inspect the task in the extension Workspace.
5. Record the client version, OS, transport and result. Test a signed-in site
   separately before advertising a specific website workflow.

The optional remote adapter has protocol/runtime and synthetic-extension tests.
Those do not certify every client in this directory or a public tunnel. Local
mode exposes 24 normal tools; remote mode exposes 21, with the differences
documented in [Cloud setup](REMOTE.md#scope-and-validation).
