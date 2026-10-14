// UI acceptance against only the disposable test extension/profile.
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';
import {once} from 'node:events';
import assert from 'node:assert/strict';

export async function checkSpacesPopup({profileDirectory,url,output}) {
  const [port,route]=fs.readFileSync(path.join(profileDirectory,'DevToolsActivePort'),'utf8').trim().split('\n');
  const ws=new WebSocket(`ws://127.0.0.1:${Number(port)}${route}`);
  await once(ws,'open');let sequence=0;const pending=new Map();
  ws.on('message',data=>{const m=JSON.parse(data);const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(m.error.message)):p.resolve(m.result)});
  const command=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
    const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error(`UI test timeout: ${method}`));},10000);
    pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params,sessionId}));
  });
  let targetId;
  try {
    ({targetId}=await command('Target.createTarget',{url}));
    const {sessionId}=await command('Target.attachToTarget',{targetId,flatten:true});
    const evaluate=async expression=>{
      const r=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);
      if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;
    };
    const end=Date.now()+10000;
    while(!await evaluate("document.querySelector('#spaces-list')?.textContent.includes('Both test pages completed.')")){
      if(Date.now()>end)throw Error('TaskSpace popup did not display progress');
      await new Promise(r=>setTimeout(r,100));
    }
    const text=await evaluate('document.body.innerText');
    assert.match(text,/2 managed pages/);assert.match(text,/Confirm \/ resume/);
    assert.equal(await evaluate("document.querySelector('.space-notify input').checked"),false);
    await command('Emulation.setDeviceMetricsOverride',{width:320,height:760,deviceScaleFactor:1,mobile:false},sessionId);
    const shot=await command('Page.captureScreenshot',{format:'png'},sessionId);
    fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,Buffer.from(shot.data,'base64'));
    await evaluate("[...document.querySelectorAll('.space-actions button')].find(b=>b.textContent==='Confirm / resume').click()");
    const resumed=Date.now()+10000;
    while(!await evaluate("document.querySelector('#spaces-message').textContent.includes('Control returned')")){
      if(Date.now()>resumed)throw Error('Popup resume did not return control');
      await new Promise(r=>setTimeout(r,100));
    }
    return {popupRendersProgress:true,popupHumanResume:true,screenshot:output};
  } finally {
    if(targetId)await command('Target.closeTarget',{targetId}).catch(()=>{});
    for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('UI test closed'));}
    ws.close();
  }
}
