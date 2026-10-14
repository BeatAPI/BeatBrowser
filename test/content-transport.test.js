import test from 'node:test';
import assert from 'node:assert/strict';
import {createContentTransport} from '../extension/content-transport.js';
function setup({tab={id:1},dialog=null,hang=false}={}) {
  const calls=[];
  const chrome={tabs:{get:async()=>tab,sendMessage:async()=>{calls.push('send');return hang?new Promise(()=>{}):{data:{done:true}};}}};
  const cdp={pendingDialog:()=>dialog,isEnabled:async()=>true,probeDialog:async()=>dialog,unfreeze:async()=>{calls.push('unfreeze');tab.frozen=false;}};
  return {calls,tab,send:createContentTransport({chrome,cdp,ensureContent:async()=>calls.push('inject'),contentBudget:()=>5,diagnosticBudget:5})};
}
test('frozen page wakes before one dispatch without foreground or reload',async()=>{
  const h=setup({tab:{id:1,frozen:true}});assert.deepEqual(await h.send(1,{__hc:'click'}),{done:true});
  assert.deepEqual(h.calls,['unfreeze','inject','send']);
});
test('unknown timeout is busy, not an invented dialog, and never replays a write',async()=>{
  const h=setup({hang:true});await assert.rejects(h.send(1,{__hc:'click'}),{code:'PAGE_BUSY'});
  assert.deepEqual(h.calls,['inject','send']);
});
test('confirmed dialog gets its own error; discarded pages get no command',async()=>{
  const h=setup({hang:true,dialog:{type:'confirm'}});await assert.rejects(h.send(1,{__hc:'click'}),{code:'DIALOG_BLOCKING'});
  const d=setup({tab:{id:1,discarded:true}});await assert.rejects(d.send(1,{__hc:'click'}),{code:'TAB_DISCARDED'});assert.deepEqual(d.calls,[]);
});
test('a page frozen after dispatch does not trigger unfreeze-and-replay',async()=>{
  const h=setup({hang:true});const result=h.send(1,{__hc:'click'});
  setTimeout(()=>{h.tab.frozen=true;},1);
  await assert.rejects(result,{code:'PAGE_FROZEN'});assert.equal(h.calls.filter(x=>x==='send').length,1);assert(!h.calls.includes('unfreeze'));
});
