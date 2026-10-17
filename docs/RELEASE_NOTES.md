# BeatBrowser 1.4.1

The npm package and matching extension downloads now include the current Agent setup and optional remote access tooling.

## What changed

- Correct the Agent directory and workspace guides to match the npm release, including WorkBuddy setup. This patch changes documentation and version metadata only; runtime behavior matches 1.4.0.

- Include an opt-in remote adapter for compatible cloud agents: dedicated credentials, expiry/revocation, authenticated HTTP/MCP/WebSocket and a user-managed tunnel. Local mode remains the default; installation opens no remote listener.
- Detect WorkBuddy's current `~/.workbuddy/mcp.json` path while preserving existing servers.
- Package the English/Chinese local/cloud guides, Agent directory and updated comparison visuals.
- Retain background TaskSpaces, identity-based recovery and cleanup from 1.3.2. The Chrome extension version matches the CLI; this release adds no new extension permissions.

## Install or update

```sh
npm install --global @beatapi/beat-browser@1.4.1
beat-browser install --dry-run
beat-browser install
beat-browser extension
```

Finish active operations, reload the existing extension from the printed folder, restart the bridge and reconnect agents. Keep extension storage to retain task records. Inspect recovered pages before continuing. BeatGEO users should update the bundled dependency through BeatGEO instead of installing a second copy.

## Validation and limits

Release checks cover unit tests, remote authentication and isolated mock-extension runtime, package contents, clean installation and MCP discovery. Remote tooling remains an opt-in preview: these checks do not certify each cloud client, public tunnel or signed-in website workflow. The extension behavior is unchanged apart from version metadata; no new real-browser acceptance is claimed by this release.

GitHub ZIP and CLI tarball downloads carry SHA-256 checksums. npm publication and GitHub assets are verified independently. This is an unpacked extension release, not a Chrome Web Store listing.
