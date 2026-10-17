// [INPUT] Bilingual README tables and the reviewed capability data.
// [OUTPUT] Matching editable SVG comparison cards, or a stale-asset failure.
// [POS] README asset generator. [PROTOCOL] Local files only; no browser or network.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'docs/comparison-data.json')));
const check = process.argv.includes('--check');
const xml = value => value.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&apos;' }[c]));
function wrap(value, width, size) {
  const tokens = /[^\x00-\x7f]/.test(value) ? [...value] : value.split(/(\s+)/);
  const lines = []; let line = '';
  const length = text => [...text].reduce((n, c) => n + (/[^\x00-\x7f]/.test(c) ? size : size * .53), 0);
  for (const token of tokens) {
    if (line && length(line + token) > width) { lines.push(line.trim()); line = ''; }
    line += token;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}
function text(value, x, y, width, { size = 23, color = '#263247', weight = 400, centered = false, singleLine = false } = {}) {
  const lines = wrap(value, width, size);
  if (singleLine) assert.equal(lines.length, 1, `Shorten comparison label: ${value}`);
  const top = y - (lines.length - 1) * size * .65;
  return lines.map((line, i) => `<text x="${x}" y="${top + i * size * 1.3}" font-size="${size}" font-weight="${weight}" fill="${color}"${centered ? ' text-anchor="middle"' : ''}>${xml(line)}</text>`).join('');
}
function mark(yes, cx, cy, own) {
  const color = yes ? (own ? '#2463eb' : '#526176') : '#9ca7b5';
  return yes
    ? `<path d="M${cx-10} ${cy}l7 8 15-19" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    : `<path d="M${cx-8} ${cy-8}l16 16m0-16l-16 16" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
}
for (const [lang, filename] of [['en','README.md'], ['zh-CN','README.zh-CN.md']]) {
  const readme = fs.readFileSync(path.join(root, filename), 'utf8');
  const segment = readme.split('<!-- comparison-tables:start -->')[1]?.split('<!-- comparison-tables:end -->')[0];
  assert.ok(segment, `Missing comparison tables in ${filename}`);
  const tables = [...segment.matchAll(/(?:^\|.*\|\n?)+/gm)].map(match => match[0].trim().split('\n').map(row => row.split('|').slice(1,-1).map(s=>s.trim())));
  assert.equal(tables.length, data.groups.length);
  const localizedTitle = data.titles[lang];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1454" viewBox="0 0 1536 1454" role="img" aria-labelledby="title desc"><title id="title">${xml(localizedTitle)}</title><desc id="desc">${xml(tables.map(t=>t.map(r=>r.join(' | ')).join('; ')).join('; '))}</desc><rect width="1536" height="1454" rx="26" fill="#f7f9fc"/><g font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif">`;
  svg += text('BEATBROWSER', 54, 60, 1000, {size:20, color:'#2563eb', weight:700});
  svg += text(localizedTitle, 54, 118, 1420, {size:38, weight:700});
  svg += text(`2026-10-18  /  ${lang === 'en' ? 'Browser integration comparison' : 'BeatBrowser'}`, 55, 159, 1400, {size:18,color:'#66758c'});
  tables.forEach((rows, group) => {
    const expected = data.groups[group];
    assert.equal(rows.length, data.features.length + 2);
    assert.equal(rows[0].length, expected.length + 1);
    const top = 196 + group * 610, left = 48, featureWidth = 430, cellWidth = 202;
    svg += `<rect x="48" y="${top}" width="1440" height="578" rx="14" fill="white" stroke="#dce3ed"/><rect x="478" y="${top+1}" width="202" height="576" fill="#eaf1ff"/>`;
    rows[0].forEach((label, column) => {
      const x = column ? left + featureWidth + (column-.5)*cellWidth : left+24;
      svg += text(label, x, top+49, column ? cellWidth-20 : featureWidth-40, {size:20,weight:700,singleLine:true,centered:column>0,color:column===1?'#1748b0':'#263247'});
    });
    rows.slice(2).forEach((row,index) => {
      const y = top + 82 + index*70;
      assert.equal(row.length, expected.length+1);
      assert.equal(row[0], lang === 'en' ? data.features[index].label : data.features[index].labelZh, `${filename}: row ${index} label`);
      svg += `<path d="M48 ${y}H1488" stroke="#e8edf4"/>`;
      svg += text(row[0], left+24, y+42, featureWidth-40, {size:21,singleLine:true});
      row.slice(1).forEach((value,column) => {
        const expectedValue = data.products[expected[column]].values[index];
        assert.equal(value, expectedValue ? '\u2705' : '\u274e', `${filename}: row ${index}, column ${column}`);
        svg += mark(expectedValue, left+featureWidth+(column+.5)*cellWidth, y+35, column===0);
      });
    });
  });
  svg += text(data.footers[lang],54,1430,1430,{size:17,color:'#66758c'}) + '</g></svg>\n';
  const target = path.join(root, `media/readme-comparison.${lang}.svg`);
  if (check) assert.equal(fs.readFileSync(target,'utf8'),svg,`Regenerate ${path.relative(root,target)}`);
  else fs.writeFileSync(target,svg);
}
console.log(check ? 'Comparison tables and SVG assets agree.' : 'Rendered bilingual comparison SVG assets.');
