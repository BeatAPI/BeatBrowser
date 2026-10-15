# BeatBrowser 1.3.1

Your everyday Chrome, now a workspace for AI agents.

## What changed

- Background TaskSpaces in your existing signed-in Chrome profile, with named pages, progress, takeover, pause, resume and stop. MCP, CLI and the JavaScript SDK share one local bridge.
- Task recovery across extension reloads and browser restarts. Unfinished tasks restore paused; missing pages can be explicitly reassociated. No uncertain input is replayed.
- Single-task cleanup, batch cleanup and a Browser pages inventory for associated tabs, including retained legacy pages. User-associated, handed-over and moved pages are protected.
- A compact Chinese/English workspace, refreshed BeatAPI styling and local fonts. Language preferences stay on your device.
- Current-window focus checks, disconnected-page diagnostics, bounded screenshot failures and request evidence.
- Updated installation guides, project cover and package documentation. Matching CLI and extension downloads are attached below.

## Install or update

```sh
npm install --global @beatapi/beat-browser@1.3.1
beat-browser install --dry-run
beat-browser install
beat-browser extension
```

Version 1.3.1 is available on npm and GitHub. The matching `beat-browser-cli.tgz` archive is also attached to this release for direct installation.

Load the printed extension folder, or extract `beat-browser-extension.zip` into a permanent directory and load that folder in Chrome. Load only one copy per profile. The ZIP is the extension, not the local MCP server. SHA-256 files accompany both downloads.

For an update, finish active operations, reload the existing extension, restart the local bridge and reconnect Agent clients. Keep local extension storage so task records survive. Inspect recovered pages before continuing. Run `beat-browser doctor --json`; readiness requires both `ok` and `extensionOnline`.

## Verification and limits

The release workflow runs unit tests, syntax/security checks, clean package installation and extension packaging. Isolated real Chromium fixtures cover task recovery and workspace controls; they do not certify every Agent client or macOS foreground-focus behavior.

Task windows share the selected profile's logins. Native windows or website popups can still gain focus; minimized headed screenshots remain limited. This is an unpacked Chrome extension, not a Chrome Web Store listing. Normal mode needs no BeatBrowser account or key. Optional Fast JEV requires a BeatAPI key and explicit consent.

[Installation](https://github.com/BeatAPI/BeatBrowser/blob/main/docs/INSTALL.md) · [Workspace acceptance](https://github.com/BeatAPI/BeatBrowser/blob/main/docs/PREVIEW_TESTING.md) · [Task recovery](https://github.com/BeatAPI/BeatBrowser/blob/main/docs/TASKSPACES.md) · [Privacy](https://github.com/BeatAPI/BeatBrowser/blob/main/PRIVACY.md)
