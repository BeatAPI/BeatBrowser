import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintPlaybooks, getLearnings } from '../src/lib/learnings.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CJK = new RegExp('[' + [[0x3000, 0x303f], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xff00, 0xffef]]
  .map(([a, b]) => String.fromCodePoint(a) + '-' + String.fromCodePoint(b)).join('') + ']');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|json|md|html)$/.test(e.name) && e.name !== 'package-lock.json') out.push(p);
  }
  return out;
}

test('agent-facing files remain English; bilingual UI text stays in its catalog and selector', () => {
  // Human-facing translated documentation is distinct from agent instructions.
  const localized = new Set(['README.zh-CN.md', 'extension/ui-language.js', 'extension/popup.html', 'extension/panel.html']);
  const bad = walk(ROOT).filter(f => {
    const relative = path.relative(ROOT, f);
    if (localized.has(relative)) return false;
    let text = fs.readFileSync(f, 'utf8');
    if (relative === 'README.md') text = text.replace('[\u7b80\u4f53\u4e2d\u6587](README.zh-CN.md)', '');
    return CJK.test(text);
  });
  assert.deepEqual(bad.map((f) => path.relative(ROOT, f)), []);
});

test('no user-visible message was blanked out during translation', () => {
  // Strings that once held text and were emptied: message: "", log(""), console.log(""), bad("", ...)
  const re = /(message:\s*|log\(|error\(|bad\(|Error\()(""|'')/;
  const hits = [];
  for (const f of walk(path.join(ROOT, 'src')).concat(walk(path.join(ROOT, 'extension')))) {
    if (!f.endsWith('.js')) continue;
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (re.test(line) && !/console\.log\(''\)/.test(line)) hits.push(`${path.relative(ROOT, f)}:${i + 1}`);
    });
  }
  assert.deepEqual(hits, []);
});

test('bundled learnings load and their act playbooks lint clean', () => {
  const md = fs.readFileSync(path.join(ROOT, 'docs', 'learnings', 'x.com.md'), 'utf8');
  assert.deepEqual(lintPlaybooks(md), []);
  assert.match(getLearnings('x.com'), /Reply publish recipe/);
  assert.match(getLearnings('x.com'), /Fast JEV operating notes/);
  assert.match(getLearnings('x.com'), /Never automatically retry a reply\/post click/);
  assert.match(getLearnings('twitter.com'), /Reply publish recipe/);
});
