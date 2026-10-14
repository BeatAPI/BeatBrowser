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
import {checkSpacesPopup} from './check-spaces-popup.mjs';
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
const browser=spawn(binary,browserTestArgs({temporaryDirectory:tmp,extensionDirectory:ext,url:`${base}/human`,headless}),{stdio:['ignore','ignore','pipe']});
let stderr='';browser.stderr.on('data',b=>stderr+=b.toString());
let socket;
try {
 socket=new WebSocket(`ws://127.0.0.1:${port}`);await once(socket,'open');
 const waiting=new Map();let n=0;let ready=false;
 socket.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome')ready=m.extensionOnline;if(m.type==='event'&&m.event==='extension_online')ready=true;const p=waiting.get(m.id);if(p){waiting.delete(m.id);m.ok?p.resolve(m.data):p.reject(Object.assign(new Error(m.error?.message),{code:m.error?.code}));}});
 socket.send(JSON.stringify({type:'hello',role:'agent',client:'spaces-test',sessionId:'spaces-real-check',token:bridge.token}));
 const until=async fn=>{const end=Date.now()+45000;while(!await fn()){if(Date.now()>end)throw new Error('Timed out waiting for isolated browser');await new Promise(r=>setTimeout(r,150));}};
 await until(()=>ready);
 const call=(cmd,params={})=>new Promise((resolve,reject)=>{const id=`test-${++n}`;const timer=setTimeout(()=>{waiting.delete(id);reject(new Error(`${cmd} timed out`));},25000);waiting.set(id,{resolve:x=>{clearTimeout(timer);resolve(x)},reject:e=>{clearTimeout(timer);reject(e)}});socket.send(JSON.stringify({type:'cmd',id,cmd,params,tabId:params.tabId}));});
 const before=await call('__spaces_test_state');
 const human=before.find(w=>w.tabs.some(t=>t.url===`${base}/human`));assert(human);
 const s=await call('spaces',{action:'open',url:`${base}/agent`,label:'Isolated background proof'});assert.equal(s.state,'running');console.log('opened-state',JSON.stringify((await call('__spaces_test_state')).map(w=>({id:w.id,state:w.state,focused:w.focused}))));
 const scope={spaceId:s.spaceId,tabId:s.tabId};
 let readinessFailure;
 try {
   await until(async()=>{try{const r=await call('query',{...scope,selector:'#input',extract:{id:'.@id'}});return String(r.text||r).includes('input');}catch(error){readinessFailure={code:error.code,message:error.message};if(error.code==='SPACE_STOPPED')throw error;return false;}});
 } catch(error) {
   console.error(JSON.stringify({stage:'first-page-ready',lastError:readinessFailure,space:await call('spaces',{action:'status',spaceId:s.spaceId}),windows:(await call('__spaces_test_state')).map(w=>({id:w.id,state:w.state,focused:w.focused}))}));
   throw error;
 }
 await call('type',{...scope,selector:'#input',text:'background-success'});
 await call('click',{...scope,selector:'#button'});
 const observed=await call('query',{...scope,selector:'#output',extract:{text:'.@text'}});assert.match(observed.text,/background-success/);
 const frames=async()=>JSON.parse((await call('eval',{...scope,expr:'({frames:window.framesRendered,visibility:document.visibilityState})'})).text);
 const uploadPath=path.join(tmp,'upload-fixture.txt');fs.writeFileSync(uploadPath,'Synthetic upload proof');
 const uploaded=await call('upload',{...scope,path:uploadPath,name:'upload-fixture.txt',type:'text/plain',bytes:22,selector:'#file'});
 assert.equal(uploaded.needBytes,undefined);
 const fileState=await call('eval',{...scope,expr:'document.querySelector("#file").files[0].name'});
 assert.equal(JSON.parse(fileState.text),'upload-fixture.txt');
 const fetched=await call('fetch',{...scope,url:`${base}/fixture.bin`,binary:true});
 assert.equal(Buffer.from(fetched.base64,'base64').toString(),'BeatBrowser binary fixture');
 const fetchedPath=path.join(tmp,'download-fixture.bin');fs.writeFileSync(fetchedPath,Buffer.from(fetched.base64,'base64'));
 assert.equal(fs.readFileSync(fetchedPath,'utf8'),'BeatBrowser binary fixture');
 const receipt=await call('click',{...scope,selector:'#silent'});
 assert.equal(writeRequests,1);assert.match(receipt.text,/Requests observed/);
 const first=await frames();await new Promise(r=>setTimeout(r,6500));const second=await frames();assert(second.frames>first.frames,'Background animation must continue beyond the old 5s detach interval');
 const after=await call('__spaces_test_state');const same=after.find(w=>w.id===human.id);const agent=after.find(w=>w.id===s.windowId);
 assert.equal(same.tabs.find(t=>t.active).id,human.tabs.find(t=>t.active).id);
 if(!headless){assert.equal(same.focused,human.focused);assert.equal(agent.state,'minimized');assert.equal(agent.focused,false);}
 let backgroundScreenshot=false;
 try { const shot=await call('screenshot',scope);assert(shot.dataUrl?.startsWith('data:image/'));backgroundScreenshot=true; }
 catch(error) { assert.equal(error.code,'BACKGROUND_CAPTURE_UNAVAILABLE'); }
 const postCapture=await call('__spaces_test_state');
 if(!headless){assert.equal(postCapture.find(w=>w.id===s.windowId).state,'minimized');assert.equal(postCapture.find(w=>w.id===human.id).focused,human.focused);}
 const two=await call('spaces',{action:'new-page',spaceId:s.spaceId,pageLabel:'second',url:`${base}/second`});
 const secondTab=two.pages.find(p=>p.label==='second').tabId;
 await call('type',{spaceId:s.spaceId,tabId:secondTab,selector:'#input',text:'second-page-success'});
 await call('click',{spaceId:s.spaceId,tabId:secondTab,selector:'#button'});
 const secondResult=await call('query',{spaceId:s.spaceId,tabId:secondTab,selector:'#output',extract:{text:'.@text'}});
 assert.match(secondResult.text,/second-page-success/);
 await call('spaces',{action:'report',spaceId:s.spaceId,message:'Both test pages completed.',needsConfirmation:true});
 await assert.rejects(call('type',{...scope,selector:'#input',text:'must-not-run-before-review'}),/user/);
 const popup=await checkSpacesPopup({profileDirectory:path.join(tmp,'profile'),url:(await call('__spaces_test_popup_url')).url,output:path.join(root,'screenshots-local/taskspaces-popup.png')});
 assert.equal((await call('spaces',{action:'status',spaceId:s.spaceId})).state,'running');
 await call('spaces',{action:'report',spaceId:s.spaceId,message:'Both test pages completed.',needsConfirmation:true});
 const panel=await checkSpacesPopup({profileDirectory:path.join(tmp,'profile'),url:(await call('__spaces_test_popup_url')).url.replace('popup.html','panel.html'),output:path.join(root,'screenshots-local/taskspaces-panel.png')});
 assert.equal((await call('spaces',{action:'status',spaceId:s.spaceId})).state,'running');
 await call('spaces',{action:'stop',spaceId:s.spaceId});await assert.rejects(call('type',{...scope,selector:'#input',text:'must-not-type'}),/stopped/);
 console.log(JSON.stringify({passed:true,popup,panel,headless,writeRequestEvidence:true,mockKeychain:process.platform==='darwin',backgroundInput:true,namedPages:true,fileInputUpload:true,binaryFetchToDisk:true,reviewBlocksInput:true,framesBefore:first.frames,framesAfter:second.frames,visibility:second.visibility,humanWindowFocusUnchanged:headless?null:true,humanTabUnchanged:true,agentWindowMinimized:headless?null:true,backgroundScreenshot,screenshotReturnsOrReportsLimitation:true,stopBlocksInput:true},null,2));
} catch(e){ console.error(e.message);console.error(stderr.slice(-1500));process.exitCode=1; }
finally{socket?.close();browser.kill('SIGTERM');fixture.close();bridge.close();await new Promise(r=>setTimeout(r,500));fs.rmSync(tmp,{recursive:true,force:true});}
