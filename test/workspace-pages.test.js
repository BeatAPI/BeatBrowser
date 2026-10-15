import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspacePages} from '../extension/workspace-pages.js';
function setup() {
 const tabs=new Map([
  [1,{id:1,windowId:10,groupId:7,url:'https://example.test/linked',title:'Linked page'}],
  [2,{id:2,windowId:10,groupId:-1,url:'https://example.test/human',title:'Human page'}],
  [3,{id:3,windowId:11,groupId:7,url:'https://example.test/task',title:'Task page'}],
  [4,{id:4,windowId:12,groupId:-1,url:'https://example.test/associated',title:'Associated page'}],
 ]);
 const calls=[],tasks=[{pages:[{tabId:3}]}];
 const chrome={tabs:{query:async()=>[...tabs.values()],remove:async id=>{calls.push(['remove',id]);tabs.delete(id);},update:async(id,p)=>calls.push(['tab',id,p])},
  tabGroups:{query:async()=>[{id:7,title:'BeatBrowser'}]},
  storage:{local:{get:async()=>({'ownTabs:a':[4,999]})}},windows:{update:async(id,p)=>calls.push(['window',id,p])}};
 const inventory=createWorkspacePages(chrome,{humanCommand:async()=>({spaces:tasks})});
 return {inventory,tabs,calls,tasks,chrome};
}
test('ordinary linked pages appear with no task while unrelated and task tabs stay separate',async()=>{
 const h=setup();const r=await h.inventory.list();assert.deepEqual(r.pages.map(p=>p.tabId),[1,4]);assert.equal(r.windows,2);
 h.tasks.length=0;assert.deepEqual((await h.inventory.list()).pages.map(p=>p.tabId),[1,3,4]);
});
test('view explicitly focuses only the selected linked page',async()=>{
 const h=setup();await h.inventory.command({action:'view',tabId:1});
 assert.deepEqual(h.calls,[['tab',1,{active:true}],['window',10,{focused:true}]]);
 await assert.rejects(h.inventory.command({action:'view',tabId:2}),/no longer/);
});
test('confirmed cleanup closes the captured linked pages and preserves human/task/new pages',async()=>{
 const h=setup(),{pages}=await h.inventory.list();
 await assert.rejects(h.inventory.command({action:'close',pages}),/Confirm/);
 h.tabs.set(5,{id:5,windowId:10,groupId:7,url:'https://example.test/new'});
 assert.deepEqual(await h.inventory.command({action:'close',pages,userConfirmed:true}),{closed:2,skipped:0,failed:0});
 assert.deepEqual([...h.tabs.keys()],[2,3,5]);
});
test('navigation, movement and task adoption invalidate an earlier close confirmation',async()=>{
 for(const change of [h=>h.tabs.get(1).url='https://example.test/new',h=>h.tabs.get(1).windowId=99,h=>h.tasks.push({pages:[{tabId:1}]})]) {
  const h=setup(),pages=(await h.inventory.list()).pages.filter(p=>p.tabId===1);change(h);
  assert.deepEqual(await h.inventory.command({action:'close',pages,userConfirmed:true}),{closed:0,skipped:1,failed:0});assert(h.tabs.has(1));
 }
});
test('duplicate IDs close once and a failed close remains retryable',async()=>{
 const h=setup(),{pages}=await h.inventory.list();h.chrome.tabs.remove=async()=>{throw Error('busy');};
 assert.deepEqual(await h.inventory.command({action:'close',pages:[pages[0],pages[0]],userConfirmed:true}),{closed:0,skipped:0,failed:1});
 assert(h.tabs.has(1));
});
