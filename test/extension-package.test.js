// [INPUT] Release packer and repository extension sources in an isolated copy.
// [OUTPUT] Archive/version/notice/checksum release regressions.
// [POS] Extension distribution tests. [PROTOCOL] No Chrome, profile or uploads.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('extension release ZIP loads from its root and includes matching notices and checksums', () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'beatbrowser-extension-test-'));
  try {
    for (const name of ['extension', 'package.json', 'LICENSE', 'PRIVACY.md']) {
      fs.cpSync(path.join(root, name), path.join(temporary, name), { recursive: true });
    }
    fs.mkdirSync(path.join(temporary, 'scripts'));
    fs.copyFileSync(path.join(root, 'scripts/pack-extension.mjs'), path.join(temporary, 'scripts/pack-extension.mjs'));
    execFileSync(process.execPath, ['scripts/pack-extension.mjs'], { cwd: temporary });
    const version = JSON.parse(fs.readFileSync(path.join(temporary, 'package.json'), 'utf8')).version;
    const dist = path.join(temporary, 'dist');
    const zip = path.join(dist, 'beat-browser-extension.zip');
    const read = name => execFileSync('unzip', ['-p', zip, name], { encoding: 'utf8' });
    const manifest = JSON.parse(read('manifest.json'));
    assert.equal(manifest.version, version);
    assert.ok(!('key' in manifest));
    const members = new Set(execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).trim().split('\n'));
    for (const name of ['background.js', 'offscreen.html', 'offscreen.js', 'popup.html', 'popup.js', 'panel.html', 'workspace.css', 'content-transport.js', 'write-evidence.js', 'icons/icon128.png']) {
      assert.ok(members.has(name), `Missing runtime file: ${name}`);
    }
    for (const name of ['LICENSE', 'PRIVACY.md']) assert.equal(read(name), fs.readFileSync(path.join(root, name), 'utf8'));
    assert.deepEqual(fs.readFileSync(zip), fs.readFileSync(path.join(dist, `beat-browser-${version}.zip`)));
    for (const line of fs.readFileSync(path.join(dist, 'SHA256SUMS.txt'), 'utf8').trim().split('\n')) {
      const [digest, name] = line.split('  ');
      assert.equal(digest, createHash('sha256').update(fs.readFileSync(path.join(dist, name))).digest('hex'));
    }
    const changed = JSON.parse(fs.readFileSync(path.join(temporary, 'package.json'), 'utf8'));
    changed.version = '0.0.0';
    fs.writeFileSync(path.join(temporary, 'package.json'), JSON.stringify(changed));
    assert.throws(() => execFileSync(process.execPath, ['scripts/pack-extension.mjs'], { cwd: temporary, stdio: 'pipe' }), /versions must match/);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
});
