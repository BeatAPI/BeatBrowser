import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {installWriteProbe} from '../extension/write-evidence.js';
test('write evidence preserves fetch results and excludes URLs, credentials and bodies',async()=>{
  const original=Promise.resolve({status:202});
  const window={fetch:()=>original};
  class XHR {open(){} send(){} addEventListener(){}}
  const context=vm.createContext({window,XMLHttpRequest:XHR});
  vm.runInContext(`(${installWriteProbe.toString()})()`,context);
  assert.equal(window.fetch('https://example.test/private?token=secret',{method:'POST',body:'private payload',headers:{Authorization:'secret'}}),original);
  await original;
  window.fetch({method:'PATCH',url:'https://example.test/private'});
  window.fetch('https://example.test/read');
  await original;
  const records=window.__beatWriteEvidence.entries;
  assert.equal(records.length,2);assert.equal(records[0].status,202);
  assert.deepEqual(Object.keys(records[0]).sort(),['method','sequence','status']);
  assert(!JSON.stringify(records).includes('secret'));
  for(let i=0;i<50;i++)window.fetch('/test',{method:'POST'});
  assert.equal(records.length,40);
});
test('a no-change click executes once even when no request evidence is available',async()=>{
  const source=fs.readFileSync(new URL('../extension/background.js',import.meta.url),'utf8');
  const start=source.indexOf('async function performCore('),end=source.indexOf('\nfunction describeStep',start);
  const calls=[];
  const context=vm.createContext({
    chrome:{tabs:{get:async()=>({url:'https://example.test'})}},Date,Number,Set,
    prepare:async(_id,p)=>({frameId:0,params:p}),
    toContent:async(_id,p)=>{calls.push(p.__hc);return p.__hc==='locate'?{baseline:{},x:1,y:1}:{note:'sent'};},
    L2_CMDS:new Set(['click']),prefersL2:async()=>false,
    writeEvidence:{arm:async()=>null,read:async()=>[]},
    settle:async()=>({changed:false,parts:[]}),execL2:async()=>{calls.push('second-click');},
    matchChallenge:()=>null,childOpenedSince:async()=>null,
  });
  vm.runInContext(source.slice(start,end)+'\nglobalThis.run=performCore;',context);
  const result=await context.run(1,'click',{selector:'#toggle'},{},{sid:'test'});
  assert.equal(result.upgraded,false);assert.deepEqual(calls,['locate','click']);
});
