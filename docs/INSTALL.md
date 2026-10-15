# Install BeatBrowser

[Back to BeatBrowser](../README.md) · [Current-source setup](PREVIEW_TESTING.md)

This guide describes stable 1.2.2 installation. For background TaskSpaces and recovery, use the current-source guide above.

Requirements: Node.js 20+, Chrome 116+ and a client that can launch a local stdio MCP server. The extension is loaded unpacked; it is not listed on the Chrome Web Store.

### Download the Chrome extension

[**Download the latest extension ZIP**](https://github.com/BeatAPI/BeatBrowser/releases/latest/download/beat-browser-extension.zip) · [Release notes and SHA-256 checksums](https://github.com/BeatAPI/BeatBrowser/releases/latest)

1. Extract the ZIP into a permanent folder, such as `~/beat-browser-extension`. Keep that folder while the extension is installed.
2. Open `chrome://extensions` in the Chrome profile you want to use and enable **Developer mode**.
3. Click **Load unpacked** and select the extracted folder containing `manifest.json`. Chrome does not load the ZIP directly.
4. Install the matching local CLI/MCP server below, configure your agent and check the connection.

The ZIP contains the Chrome extension only. It needs the local BeatBrowser MCP server to connect your agent to Chrome. Normal mode needs no BeatBrowser account; your agent still needs its own model access. The ZIP and CLI should use the same version.

### Install the local CLI/MCP server

Install the exact matching CLI directly from this GitHub release:

```bash
npm install --global https://github.com/BeatAPI/BeatBrowser/releases/download/v1.2.2/beat-browser-cli.tgz
beat-browser install --dry-run
beat-browser install
```

This installs the local Node CLI and its public npm dependencies. It does not load the Chrome extension for you. The CLI archive and its checksum are also listed on the [release page](https://github.com/BeatAPI/BeatBrowser/releases/latest).

### npm registry alternative


Install the CLI from the official npm registry. Use the source path below when developing BeatBrowser.

Install globally so Chrome's extension folder stays at a stable path:

```bash
npm install --global @beatapi/beat-browser@1.2.2
beat-browser install --dry-run   # preview client config changes
beat-browser install             # apply; backs up each changed config
beat-browser extension           # print the extension folder
```

If you downloaded the extension ZIP, load its extracted folder. Otherwise load the folder printed by `beat-browser extension`; you do not need both copies.

Avoid loading an extension from a temporary `npx` cache. Keep the installation while Chrome uses its extension folder. After an update, reload the extension and restart your MCP client.

If this exact version is not yet available on npm, install from the matching source tag below. GitHub extension downloads and npm publication are separate release steps.

### From source

```bash
git clone --branch v1.2.2 https://github.com/BeatAPI/BeatBrowser.git
cd BeatBrowser
npm ci
node src/cli.js install --dry-run
node src/cli.js install
node src/cli.js extension
```

In a source checkout, substitute `node src/cli.js` wherever this README uses `beat-browser`. `npm link` is optional.

### Load the extension and verify

1. Open `chrome://extensions` in the profile you want the agent to use.
2. Enable **Developer mode**, choose **Load unpacked**, and select the extracted ZIP folder or the folder printed by `beat-browser extension`. Load one copy only.
3. Run `beat-browser doctor --json`. Ready means `"ok": true` and `"extensionOnline": true`.
4. Restart your MCP client. Ask it to list tabs, then run a small read-only task.

The MCP server starts the loopback bridge on demand. For an agent-led setup, use [AGENT_INSTALL.md](../AGENT_INSTALL.md). Auto-install targets are listed in [src/agents.json](../src/agents.json); detection requires an existing config file. An entry is a configuration adapter, not proof of an end-to-end test in every client.

### Manual MCP config

For JSON-based clients, point at a stable source or installed package path:

```json
{
  "mcpServers": {
    "beat-browser": {
      "command": "node",
      "args": ["/absolute/path/to/beat-browser/src/cli.js", "mcp"]
    }
  }
}
```

For Codex CLI, the equivalent in its TOML config is:

```toml
[mcp_servers.beat_browser]
command = "node"
args = ["/absolute/path/to/beat-browser/src/cli.js", "mcp"]
```
