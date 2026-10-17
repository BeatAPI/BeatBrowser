# 让云端 Agent 操作你已登录的 Chrome

Agent 在云端，浏览器留在你的电脑。复用已有网站登录态，在扩展工作区查看、接管任务。
无需租用云浏览器，也不需要使用 BeatBrowser 提供的中转域名。

**可选预览**：`1.4.0` 的 npm 包和对应下载包均包含远程命令。远程访问默认关闭，需要主动配置；各云端客户端仍需分别做端到端验收。
下文使用源码命令演示；通过 npm 安装后，可将 `node src/cli.js` 换成 `beat-browser`。

[English guide](REMOTE.md) · [本地 Agent 安装](INSTALL.md) · [隐私说明](../PRIVACY.md)

## 先选择使用模式

| 模式 | Agent 在哪里 | 连接方式 | 需要配置什么 |
| --- | --- | --- | --- |
| 本地 Agent | 你的电脑 | 本地 MCP → 本地桥接 → Chrome | 本地工具与扩展，无需域名或隧道 |
| 云端 Agent | 远程服务或电脑 | 认证隧道 → 远程适配层 → 本地 MCP/桥接 → Chrome | 本地工具与扩展、独立凭证、自己的隧道 |

默认是本地模式。安装本地工具不会开启远程访问；两种模式可以共存。
不同 Agent 的凭证用于区分调用者，不隔离 Cookie、Chrome 配置或网站账号。

- **本地 Agent 示例：** Codex、Claude Code、WorkBuddy、OpenCode。
- **云端 Agent 示例：** Muse、Grok Bot。

完整[Agent 接入目录](AGENT_DIRECTORY.zh-CN.md)列出本地客户端、云端连接器候选与各自的配置情况。

云端客户端需要支持 Bearer 认证的 HTTP MCP、HTTP 调用或 WebSocket。
Muse、Grok Bot 是接入示例，具体入口和工具能力取决于版本；
无法访问外部接口的云端 Agent 仍需客户端侧适配。

## 1. 准备本地工具与 Chrome

把当前源码克隆到需要长期保留的目录：

```sh
git clone https://github.com/BeatAPI/BeatBrowser.git
cd BeatBrowser
npm ci
node src/cli.js extension
```

已有当前源码时直接使用，无需再装第二份。请使用 `1.4.0` 或更新版本；`v1.3.2` 不含远程适配层。

打开 Chrome 的 `chrome://extensions`，启用开发者模式，选择“加载已解压的扩展程序”，
加载命令输出的目录。保留目录，然后检查：

```sh
node src/cli.js doctor --json
```

确认 `ok: true` 和 `extensionOnline: true`。本地桥接按需启动。
仅使用云端模式时，无需配置本机编程 Agent 的 MCP。

## 2. 创建独立凭证，启动远程服务

```sh
node src/cli.js remote add grok
node src/cli.js remote add muse
node src/cli.js remote start
```

名称可以自定，只创建你需要的 Agent。凭证默认 90 天过期，`--days` 可设为 1 至 365。
命令只显示文件位置，不输出凭证原文。文件在 `~/.beat-browser/remote/`：
凭证记录只保存 SHA-256 摘要，用于配置客户端的原文则单独保存在私有文件中。

`remote start` 在后台监听 `127.0.0.1:18920`，不会注册登录自启；重启电脑后需重新运行。
保留源码目录。排查时可用 `remote serve` 在当前终端运行。

## 3. 配置自己的 Cloudflare 隧道

使用自己的 Cloudflare 账号与域名，在 **Networking → Tunnels** 创建隧道，
在运行 Chrome 的电脑上安装并运行 `cloudflared`。添加公开应用路由：

| 配置项 | 示例 |
| --- | --- |
| 公开域名 | `chrome.example.com`，替换成你自己的域名 |
| 服务类型 | HTTP |
| 本机服务地址 | `127.0.0.1:18920` |

如果启动时指定其他端口，填写 `remote start` 返回的端口。
**隧道转发认证适配层，不要直接指向原始桥接的 `18899` 端口。**

Cloudflare Tunnel 可使用免费计划；域名购买、续费以及 Agent/模型服务可能另行收费。
无需订阅 BeatBrowser 云浏览器。参考 [Cloudflare 官方教程](https://developers.cloudflare.com/tunnel/get-started/)。
如果域名启用了 Cloudflare Access，还需配置客户端可以发送的机器认证；不能只靠人工网页登录。

没有账号、域名，只想临时试用时，安装 `cloudflared` 后执行：

```sh
cloudflared tunnel --url http://127.0.0.1:18920
```

下一步使用它输出的临时 HTTPS 地址。临时隧道重建后地址会变，不保证持续在线，不支持 SSE；
本适配层的 HTTP MCP 使用 JSON 响应。长期使用建议固定隧道。
详见 [Quick Tunnels 限制](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/)。

## 4. 在云端 Agent 配置连接

替换为自己的隧道地址：

```sh
node src/cli.js remote config --client grok --url https://chrome.example.com
```

在本机打开生成的 `~/.beat-browser/remote/grok.connection.json`，将 URL 和 Authorization
请求头填入云端客户端受保护的远程 MCP 设置。Muse 使用 `--client muse` 单独生成。
不同客户端字段或格式可能不同，不保证所有客户端直接导入同一种 JSON。

公开示例只放占位符：

```json
{
  "url": "https://chrome.example.com/mcp",
  "headers": { "Authorization": "Bearer <这个 Agent 的独立凭证>" }
}
```

不要把真实凭证、连接文件放进 Git、公开截图或任务对话。
在 POSIX 系统中目录权限为 `0700`、私有文件为 `0600`，其他平台需核对系统访问权限。
整个配置流程不需要任何 BeatBrowser 专用域名。

## 5. 检查入口，再检查 Chrome

```sh
node src/cli.js remote check --client grok --url https://chrome.example.com
node src/cli.js remote check --client grok --url https://chrome.example.com --browser
```

第一条检查公开入口和认证；第二条还会读取已连接的 Chrome 配置列表，至少一个扩展在线才成功。
它不会打开网站，也不证明某个网站账号仍然处于登录状态。

然后在云端 Agent 中发送：

```text
使用 BeatBrowser，先列出已连接的 Chrome 配置；如果有多个，让我选择。
在 https://example.com 创建 TaskSpace，读取标题，汇报后暂停。
后续操作明确传入 spaceId 和 tabId。
```

在 Chrome 扩展“工作区”检查任务，确认后再给它已登录网站的具体任务。
连接不替代发送、发布、删除、付款等操作的授权。你的电脑需要保持唤醒、联网、用户已登录，
Chrome 与扩展在线；电脑关机后无法继续执行。

## 日常管理

```sh
node src/cli.js remote status
node src/cli.js remote clients
node src/cli.js remote rotate grok
node src/cli.js remote config --client grok --url https://chrome.example.com
node src/cli.js remote revoke muse
node src/cli.js remote stop
```

- `status` 只检查远程适配层，不检查 Chrome；健康检查和工具列表不会启动浏览器。
- `rotate` 使旧凭证失效，需重新生成并替换客户端连接配置；新凭证使用新的本地 MCP 会话。
- `revoke` 立即拒绝后续请求，已打开的 WebSocket、本地 MCP 连接会在五秒内检查并关闭。
  已到达网站的操作无法撤销；断线后先检查现场，不要直接重试提交。
- `stop` 停止远程适配层及其 MCP 子进程，普通本地桥接继续运行；Cloudflare 隧道单独管理。
- 多个 Agent 应使用不同 TaskSpace，并明确传入标签页，不依赖共享的“当前标签页”。
- 远程审计仅记录时间、客户端、工具名与状态，不记录请求正文或凭证；约 1 MiB 后保留一份旧日志。
  普通桥接、Agent 自身日志另见[隐私说明](../PRIVACY.md)。

## 常见连接问题

| 现象 | 先检查什么 |
| --- | --- |
| 找不到 `remote` 命令 | 升级至 `1.4.0` 或更新版本并重启 CLI/MCP 客户端，确认命令指向更新后的包。 |
| 本机远程适配层未运行 | 用同一系统用户在相同源码目录执行 `remote start`；启动失败时查看命令输出的日志位置。 |
| 隧道无法连接本机服务 | 检查 `remote status`，确认隧道目标端口一致，`cloudflared` 在运行 Chrome 的电脑上保持运行。 |
| 适配层返回 HTTP 401 | 检查该 Agent 的凭证、过期时间和撤销状态；轮换后重新生成并替换客户端配置。 |
| 返回 HTTP 403 或网页登录页 | 检查客户端是否带了 `Origin`，以及 Cloudflare Access 是否要求额外机器认证。 |
| 入口检查通过，`--browser` 失败 | 在本机运行 `doctor --json`，打开 Chrome 并重新连接扩展。 |
| 本机检查通过，云端 Agent 仍失败 | 检查客户端的 MCP 地址、Bearer 请求头和协议支持；本机检查不代表客户端配置已通过。 |

`remote config --url` 和 `remote check --url` 只填写根 HTTPS 地址，不带 `/mcp`。
生成的 MCP 配置会自动附加 `/mcp`，HTTP 调用使用 `/call`，不要重复拼接路径。
反馈问题时只提供脱敏状态或错误，不发送凭证、私有连接文件；不要通过重试不确定的提交来检查连通性。

## 接口、范围与验收边界

接口包括 `GET /health`、`GET /tools`、`POST /mcp`、`POST /call` 和 `WSS /bridge`。
HTTP 需要 Bearer 请求头；`/call` 正文示例：

```json
{"name":"spaces","arguments":{"action":"profiles"}}
```

WebSocket 格式见[英文接口说明](REMOTE.md#http-and-websocket-apis)。URL 查询参数和带 `Origin`
的请求会被拒绝；它是 Agent 接口，不是供任意网页直接调用的 API。公网连接使用 TLS。

远程模式提供 21 个普通浏览器工具，不开放本地文件 `upload` / `download`、本地保存的
`learnings`、`path` / `savePath` 参数、二进制 fetch 和可选 Fast JEV 执行器。截图可作为 MCP
图片返回。网页操作本身仍可能上传、下载或修改数据，这不是操作系统沙箱，也不隔离网站账号。

请求/消息上限 1 MiB，最多 64 个 TCP 连接；每个客户端每分钟最多 120 次请求，同时最多
4 次浏览器调用，全局同时最多 16 次。超出限制返回 HTTP 429 或 WebSocket `BUSY`。

自动化验证覆盖 HTTP MCP、HTTP 调用、WebSocket、凭证过期/轮换/撤销、私有文件、限制、
后台启停，以及通过真实本地 MCP/桥接连接模拟扩展的完整链路。尚未完成新版适配层在
Muse/Grok Bot 实际 UI、公开隧道、真实登录网站上的验收，也不保证 macOS 焦点行为或无人值守时长。

浏览器状态留在电脑上，但请求的页面内容、截图和结果会经过你的隧道，到达所选 Agent/模型提供方。
不要理解成所有数据始终只留在本地。
