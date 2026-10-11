#!/usr/bin/env node
// [INPUT] Extension sources, matching package version, license and privacy notice.
// [OUTPUT] Versioned and stable-name extension ZIPs with SHA-256 checksums.
// [POS] GitHub Release packaging. [PROTOCOL] No credentials, uploads or profile data.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
const metadata = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
if (metadata.version !== manifest.version) throw new Error('CLI and extension versions must match');
const dist = path.join(ROOT, 'dist');
const versionedName = `beat-browser-${manifest.version}.zip`;
const stableName = 'beat-browser-extension.zip';
const out = path.join(dist, versionedName);
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-pack-'));
try {
  fs.cpSync(SRC, stage, { recursive: true, filter: p => !/\.DS_Store$|\/content\/?$/.test(p) });
  const { key, ...clean } = manifest;
  fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(clean, null, 2) + '\n');
  for (const name of ['LICENSE', 'PRIVACY.md']) fs.copyFileSync(path.join(ROOT, name), path.join(stage, name));
  fs.mkdirSync(dist, { recursive: true });
  fs.rmSync(out, { force: true });
  execFileSync('zip', ['-qr', out, '.'], { cwd: stage });
  fs.copyFileSync(out, path.join(dist, stableName));
  const checksums = [versionedName, stableName].map(name => {
    const digest = createHash('sha256').update(fs.readFileSync(path.join(dist, name))).digest('hex');
    return `${digest}  ${name}`;
  }).join('\n') + '\n';
  fs.writeFileSync(path.join(dist, 'SHA256SUMS.txt'), checksums);
  console.log(`Extension ${manifest.version}: ${versionedName}, ${stableName}, SHA256SUMS.txt`);
  console.log(`Removed manifest.key${key ? '' : ' (absent)'}; included license and privacy notice.`);
  console.log('GitHub ZIP installation: extract into a permanent folder, then use chrome://extensions > Load unpacked.');
  console.log('The local CLI/MCP server is also required. Building these files does not publish a release or a Chrome Web Store listing.');
} finally {
  fs.rmSync(stage, { recursive: true, force: true });
}
