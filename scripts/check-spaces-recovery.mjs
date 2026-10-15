// Isolated real-Chromium check. Never uses the user's profile or shared bridge.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {randomBytes} from 'node:crypto';
import WebSocket from 'ws';
import {startBridge} from '../src/bridge.js';
import {browserTestArgs} from './browser-test-launch.mjs';
const binary=process.env.BEAT_TEST_CHROME;
if(!binary) throw new Error('Set BEAT_TEST_CHROME to an installed Chrome for Testing executable.');
const root=path.resolve(import.meta.dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'beat-spaces-'));
const bridge=startBridge({port:0,writeInfo:false,token:randomBytes(16).toString('hex'),auditFn:event=>{if(process.env.BEAT_TEST_TRACE)console.log(JSON.stringify({event:event.ev,id:event.id,cmd:event.cmd,error:event.error}));}});
await bridge.ready;
const port=bridge.wss.address().port;
const ext=path.join(tmp,'extension');fs.cpSync(path.join(root,'extension'),ext,{recursive:true});
for(const file of ['background.js','offscreen.js']){
 const p=path.join(ext,file);let s=fs.readFileSync(p,'utf8').replace('const PORTS = [18899, 18900, 18901, 18902, 18903];',`const PORTS = [${port}];`);
 if(file==='background.js')s=s.replace("new Set(['tabs', 'spaces',","new Set(['__spaces_test_state', '__spaces_test_popup_url', 'tabs', 'spaces',").replace('const HANDLERS = {',"const HANDLERS = { async __spaces_test_state() { return chrome.windows.getAll({populate:true}); }, async __spaces_test_popup_url() { return {url:chrome.runtime.getURL('popup.html')}; },");
 fs.writeFileSync(p,s);
}
let writeRequests=0;
const fixture=http.createServer((req,res)=>{if(req.url==='/test-write'){writeRequests++;res.statusCode=202;res.end('accepted');return;}if(req.url==='/fixture.bin'){res.setHeader('Content-Type','application/octet-stream');res.end(Buffer.from('BeatBrowser binary fixture'));return;}res.setHeader('Content-Type','text/html');res.end(`<!doctype html><title>${req.url==='/human'?'Human workspace':'Agent fixture'}</title><h1>BeatBrowser fixture</h1><input id="input"><input id="file" type="file"><button id="button" onclick="document.querySelector('#output').textContent=document.querySelector('#input').value">Apply</button><button id="silent" onclick="fetch('/test-write',{method:'POST'})">Signal</button><output id="output"></output><script>window.framesRendered=0;function frame(){framesRendered++;requestAnimationFrame(frame)}requestAnimationFrame(frame)</script>`);});
fixture.listen(0,'127.0.0.1');await once(fixture,'listening');const base=`http://127.0.0.1:${fixture.address().port}`;
const headless=process.env.BEAT_TEST_HEADED!=='1';
let browser=spawn(binary,browserTestArgs({temporaryDirectory:tmp,extensionDirectory:ext,url:`${base}/human`,headless}),{stdio:['ignore','ignore','pipe']});
let stderr='';browser.stderr.on('data',b=>stderr+=b.toString());
let socket,debug;
try {
 socket=new WebSocket(`ws://127.0.0.1:${port}`);await once(socket,'open');
 const waiting=new Map();let n=0;let ready=false;let connections=0;
 socket.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome')ready=m.extensionOnline;if(m.type==='event'&&m.event==='extension_online'){ready=true;connections++;}const p=waiting.get(m.id);if(p){waiting.delete(m.id);m.ok?p.resolve(m.data):p.reject(Object.assign(new Error(m.error?.message),{code:m.error?.code}));}});
 socket.send(JSON.stringify({type:'hello',role:'agent',client:'spaces-test',sessionId:'spaces-real-check',token:bridge.token}));
 const until=async fn=>{const end=Date.now()+45000;while(!await fn()){if(Date.now()>end)throw new Error('Timed out waiting for isolated browser');await new Promise(r=>setTimeout(r,150));}};
 await until(()=>ready);
 const call=(cmd,params={})=>new Promise((resolve,reject)=>{const id=`test-${++n}`;const timer=setTimeout(()=>{waiting.delete(id);reject(new Error(`${cmd} timed out`));},25000);waiting.set(id,{resolve:x=>{clearTimeout(timer);resolve(x)},reject:e=>{clearTimeout(timer);reject(e)}});socket.send(JSON.stringify({type:'cmd',id,cmd,params,tabId:params.tabId}));});
 const ordinary=await call('tabs',{action:'new',url:`${base}/legacy`,label:'Human retained page'});
 const task=await call('spaces',{action:'open',url:`${base}/agent`,label:'Restore progress'});
 await call('spaces',{action:'report',spaceId:task.spaceId,message:'Checkpoint before update'});
 const completed=await call('spaces',{action:'open',url:`${base}/finished`,label:'Completed evidence'});
 await call('spaces',{action:'finish',spaceId:completed.spaceId});
 const missing=await call('spaces',{action:'open',url:`${base}/missing`,label:'Closed page'});
 const popupUrl=(await call('__spaces_test_popup_url')).url;
 async function debugConnect() {
   const devtools=fs.readFileSync(path.join(tmp,'profile','DevToolsActivePort'),'utf8').trim().split('\n');
   debug=new WebSocket(`ws://127.0.0.1:${devtools[0]}${devtools[1]}`);await once(debug,'open');
   let seq=0;const pending=new Map();
   debug.on('message',raw=>{const r=JSON.parse(raw),p=pending.get(r.id);if(p){pending.delete(r.id);clearTimeout(p.timer);r.error?p.reject(Error(r.error.message)):p.resolve(r.result);}});
   return (method,params={},sessionId)=>new Promise((resolve,reject)=>{
     const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error(method+' timed out'));},10000);
     pending.set(id,{resolve,reject,timer});debug.send(JSON.stringify({id,method,params,sessionId}));
   });
 }
 let cdp=await debugConnect();
 const target=await cdp('Target.createTarget',{url:'chrome://extensions/'});
 const admin=await cdp('Target.attachToTarget',{targetId:target.targetId,flatten:true});
 const evaluate=async(sessionId,expression)=>{
   const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);
   if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
   return r.result.value;
 };
 await until(()=>evaluate(admin.sessionId,'!!chrome.developerPrivate'));
 const extensionId=new URL(popupUrl).hostname,generation=connections;
 await evaluate(admin.sessionId,`new Promise((resolve,reject)=>chrome.developerPrivate.reload('${extensionId}',{failQuietly:true},()=>chrome.runtime.lastError?reject(Error(chrome.runtime.lastError.message)):resolve(true)))`);
 // Chromium disables command-line-loaded test extensions on reload. Re-enable
 // the same disposable extension; this does not touch the daily Chrome profile.
 await evaluate(admin.sessionId,`new Promise((resolve,reject)=>chrome.management.setEnabled('${extensionId}',true,()=>chrome.runtime.lastError?reject(Error(chrome.runtime.lastError.message)):resolve(true)))`);
 await until(()=>connections>generation);
 let restored=(await call('spaces',{action:'list'})).spaces;
 assert.equal(restored.length,3);assert.equal(restored.find(s=>s.spaceId===task.spaceId).state,'recovered');
 assert.equal(restored.find(s=>s.spaceId===completed.spaceId).state,'finished');
 assert.equal(restored.find(s=>s.spaceId===task.spaceId).progress,'Checkpoint before update');
 assert.equal(restored.find(s=>s.spaceId===task.spaceId).pages.length,1,'Reload keeps exact live target associations');
 await assert.rejects(call('type',{spaceId:task.spaceId,tabId:task.tabId,selector:'#input',text:'must-not-replay'}),/recovered/);
 let panel=await cdp('Target.createTarget',{url:popupUrl.replace('popup.html','panel.html')});
 let panelSession=(await cdp('Target.attachToTarget',{targetId:panel.targetId,flatten:true})).sessionId;
 await until(()=>evaluate(panelSession,"!!document.querySelector('[data-action=resume]')"));
 await evaluate(panelSession,`chrome.tabs.remove(${missing.tabId})`);
 await until(async()=> (await call('spaces',{action:'list'})).spaces.find(s=>s.spaceId===missing.spaceId).missingPages.length===1);
 await evaluate(panelSession,"chrome.storage.local.set({uiLanguage:'zh'})");
 await until(()=>evaluate(panelSession,"document.documentElement.lang==='zh-CN'"));
 await cdp('Emulation.setDeviceMetricsOverride',{width:380,height:1100,deviceScaleFactor:1,mobile:false},panelSession);
 await evaluate(panelSession,'document.fonts.ready');
 const shot=await cdp('Page.captureScreenshot',{format:'png'},panelSession);
 fs.mkdirSync(path.join(root,'screenshots-local'),{recursive:true});fs.writeFileSync(path.join(root,'screenshots-local/task-recovery.png'),Buffer.from(shot.data,'base64'));
 // Restart the test browser with its own profile and let Chrome restore tabs.
 const reconnect=connections;const exited=once(browser,'exit');
 await cdp('Browser.close').catch(()=>{});await exited;debug.close();
 browser=spawn(binary,[...browserTestArgs({temporaryDirectory:tmp,extensionDirectory:ext,url:'about:blank',headless:true}),'--restore-last-session'],{stdio:['ignore','ignore','pipe']});
 browser.stderr.on('data',b=>stderr+=b.toString());
 await until(()=>connections>reconnect);
 cdp=await debugConnect();
 panel=await cdp('Target.createTarget',{url:popupUrl.replace('popup.html','panel.html')});
 panelSession=(await cdp('Target.attachToTarget',{targetId:panel.targetId,flatten:true})).sessionId;
 await until(()=>evaluate(panelSession,'!!chrome.runtime?.id'));
 const human=p=>evaluate(panelSession,`chrome.runtime.sendMessage({__hcPopup:'spaces',params:${JSON.stringify(p)}})`);
 // Browser restart gives pages new native identities. Preserve records and ask
 // for explicit association rather than guessing ownership from matching URLs.
 await human({action:'retry-recovery',spaceId:task.spaceId});
 restored=(await call('spaces',{action:'list'})).spaces;
 const afterRestart=restored.find(s=>s.spaceId===task.spaceId);
 assert.equal(afterRestart.state,'recovered');assert.equal(afterRestart.pages.length,0);
 assert.equal(afterRestart.missingPages.length,1);
 assert.equal(restored.find(s=>s.spaceId===completed.spaceId).state,'finished');
 assert.equal(restored.find(s=>s.spaceId===missing.spaceId).missingPages.length,1);
 assert((await human({action:'resume',spaceId:task.spaceId})).error,'Missing pages must block resume');
 let nativeCandidate;
 await until(async()=>{
   nativeCandidate=(await human({action:'candidates',spaceId:task.spaceId})).pages.find(t=>t.url===`${base}/agent`);
   return !!nativeCandidate;
 });
 const relinked=await human({action:'relink',spaceId:task.spaceId,pageLabel:'main',...nativeCandidate,userConfirmed:true});
 assert.equal(relinked.state,'recovered');
 assert.equal((await human({action:'resume',spaceId:task.spaceId})).state,'running');
 await call('spaces',{action:'list'});
 await call('type',{spaceId:task.spaceId,tabId:relinked.tabId,selector:'#input',text:'explicit-resume'});
 assert.deepEqual(await evaluate(panelSession,'chrome.tabGroups.query({})'),[],'Task lifecycle must not create native groups');
 const candidates=await human({action:'candidates',spaceId:missing.spaceId});
 const candidate=candidates.pages.find(t=>t.url===`${base}/legacy`);assert(candidate);
 const linked=await human({action:'relink',spaceId:missing.spaceId,pageLabel:'main',...candidate,userConfirmed:true});
 assert.equal(linked.missingPages.length,0);assert.notEqual(linked.state,'running');
 const receipt=await human({action:'cleanup-all',userConfirmed:true});assert.equal(receipt.failed,0);
 assert.equal((await call('spaces',{action:'list'})).spaces.length,0);
 assert.deepEqual(await evaluate(panelSession,"chrome.storage.local.get('beatTaskArchive').then(x=>Object.keys(x.beatTaskArchive.tasks))"),[]);
 const all=await call('__spaces_test_state');assert(all.some(w=>w.tabs.some(t=>t.id===candidate.tabId)));
 console.log(JSON.stringify({passed:true,reloadPreservesTasks:true,restartPreservesRecords:true,restartRequiresAssociation:true,noNativeGroups:true,completedStatePreserved:true,progressPreserved:true,noAutomaticReplay:true,explicitResumeWorks:true,missingPageRelink:true,userPagePreserved:true,cleanupPersistent:true,isolated:true},null,2));
} catch(e){ console.error(e.message);console.error(stderr.slice(-1500));process.exitCode=1; }
finally{debug?.close();socket?.close();browser.kill('SIGTERM');fixture.close();bridge.close();await new Promise(r=>setTimeout(r,500));fs.rmSync(tmp,{recursive:true,force:true});}
