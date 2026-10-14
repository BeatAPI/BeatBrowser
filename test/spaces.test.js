import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpaces} from '../extension/spaces.js';
function setup() {
  let data={},time=1000,nextTab=9; const calls=[],held=new Set(),tabs=new Map(),listeners={};
  const chrome={
    storage:{session:{get:async()=>structuredClone(data),set:async x=>{data=structuredClone({...data,...x})}}},
    windows:{create:async p=>{calls.push(['create',p]);tabs.set(8,{id:8,windowId:4});return{id:4,tabs:[{id:8}]};},update:async(id,p)=>calls.push(['window',id,p]),onFocusChanged:{addListener:fn=>listeners.focus=fn}},
    tabs:{get:async id=>tabs.get(id),update:async(id,p)=>{calls.push(['tab-update',id,p]);Object.assign(tabs.get(id),p);},create:async p=>{calls.push(['tab-create',p]);const tab={id:nextTab++,windowId:p.windowId};tabs.set(tab.id,tab);return tab;},remove:async id=>{calls.push(['tab-remove',id]);tabs.delete(id);},query:async p=>[...tabs.values()].filter(t=>t.windowId===p.windowId),onCreated:{addListener:fn=>listeners.created=fn},onRemoved:{addListener:fn=>listeners.remove=fn}},
    notifications:{create:async(id,p)=>{calls.push(['notification',id,p]);}},
    alarms:{create(){},onAlarm:{addListener:fn=>listeners.alarm=fn}}
  };
  const cdp={retainBackground:async id=>held.add(id),releaseBackground:async id=>{held.delete(id);calls.push(['release',id]);},backgroundHeld:id=>held.has(id)};
  const spaces=createSpaces(chrome,cdp,{now:()=>time,uuid:()=> 'space-one'});
  return{spaces,calls,held,tabs,listeners,advance:ms=>time+=ms};
}
const open=h=>h.spaces.command({action:'open',url:'https://example.test',label:'test'},'a');
test('owned task opens minimized without changing a human tab or adding account storage',async()=>{
 const h=setup(),s=await open(h);assert.equal(s.state,'running');
 assert.deepEqual(h.calls[0],['create',{url:'https://example.test',focused:false,state:'minimized',type:'normal'}]);
 await h.spaces.guard(8,'a');await assert.rejects(h.spaces.guard(8,'b'),/another session/);
 await assert.rejects(h.spaces.guard(8,'a',{mayFocus:true}),/handoff/);
});
test('human focusing task window stops the next action until explicit resume',async()=>{
 const h=setup();await open(h);h.listeners.focus(4);
 await assert.rejects(h.spaces.guard(8,'a'),/user/);assert.equal(h.held.size,0);
 await assert.rejects(h.spaces.command({action:'resume',spaceId:'space-one'},'a'),/userConfirmed/);
 await h.spaces.command({action:'resume',spaceId:'space-one',userConfirmed:true},'a');await h.spaces.guard(8,'a');
});
test('expiry and debugger detachment stop commands without automatic reattachment',async()=>{
 const h=setup();await open(h);h.advance(900001);await assert.rejects(h.spaces.guard(8,'a'),/expired/);
 const j=setup();await open(j);j.held.clear();await assert.rejects(j.spaces.guard(8,'a'),/detached/);assert.equal(j.held.size,0);
});
test('moving the page out of the task window hands ownership to user',async()=>{
 const h=setup();await open(h);h.tabs.get(8).windowId=99;await assert.rejects(h.spaces.guard(8,'a'),/moved/);
});

test('progress requiring confirmation pauses commands until the human resumes',async()=>{
 const h=setup();await open(h);
 await h.spaces.command({action:'report',spaceId:'space-one',message:'Draft prepared. Review before the next step.',needsConfirmation:true},'a');
 await assert.rejects(h.spaces.guard(8,'a'),/user/);
 const list=await h.spaces.humanCommand({action:'list'});
 assert.match(list.spaces[0].progress,/Draft prepared/);
 await h.spaces.humanCommand({action:'resume',spaceId:'space-one'});
 await h.spaces.guard(8,'a');
});
test('finish releases rendering but preserves evidence tabs; stop cannot resume',async()=>{
 const h=setup();await open(h);await h.spaces.command({action:'finish',spaceId:'space-one'},'a');assert(h.tabs.has(8));assert.equal(h.held.size,0);
 const j=setup();await open(j);await j.spaces.command({action:'stop',spaceId:'space-one'},'a');
 await j.spaces.humanCommand({action:'handoff',spaceId:'space-one'});
 await assert.rejects(j.spaces.command({action:'resume',spaceId:'space-one',userConfirmed:true},'a'),/cannot resume/);
});

test('named pages stay in one task window and selective finish retains user pages',async()=>{
 const h=setup();await open(h);
 const state=await h.spaces.command({action:'new-page',spaceId:'space-one',pageLabel:'research',url:'https://example.test/research'},'a');
 assert.equal(state.pages.length,2);assert.equal(state.pages[1].label,'research');
 assert.deepEqual(h.calls.find(c=>c[0]==='tab-create')[1],{windowId:4,url:'https://example.test/research',active:false});
 await h.spaces.guard(9,'a');await assert.rejects(h.spaces.guard(9,'other'),/another session/);
 h.tabs.set(90,{id:90,windowId:4});
 await assert.rejects(h.spaces.command({action:'adopt',spaceId:'space-one',tabId:90,pageLabel:'human'},'a'),/authorization/);
 await h.spaces.command({action:'adopt',spaceId:'space-one',tabId:90,pageLabel:'human',userConfirmed:true},'a');
 const end=await h.spaces.command({action:'finish',spaceId:'space-one',keep:['research']},'a');
 assert.deepEqual(end.receipt.closed,['main']);assert.deepEqual(end.receipt.retained,['research','human']);
 assert(h.tabs.has(90));assert(h.tabs.has(9));assert(!h.tabs.has(8));
});

test('release preserves the tab, moved pages cannot be closed, and page labels are unique',async()=>{
 const h=setup();await open(h);
 await assert.rejects(h.spaces.command({action:'new-page',spaceId:'space-one',pageLabel:'main',url:'https://example.test'},'a'),/already in use/);
 h.tabs.get(8).windowId=99;
 await assert.rejects(h.spaces.command({action:'close-page',spaceId:'space-one',pageLabel:'main'},'a'),/Moved pages/);
 const r=await h.spaces.command({action:'release-page',spaceId:'space-one',pageLabel:'main'},'a');
 assert.equal(r.pages.length,0);assert(h.tabs.has(8));assert.equal(h.held.size,0);
});

test('human takeover releases every page and explicit resume reacquires them',async()=>{
 const h=setup();await open(h);
 await h.spaces.command({action:'new-page',spaceId:'space-one',pageLabel:'second',url:'https://example.test'},'a');
 h.listeners.focus(4);await assert.rejects(h.spaces.guard(9,'a'),/user/);assert.equal(h.held.size,0);
 await h.spaces.humanCommand({action:'resume',spaceId:'space-one'});assert.equal(h.held.size,2);
});

test('progress notifications are opt-in and unchanged progress stays quiet',async()=>{
 const h=setup();await open(h);
 await h.spaces.command({action:'report',spaceId:'space-one',message:'Page read'},'a');
 h.advance(300001);h.listeners.alarm({name:'beat-space-leases'});await h.spaces.command({action:'status',spaceId:'space-one'},'a');
 assert.equal(h.calls.filter(c=>c[0]==='notification').length,0);
 await h.spaces.humanCommand({action:'notifications',spaceId:'space-one',notifications:true});
 h.listeners.alarm({name:'beat-space-leases'});await h.spaces.command({action:'status',spaceId:'space-one'},'a');
 assert.equal(h.calls.filter(c=>c[0]==='notification').length,1);
 h.advance(300001);h.listeners.alarm({name:'beat-space-leases'});await h.spaces.command({action:'status',spaceId:'space-one'},'a');
 assert.equal(h.calls.filter(c=>c[0]==='notification').length,1);
});

test('popup events are bounded and a foreign popup pauses without moving it',async()=>{
 const h=setup();await open(h);
 h.listeners.created({id:90,openerTabId:8,windowId:99});
 const result=await h.spaces.command({action:'events',spaceId:'space-one',after:0},'a');
 assert.equal(result.state,'user');assert(result.events.some(e=>e.type==='popup'&&e.tabId===90));
 assert.equal(result.pages.length,1);assert.equal(h.held.size,0);
});

test('human sidebar can inspect history and hand off a named page without resuming',async()=>{
 const h=setup();await open(h);
 await h.spaces.command({action:'new-page',spaceId:'space-one',pageLabel:'reference',url:'https://example.test'},'a');
 const history=await h.spaces.humanCommand({action:'events',spaceId:'space-one',after:0});
 assert(history.events.some(e=>e.type==='page-added'));
 await h.spaces.humanCommand({action:'handoff',spaceId:'space-one',pageLabel:'reference'});
 assert.deepEqual(h.calls.find(c=>c[0]==='tab-update'),['tab-update',9,{active:true}]);
 await assert.rejects(h.spaces.guard(9,'a'),/user/);
 assert.equal(h.held.size,0);
});
