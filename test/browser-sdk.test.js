import test from 'node:test';
import assert from 'node:assert/strict';
import {createBrowser} from '../src/browser.js';
function setup() {
 let state={spaceId:'space-one',label:'Research',state:'running',pages:[{label:'main',tabId:42}],sequence:0};
 const calls=[];
 const bridge={ws:{},close(){this.ws=null},async call(name,args,options){
  calls.push({name,args,options});
  if(name!=='spaces')return {text:'done'};
  if(args.action==='new-page')state={...state,pages:[...state.pages,{label:args.pageLabel,tabId:43}]};
  if(args.action==='report'&&args.needsConfirmation)state={...state,state:'user'};
  if(args.action==='finish')state={...state,state:'finished',receipt:{retained:['main'],closed:[]}};
  return structuredClone(state);
 }};
 return {browser:createBrowser({bridge}),bridge,calls};
}
test('JavaScript pages compose named operations with the same explicit space and tab',async()=>{
 const {browser,calls}=setup();const task=await browser.openSpace({url:'https://example.test',label:'Research'});
 const second=await task.newPage('sources','https://example.test/sources');
 await second.fill('#query','test');await task.page('main').snapshot();
 const fill=calls.find(c=>c.name==='type');assert.equal(fill.args.spaceId,'space-one');assert.equal(fill.args.tabId,43);
 assert.equal(calls.find(c=>c.name==='snapshot').args.tabId,42);
 const result=await task.finish({keep:['main']});assert.deepEqual(result.receipt.retained,['main']);
 assert.equal(calls.filter(c=>c.name==='spaces'&&c.args.action==='open').length,1);
});
test('uncertain page action is never replayed or sent to another tab',async()=>{
 const {browser,bridge,calls}=setup();const task=await browser.openSpace({url:'https://example.test'});
 const original=bridge.call;bridge.call=async(...args)=>{if(args[0]==='click'){calls.push({name:'uncertain'});throw Error('Connection lost after click');}return original(...args)};
 await assert.rejects(task.page().click('#submit'),/after click/);
 assert.equal(calls.filter(c=>c.name==='uncertain').length,1);
});
test('waiting for human control never sends a resume command',async()=>{
 const {browser,calls}=setup();const task=await browser.openSpace({url:'https://example.test'});
 await task.report('Review the prepared draft',{needsConfirmation:true});
 await assert.rejects(task.waitForControl({signal:AbortSignal.abort()}));
 assert.equal(calls.some(c=>c.args?.action==='resume'),false);
});
