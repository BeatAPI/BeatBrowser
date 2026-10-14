// Exercise the installed close listener with mixed session keys, not a mirrored cleanup implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../extension/background.js', import.meta.url), 'utf8');
const start = source.indexOf('chrome.tabs.onRemoved.addListener(async (tabId) => {');
const end = source.indexOf('\n});', start) + 4;

test('closing a tab cleans only its state and emits tab_closed even with unrelated session keys', async () => {
  let listener;
  const local = {activeTabId:7,'agentTab:a':7,'agentTab:b':8,'label:7':'task','registry:a':[7,8]};
  const session = {'seen:a:7':{},'seen:b:8':{},'frames:7':{},'beatTaskSpaces':{owned:true},unrelated:'keep'};
  const area = data => ({get:async()=>({...data}),remove:async keys=>keys.forEach(k=>delete data[k]),set:async values=>Object.assign(data,values)});
  const emitted = [], marks = [];
  const context = vm.createContext({
    chrome:{tabs:{onRemoved:{addListener(fn){listener=fn;}}},storage:{local:area(local),session:area(session)}},
    labelKey:id=>`label:${id}`,frameSnapKey:id=>`frames:${id}`,REG_PREFIX:'registry:',
    noteMarked:async(...args)=>marks.push(args),emit:(...args)=>emitted.push(args),
  });
  vm.runInContext(source.slice(start,end),context);
  await listener(7);
  assert.equal(local.activeTabId,undefined);assert.equal(local['agentTab:a'],undefined);
  assert.equal(local['agentTab:b'],8);assert.equal(local['label:7'],undefined);
  assert.deepEqual(Array.from(local['registry:a']),[8]);
  assert.deepEqual(Object.keys(session).sort(),['beatTaskSpaces','seen:b:8','unrelated']);
  assert.deepEqual(marks,[[7,false]]);
  assert.equal(emitted.length,1);assert.equal(emitted[0][0],'tab_closed');assert.equal(emitted[0][1].tabId,7);
});
