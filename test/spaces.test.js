import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpaces} from '../extension/spaces.js';
function setup() {
  let data={},time=1000,nextTab=9; const calls=[],held=new Set(),tabs=new Map(),listeners={},windowState={id:4,state:"minimized",focused:false};
  const chrome={
    storage:{session:{get:async()=>structuredClone(data),set:async x=>{data=structuredClone({...data,...x})}}},
    windows:{get:async()=>({...windowState}),create:async p=>{calls.push(['create',p]);tabs.set(8,{id:8,windowId:4});return{id:4,tabs:[{id:8}]};},update:async(id,p)=>{calls.push(['window',id,p]);Object.assign(windowState,p);if(p.state==='minimized')windowState.focused=false;},onFocusChanged:{addListener:fn=>listeners.focus=fn}},
    tabs:{get:async id=>tabs.get(id),update:async(id,p)=>{calls.push(['tab-update',id,p]);Object.assign(tabs.get(id),p);},create:async p=>{calls.push(['tab-create',p]);const tab={id:nextTab++,windowId:p.windowId};tabs.set(tab.id,tab);return tab;},remove:async id=>{calls.push(['tab-remove',id]);tabs.delete(id);},query:async p=>[...tabs.values()].filter(t=>t.windowId===p.windowId),onCreated:{addListener:fn=>listeners.created=fn},onRemoved:{addListener:fn=>listeners.remove=fn}},
    notifications:{create:async(id,p)=>{calls.push(['notification',id,p]);}},
    alarms:{create(){},onAlarm:{addListener:fn=>listeners.alarm=fn}}
  };
  const cdp={retainBackground:async id=>held.add(id),releaseBackground:async id=>{held.delete(id);calls.push(['release',id]);},backgroundHeld:id=>held.has(id)};
  const spaces=createSpaces(chrome,cdp,{now:()=>time,uuid:()=> 'space-one'});
  return{spaces,calls,held,tabs,listeners,windowState,chrome,advance:ms=>time+=ms};
}
const open=h=>h.spaces.command({action:'open',url:'https://example.test',label:'test'},'a');
test('owned task opens minimized without changing a human tab or adding account storage',async()=>{
 const h=setup(),s=await open(h);assert.equal(s.state,'running');
 assert.deepEqual(h.calls[0],['create',{url:'https://example.test',state:'minimized',type:'normal'}]);
 await h.spaces.guard(8,'a');await assert.rejects(h.spaces.guard(8,'b'),/another session/);
 await assert.rejects(h.spaces.guard(8,'a',{mayFocus:true}),/handoff/);
});
test('human focusing task window stops the next action until explicit resume',async()=>{
 const h=setup();await open(h);Object.assign(h.windowState,{state:'normal',focused:true});h.listeners.focus(4);
 await assert.rejects(h.spaces.guard(8,'a'),/user/);assert.equal(h.held.size,0);
 assert.equal((await h.spaces.command({action:'status',spaceId:'space-one'},'a')).pauseReason,'window-focused');
 await assert.rejects(h.spaces.command({action:'resume',spaceId:'space-one'},'a'),/userConfirmed/);
 await h.spaces.command({action:'resume',spaceId:'space-one',userConfirmed:true},'a');await h.spaces.guard(8,'a');
 assert(h.calls.filter(c=>c[0]==='window').every(c=>c[2].state==='minimized' && !('focused' in c[2])));
 assert.equal((await h.spaces.command({action:'status',spaceId:'space-one'},'a')).pauseReason,null);
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
 assert.match(list.spaces[0].progress,/Draft prepared/);assert.equal(list.spaces[0].pauseReason,'review-requested');
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
 Object.assign(h.windowState,{state:'normal',focused:true});h.listeners.focus(4);await assert.rejects(h.spaces.guard(9,'a'),/user/);assert.equal(h.held.size,0);
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


test('queued focus events for an already minimized or unfocused task do not pause it',async()=>{
 const h=setup();await open(h);h.listeners.focus(4);await h.spaces.guard(8,'a');
 assert.equal(h.held.size,1);
 Object.assign(h.windowState,{state:'normal',focused:false});h.listeners.focus(4);
 await h.spaces.guard(8,'a');
 assert.equal((await h.spaces.command({action:'status',spaceId:'space-one'},'a')).state,'running');
});
test('unknown focus state remains a conservative pause',async()=>{
 const h=setup();await open(h);h.chrome.windows.get=async()=>{throw Error('Window unavailable');};
 h.listeners.focus(4);await assert.rejects(h.spaces.guard(8,'a'),/user/);
 assert.equal(h.held.size,0);
});


test('human cleanup closes ended agent pages and removes stale cards',async()=>{
 const h=setup();await open(h);await h.spaces.command({action:'finish',spaceId:'space-one'},'a');
 assert.deepEqual(await h.spaces.humanCommand({action:'cleanup',spaceId:'space-one'}),{removed:1,closed:1,kept:0,failed:0});
 assert.equal(h.tabs.has(8),false);assert.deepEqual(await h.spaces.humanCommand({action:'list'}),{spaces:[]});
 assert.deepEqual(await h.spaces.humanCommand({action:'cleanup',spaceId:'space-one'}),{removed:0,closed:0,kept:0,failed:0});
});
test('bulk ended cleanup leaves running and paused tasks untouched',async()=>{
 const h=setup();await open(h);
 assert.equal((await h.spaces.humanCommand({action:'cleanup-ended'})).removed,0);
 await h.spaces.command({action:'report',spaceId:'space-one',needsConfirmation:true},'a');
 assert.equal((await h.spaces.humanCommand({action:'cleanup-ended'})).removed,0);
 await assert.rejects(h.spaces.humanCommand({action:'cleanup',spaceId:'space-one'}),/Stop/);
 await assert.rejects(h.spaces.humanCommand({action:'cleanup-all'}),/Confirm/);
 assert(h.tabs.has(8));assert.equal(h.calls.filter(c=>c[0]==='tab-remove').length,0);
 const result=await h.spaces.humanCommand({action:'cleanup-all',userConfirmed:true});
 assert.equal(result.closed,1);assert.equal(h.held.size,0);
});
test('cleanup preserves user, moved, handed-off and unmanaged tabs',async()=>{
 const h=setup();await open(h);
 await h.spaces.command({action:'new-page',spaceId:'space-one',pageLabel:'moved',url:'https://example.test'},'a');
 h.tabs.get(9).windowId=99;
 h.tabs.set(90,{id:90,windowId:4});
 await h.spaces.command({action:'adopt',spaceId:'space-one',pageLabel:'user',tabId:90,userConfirmed:true},'a');
 h.tabs.set(91,{id:91,windowId:4});
 await h.spaces.humanCommand({action:'handoff',spaceId:'space-one',pageLabel:'main'});
 await h.spaces.command({action:'stop',spaceId:'space-one'},'a');
 const result=await h.spaces.humanCommand({action:'cleanup-ended'});
 assert.deepEqual(result,{removed:1,closed:0,kept:3,failed:0});
 assert.deepEqual([...h.tabs.keys()],[8,9,90,91]);assert.equal(h.held.size,0);
});
test('failed tab closure remains retryable, missing tabs do not block cleanup',async()=>{
 const h=setup();await open(h);await h.spaces.command({action:'stop',spaceId:'space-one'},'a');
 const remove=h.chrome.tabs.remove;h.chrome.tabs.remove=async()=>{throw Error('Browser unavailable')};
 assert.equal((await h.spaces.humanCommand({action:'cleanup-ended'})).failed,1);
 assert.equal((await h.spaces.humanCommand({action:'list'})).spaces[0].pages.length,1);
 h.chrome.tabs.remove=remove;h.tabs.delete(8);
 assert.equal((await h.spaces.humanCommand({action:'cleanup-ended'})).removed,1);
});
test('agent commands cannot invoke cross-session human cleanup',async()=>{
 const h=setup();await open(h);
 await assert.rejects(h.spaces.command({action:'cleanup-all',userConfirmed:true},'a'),/Unknown TaskSpace/);
 await assert.rejects(h.spaces.command({action:'cleanup',spaceId:'space-one'},'a'),/Unknown TaskSpace action/);
 assert(h.tabs.has(8));
});
test('cleanup does not discard a record when tab lookup fails unexpectedly',async()=>{
 const h=setup();await open(h);await h.spaces.command({action:'finish',spaceId:'space-one'},'a');
 h.chrome.tabs.get=async()=>{throw Error('Service disconnected')};
 assert.equal((await h.spaces.humanCommand({action:'cleanup-ended'})).failed,1);
 assert(h.tabs.has(8));assert.equal((await h.spaces.humanCommand({action:'list'})).spaces.length,1);
});
