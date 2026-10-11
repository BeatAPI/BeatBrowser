# BeatBrowser 1.2.2

Your Chrome. Your choice of agent.

- Direct Chrome extension ZIP downloads from GitHub, including a stable latest-download URL and SHA-256 checksums.
- Clear instructions for ZIP extraction, Chrome's Load unpacked control, local MCP setup and updates.
- Extension archives include the MIT license and privacy notice; the public manifest key is removed from the archive.
- Matching CLI/extension versions, archive regression checks and npm 10/11/12 package-check compatibility.
- Updated BeatBrowser brand mark and X draft playbooks that hand the final Reply click to the user.

## Install

Download `beat-browser-extension.zip` below and extract it into a permanent folder. Open `chrome://extensions`, enable Developer mode and choose Load unpacked. Select the extracted folder containing `manifest.json`.

The extension alone is not enough. Install the matching local CLI/MCP server:

```bash
npm install --global @beatapi/beat-browser@1.2.2
beat-browser install --dry-run
beat-browser install
```

If npm 1.2.2 is not yet available, use the matching source tag:

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
