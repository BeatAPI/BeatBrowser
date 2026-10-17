# Agent 接入目录

**让本地和云端 Agent 都能使用你已登录的 Chrome。** BeatBrowser 提供浏览器工具，
你选择的 Agent 负责推理。本目录整理产品分类、现有配置和后续适配对象，不是全部实测通过的名单。

[English directory](AGENT_DIRECTORY.md) · [本地安装](INSTALL.md) · [云端接入](REMOTE.zh-CN.md)

核对日期：**2026-10-18**。依据为各项链接的官方文档与项目的
[安装配置表](../src/agents.json)。不同版本的配置可能变化，同一品牌也可能同时提供本地和云端产品。

## 只有两种模式

| 模式 | Agent 工具在哪里执行 | BeatBrowser 接入方式 |
| --- | --- | --- |
| 本地 Agent | 你的电脑 | 本地 stdio MCP 服务与 Chrome 扩展 |
| 云端 Agent | 远程服务或电脑 | 自建认证隧道、可选远程适配层，再连接本地 Chrome |

CLI、IDE、桌面助手属于产品分类，不是额外的接入模式。
OpenClaw、Hermes 按部署位置选择其中一种模式。两种模式都使用你电脑上的 Chrome。

**发布状态**：本地模式已在 `1.3.2` 提供。云端模式目前是当前源码的预览功能，
已发布的 `1.3.2` 安装包尚未包含。

## 本地 CLI Agent

**已有安装配置**表示 `beat-browser install` 内有对应路径与写入逻辑，会检测已存在的配置文件，
不代表安装 Agent 本身，也不保证所有系统、所有版本的路径都相同。
先用 `beat-browser install --dry-run` 预览。**手动配置**表示按该客户端自己的 MCP 格式添加。
表内安装项以当前源码为准；使用 npm `1.3.2` 接入 WorkBuddy 时，请按
[安装指南的手动配置说明](INSTALL.md#manual-mcp-config)添加当前路径。

| Agent | BeatBrowser 配置情况 | 官方依据 |
| --- | --- | --- |
| Codex CLI | 已有安装配置：`codex`，本地 stdio MCP | [MCP](https://developers.openai.com/codex/mcp/) |
| Claude Code | 已有安装配置：`claude-code`，本地 stdio MCP | [MCP](https://code.claude.com/docs/en/mcp) |
| OpenCode | 已有安装配置：`opencode`，使用客户端的 `mcp` 格式 | [MCP servers](https://opencode.ai/docs/mcp-servers/) |
| Gemini CLI | 已有安装配置：`gemini` | [MCP 配置](https://geminicli.com/docs/tools/mcp-server/) |
| GitHub Copilot CLI | 手动配置，尚无专用安装项 | [添加 MCP 服务](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers) |
| Qwen Code | 已有安装配置：`qwen` | [MCP servers](https://qwenlm.github.io/qwen-code-docs/en/developers/tools/mcp-server/) |
| Kimi Code | 已有安装配置：`kimi-code`，具体路径需按当前版本核对 | [MCP 自定义](https://www.kimi.com/code/docs/en/kimi-code-cli/customization/mcp.html) |
| CodeBuddy | 已有安装配置：`codebuddy`，当前 CLI 路径仍需核对 | [插件与 MCP 配置](https://www.codebuddy.ai/docs/cli/plugins-reference) |
| Qoder CLI | 手动配置；当前 CLI 文档使用 `~/.qoder/settings.json`，与现有 `qoder` 安装项路径不同 | [CLI MCP 参考](https://docs.qoder.com/cli/mcp-reference) |

## 本地 IDE 与桌面助手

本表指这些产品的本地工具执行模式。同品牌的云端 Agent 版本见后面的云端表。

| Agent | BeatBrowser 配置情况 | 官方依据 |
| --- | --- | --- |
| Cursor IDE | 已有安装配置：`cursor`；Cursor CLI 也提供 MCP 配置 | [MCP](https://cursor.com/help/customization/mcp) |
| VS Code 的 GitHub Copilot | 手动配置；VS Code 使用 `servers` 格式，不能直接套用通用 `mcpServers` 示例 | [VS Code MCP](https://code.visualstudio.com/docs/agent-customization/mcp-servers) |
| Cline | 已有安装配置：`cline`；扩展存储路径受系统与版本影响 | [MCP 概览](https://docs.cline.bot/mcp/mcp-overview) |
| Roo Code | 已有安装配置：`roo`；扩展存储路径受系统与版本影响 | [使用 MCP](https://roocodeinc.github.io/Roo-Code/features/mcp/using-mcp-in-roo/) |
| Qoder IDE | 已有配置表项：`qoder`，IDE 配置路径需核对 | [Model Context Protocol](https://docs.qoder.com/user-guide/chat/model-context-protocol) |
| Windsurf / 旧版 Cascade | 有旧版 `windsurf` 安装项；新版 Devin 产品需单独配置 | [Cascade MCP 文档](https://docs.devin.ai/desktop/cascade/mcp) |
| WorkBuddy | 已有安装配置：`workbuddy`；优先使用 `~/.workbuddy/mcp.json`，兼容旧 `.mcp.json` 路径 | [WorkBuddy MCP 指南](https://www.codebuddy.ai/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/MCP-Guide) |
| Claude Desktop 本地 MCP | 已有安装配置：`claude-desktop`，使用本地 MCP 配置 | [本地 MCP 服务](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop) |
| Goose | 手动配置，尚无专用安装项 | [项目与文档](https://block.github.io/goose/index.html) |

## 可自行部署的 Agent

| Agent | 怎么选择模式 | 官方依据 |
| --- | --- | --- |
| OpenClaw | 在自己电脑运行时用本地 stdio；部署在服务器时用远程 HTTP。当前文档使用 `mcp.servers`，不能默认旧安装项路径仍然有效。 | [MCP](https://docs.openclaw.ai/tools/mcp) |
| Hermes Agent | 按部署位置手动配置本地命令，或远程 URL 与认证请求头 | [MCP 配置](https://hermes-agent.nousresearch.com/docs/reference/mcp-config-reference) |

两者在 README 的本地、云端示例中都会出现，模式由实际部署决定。
部署依据见 [OpenClaw 部署方式](https://docs.openclaw.ai/gateway/remote)与
[Hermes 本地及远程后端](https://hermes-agent.nousresearch.com/docs/user-guide/desktop)。
官方 MCP 接口已有文档依据，BeatBrowser 的客户端浏览器任务仍需实测验收。

## 云端 Agent 与连接器适配候选

远程接入要求客户端能发送所需凭证。产品提供远程 MCP，不代表认证、传输方式和工具策略都已与我们对接。
本表没有把任何客户端标记为已经完成端到端认证。

| Agent / 产品形态 | 已知情况与下一步 | 依据 |
| --- | --- | --- |
| Muse | 优先接入对象；确认具体部署的 MCP、HTTP 或 WebSocket 配置，再验收真实浏览器任务 | [BeatBrowser 云端教程](REMOTE.zh-CN.md) |
| Grok Bot | 优先接入对象；确认具体部署的 MCP、HTTP 或 WebSocket 配置，再验收真实浏览器任务 | [BeatBrowser 云端教程](REMOTE.zh-CN.md) |
| Claude 网页版自定义连接器 | 官方支持远程 MCP 与请求头，可配置 Bearer 凭证；待验证客户端配置与浏览器任务 | [自定义连接器](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp) |
| Cursor Cloud Agent | 官方支持 HTTP MCP 与加密请求头；使用 Streamable HTTP，不使用 SSE 或 `mcp-remote`；待客户端实测 | [云端 Agent 能力](https://cursor.com/docs/cloud-agent/capabilities) |
| GitHub Copilot 云端 Agent | 官方支持 HTTP MCP、请求头和密钥；需配置工具许可并实测。本项不涵盖 Copilot 代码评审。 | [配置 MCP](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/configure-mcp-servers) |
| ChatGPT 网页版 | 已提供远程 MCP 应用；与本适配层的认证方式、账号开放情况仍需验证 | [自定义 MCP 服务](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt) |
| Manus | 已提供自定义 MCP 连接器；接入前需验证传输方式与对外认证配置 | [连接器](https://www.manus.im/features/connectors) |
| Codex Cloud | 独立的云端执行产品；本地 Codex 支持 MCP 不能证明云端版本可接入，具体集成待研究 | [使用 Codex Cloud](https://help.openai.com/en/articles/20001545-using-codex-cloud) |

这里的 Muse、Grok Bot 指用户计划接入的具体部署，不代表同名产品或 xAI 标准 Grok 聊天界面都能使用相同配置。

## 自建 Agent 的开发框架

这些是构建 Agent 的开发框架。按程序实际执行位置选择本地或云端模式。

| 框架 | 文档提供的接入能力 | 官方依据 |
| --- | --- | --- |
| OpenAI Agents SDK | 本地 stdio 与远程 MCP 客户端；远程使用时需配置认证 | [MCP](https://openai.github.io/openai-agents-python/mcp/) |
| LangChain / LangGraph | stdio 与 HTTP MCP 适配器；远程凭证通过请求头传递 | [MCP 集成](https://docs.langchain.com/oss/python/langchain/mcp) |

## 需要重新核对的旧配置项

安装配置表还包含 **Lingma、MiniMax Mavis、Trae、Doubao、DeepSeek、iFlow**。
本次尚未确认这些名称对应的最新产品版本、路径与 MCP 格式，暂不作为已完成的适配宣传。
后续需核对客户端配置并完成浏览器任务；仅有模型厂商品牌名不能证明存在对应的 Agent 客户端。

## 怎么才算完成适配

1. 确认具体产品版本，以及工具进程在哪里执行。
2. 按该客户端的真实配置格式接入，保留原有工具。
3. 从该客户端发现 BeatBrowser 工具，而不只是本机 CLI 检查成功。
4. 列出已连接配置，创建无副作用的后台任务，读取标题，并在扩展工作区看到对应任务。
5. 记录客户端版本、系统、传输方式和结果；宣传具体登录网站的流程前，再验收对应网站任务。

当前源码预览有协议、运行时与模拟扩展测试，它们不代表本目录全部客户端或公网隧道已经验收。
本地模式提供 24 个普通工具，远程模式提供 21 个，差异见[云端教程](REMOTE.zh-CN.md#接口范围与验收边界)。
