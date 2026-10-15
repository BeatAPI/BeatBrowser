# BeatBrowser 1.3.2

Tasks stay in the extension workspace without adding Chrome tab groups.

## What changed

- Neither ordinary agent pages nor background TaskSpaces create native tab groups. View, take over, continue, stop and clear tasks from the popup or sidebar.
- Reload recovery uses Chrome page identities plus URL fingerprints. A full browser restart preserves task records and progress; explicitly reconnect pages before continuing. Matching URLs alone never transfer control.
- Existing v1 task groups migrate conservatively and are ungrouped after their page identity is saved. Renamed groups, moved pages and user-associated pages remain protected.
- Cleanup ungroups recognized legacy pages before closing them. Page-list failures offer Retry or an extension reload hint; empty inventories hide the unused close button.

## Install or update

```sh
npm install --global @beatapi/beat-browser@1.3.2
beat-browser install --dry-run
beat-browser install
beat-browser extension
```

Load the printed extension folder, or extract the matching GitHub extension ZIP into a permanent directory. Finish active operations, reload the existing extension, restart the bridge and reconnect agents. Keep extension storage to retain task records. Inspect recovered pages before continuing.

The release includes matching extension ZIP and CLI tarball downloads, with SHA-256 checksums. npm publication and GitHub assets are verified separately.

## Validation and limits

Unit tests, clean package installation, isolated real Chromium task/UI checks and extension-reload/browser-restart recovery checks cover this release. Full browser restart intentionally requires explicit page reassociation. These checks do not establish macOS native focus behavior or every agent client's compatibility. Previously saved, already closed Chrome groups may need removal in Chrome itself.
