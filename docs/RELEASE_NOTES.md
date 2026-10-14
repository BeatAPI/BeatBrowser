# BeatBrowser 1.3.1 source preview

Agents can open owned background task windows in the user's existing Chrome profile, report progress and hand control back through a compact Chinese/English workspace. MCP, CLI and the JavaScript SDK use the same local bridge.

- Add named task pages, explicit profile selection, pause/resume/stop and retained-page completion receipts.
- Add a light workspace, inline language switch and shared control/confirmation copy; language preference stays local.
- Check current window state before treating queued focus events as takeover. Focused windows still pause execution; native no-interruption acceptance remains incomplete.
- Diagnose disconnected/frozen pages, preserve request evidence and avoid replaying uncertain writes.
- Validate 249 tests, isolated package installation, extension packaging and headless browser/UI flows. Daily Chrome opened Xiaohongshu with existing login and displayed the updated extension UI.

This is a source update. Existing GitHub/npm release downloads remain the previously published version until a separate release is made. Minimized headed screenshots and fully invisible native execution remain limitations. Read [preview setup](PREVIEW_TESTING.md) and [test evidence](../TEST_RESULTS.md).

---

# BeatBrowser 1.2.2

Your Chrome. Your choice of agent.

- Direct Chrome extension ZIP and matching local CLI downloads from GitHub, including a stable latest-download URL and SHA-256 checksums.
- Clear instructions for ZIP extraction, Chrome's Load unpacked control, local MCP setup and updates.
- Extension archives include the MIT license and privacy notice; the public manifest key is removed from the archive.
- Matching CLI/extension versions, archive regression checks and npm 10/11/12 package-check compatibility.
- Updated BeatBrowser brand mark and X draft playbooks that hand the final Reply click to the user.

## Install

Download `beat-browser-extension.zip` below and extract it into a permanent folder. Open `chrome://extensions`, enable Developer mode and choose Load unpacked. Select the extracted folder containing `manifest.json`.

The extension alone is not enough. Install the matching local CLI/MCP server:

```bash
npm install --global https://github.com/BeatAPI/beat-browser/releases/download/v1.2.2/beat-browser-cli.tgz
beat-browser install --dry-run
beat-browser install
```

The CLI download has a separate `CLI-SHA256SUMS.txt` checksum. npm registry publication is a separate step; the GitHub CLI download works even while that publication is pending. You can also install from the matching source tag:

```bash
git clone --branch v1.2.2 https://github.com/BeatAPI/beat-browser.git
cd beat-browser
npm ci
node src/cli.js install --dry-run
node src/cli.js install
```

Load only one copy of the extension, restart your MCP client and run `beat-browser doctor --json` (or `node src/cli.js doctor --json` from source). Setup is ready when `ok` and `extensionOnline` are true.

Check the ZIP against `SHA256SUMS.txt` if desired. This is an unpacked extension download, not a Chrome Web Store listing. Normal mode needs no BeatBrowser account or key; Fast JEV is optional and requires a BeatAPI key and explicit cloud consent. Connect trusted agents; tool results reach your chosen agent/provider.

For updates, keep a permanent extension folder, replace its files with the matching release, reload it in Chrome and restart your agent.
