// UI acceptance against only the disposable test extension/profile.
import fs from 'node:fs';
import path from 'node:path';
import WebSocket from 'ws';
import {once} from 'node:events';
import assert from 'node:assert/strict';

export async function checkSpacesPopup({profileDirectory,url,output,cleanup=false}) {
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
      if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);return r.result.value;
    };
    if (cleanup) {
      const ready=Date.now()+10000;
      while (!await evaluate("document.querySelector('[data-action=cleanup]') !== null")) {
        if(Date.now()>ready)throw Error('No cleanup action rendered');
        await new Promise(r=>setTimeout(r,100));
      }
      assert.equal(await evaluate("document.querySelector('.pause-detail').hidden"),true);
      await evaluate("document.querySelector('#cleanup-all').click()");
      assert.equal(await evaluate("document.querySelector('#cleanup-confirm').hidden"),false);
      assert.equal(await evaluate("document.querySelectorAll('.space').length"),1);
      await evaluate("document.querySelector('#cleanup-cancel').click()");
      assert.equal(await evaluate("document.querySelector('#cleanup-confirm').hidden"),true);
      await command('Emulation.setDeviceMetricsOverride',{width:340,height:900,deviceScaleFactor:1,mobile:false},sessionId);
      await evaluate('document.fonts.ready');
      assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false);
      const shot=await command('Page.captureScreenshot',{format:'png'},sessionId);
      fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,Buffer.from(shot.data,'base64'));
      await evaluate("document.querySelector('#cleanup-ended').click()");
      const removed=Date.now()+10000;
      while (await evaluate("document.querySelectorAll('.space').length")) {
        if(Date.now()>removed)throw Error('Ended tasks not removed');
        await new Promise(r=>setTimeout(r,100));
      }
      assert.equal(await evaluate("document.querySelector('#task-count').textContent"),'0');
      assert.equal(await evaluate("document.querySelector('#cleanup-ended').disabled"),true);
      await evaluate("chrome.storage.local.set({uiLanguage:'zh'})");
      await command('Page.navigate',{url:url.replace('panel.html','popup.html')},sessionId);
      const emptyReady=Date.now()+5000;
      while (!await evaluate("document.documentElement.lang==='zh-CN' && !!document.querySelector('.empty-space')")) {
        if(Date.now()>emptyReady)throw Error('Empty popup did not render');
        await new Promise(r=>setTimeout(r,100));
      }
      await command('Emulation.setDeviceMetricsOverride',{width:340,height:440,deviceScaleFactor:1,mobile:false},sessionId);
      await evaluate('document.fonts.ready');
      const emptyShot=await command('Page.captureScreenshot',{format:'png'},sessionId);
      fs.writeFileSync(output.replace(/\.png$/, '-empty.png'),Buffer.from(emptyShot.data,'base64'));
      const linked=await evaluate(`(async()=>{
        const tab=await chrome.tabs.create({url:'https://example.test/linked-page',active:false});
        const groupId=await chrome.tabs.group({tabIds:[tab.id]});
        await chrome.tabGroups.update(groupId,{title:'BeatBrowser',color:'blue'});
        return tab.id;
      })()`);
      const pageReady=Date.now()+10000;
      while(!await evaluate(`document.querySelector('.browser-page[data-tab-id="${linked}"]') !== null`)) {
        if(Date.now()>pageReady)throw Error('Ordinary BeatBrowser page absent from workspace');
        await new Promise(r=>setTimeout(r,100));
      }
      assert.equal(await evaluate("document.querySelector('#task-count').textContent"),'0');
      await evaluate(`document.querySelector('.browser-page[data-tab-id="${linked}"] [data-page-action=close]').click()`);
      assert.equal(await evaluate("document.querySelector('#browser-pages-confirm').hidden"),false);
      await evaluate("document.querySelector('#browser-pages-cancel').click()");
      assert.equal(await evaluate(`chrome.tabs.get(${linked}).then(t=>t.id)`),linked);
      await command('Emulation.setDeviceMetricsOverride',{width:340,height:760,deviceScaleFactor:1,mobile:false},sessionId);
      assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false);
      const inventoryShot=await command('Page.captureScreenshot',{format:'png'},sessionId);
      fs.writeFileSync(output.replace(/\.png$/, '-pages.png'),Buffer.from(inventoryShot.data,'base64'));
      await evaluate(`document.querySelector('.browser-page[data-tab-id="${linked}"] [data-page-action=close]').click()`);
      await evaluate("document.querySelector('#browser-pages-confirm-yes').click()");
      const pageClosed=Date.now()+10000;
      while(await evaluate(`chrome.tabs.get(${linked}).then(()=>true,()=>false)`)) {
        if(Date.now()>pageClosed)throw Error('Confirmed linked page did not close');
        await new Promise(r=>setTimeout(r,100));
      }
      return {cleanupButton:true,confirmationCancel:true,endedRemoved:true,linkedPageVisible:true,linkedPageClosed:true,noOverflow:true};
    }
    const end=Date.now()+10000;
    while(!await evaluate("document.querySelector('#spaces-list')?.textContent.includes('Both test pages completed.')")){
      if(Date.now()>end)throw Error('TaskSpace popup did not display progress');
      await new Promise(r=>setTimeout(r,100));
    }
    await evaluate("chrome.storage.local.set({uiLanguage:'en'})");
    const initialLanguageEnd=Date.now()+5000;
    while(!await evaluate("document.documentElement.lang==='en' && document.querySelector('[data-action=resume]')?.textContent==='Continue'")) {
      if(Date.now()>initialLanguageEnd)throw Error('Initial English render did not settle');
      await new Promise(r=>setTimeout(r,100));
    }
    const panel = url.endsWith('/panel.html');
    const text=await evaluate('document.body.innerText');
    // Exercise the injected expanded activity card, including time labels and current action.
    assert.equal(await evaluate(`(async()=>{
      await chrome.storage.local.set({dockOpen:true});
      const tab=(await chrome.tabs.query({})).find(t=>t.url?.includes('/agent'));
      if(!tab)throw Error('Missing synthetic activity page');
      await chrome.scripting.executeScript({target:{tabId:tab.id},files:['ui-language.js','mark.js']});
      await new Promise(r=>setTimeout(r,100));
      const reply=await chrome.tabs.sendMessage(tab.id,{__hcMark:'set',sid:'ui-test',act:'Inspecting fixture',
        owners:[{sid:'ui-test',label:'Test agent',code:'T',color:'#3a5bc7'}],
        intents:{'ui-test':{text:'Inspect fixture',t:Date.now()}},
        logs:{'ui-test':[{text:'Fixture ready',t:Date.now()-10000}]}});
      await chrome.tabs.sendMessage(tab.id,{__hcMark:'clear'});
      return reply.ok;
    })()`),true);
    if (panel) {
      assert.match(text,/Tasks/);
      assert.equal(await evaluate("document.querySelectorAll('.page-list li').length"),2);
      assert.equal(await evaluate("chrome.runtime.getManifest().side_panel.default_path"),'panel.html');
      await evaluate("document.querySelector('.timeline').open=true");
      const historyEnd=Date.now()+5000;
      while(!await evaluate("document.querySelector('.timeline ol').textContent.includes('Task started')")) {
        if(Date.now()>historyEnd)throw Error('Panel did not load the shared task history');
        await new Promise(r=>setTimeout(r,100));
      }
    }
    assert.match(text,/2 pages/);assert.match(text,/Continue/);
    assert.equal(await evaluate("document.querySelector('.space-notify input').checked"),false);
    await command('Emulation.setDeviceMetricsOverride',{width:panel?400:340,height:900,deviceScaleFactor:1,mobile:false},sessionId);
    // Activate only this synthetic UI target in the disposable test browser.
    await command('Emulation.setFocusEmulationEnabled',{enabled:true},sessionId);
    await command('Page.bringToFront',{},sessionId);
    await evaluate('document.fonts.ready');
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false);
    assert.equal(await evaluate('getComputedStyle(document.body).colorScheme'),'light');
    assert.equal(await evaluate("document.querySelectorAll('#language select').length"),0);
    assert.equal(await evaluate("document.querySelectorAll('#language button').length"),2);
    const capture = async filename => {
      const shot=await command('Page.captureScreenshot',{format:'png'},sessionId);
      fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename,Buffer.from(shot.data,'base64'));
    };
    await capture(output.replace('.png','-en.png'));
    await evaluate("document.querySelector('[data-language=zh]').click()");
    const languageEnd=Date.now()+5000;
    while(!await evaluate("document.documentElement.lang==='zh-CN' && document.querySelector('[data-action=resume]').textContent==='\\u7ee7\\u7eed'")) {
      if(Date.now()>languageEnd)throw Error('Language switch did not update task controls');
      await new Promise(r=>setTimeout(r,100));
    }
    assert.equal(await evaluate("chrome.storage.local.get('uiLanguage').then(x=>x.uiLanguage)"),'zh');
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'),false);
    assert.equal(await evaluate("document.querySelector('[data-language=zh]').getAttribute('aria-pressed')"),'true');
    await capture(output);
    // The saved preference must apply to a freshly opened extension document.
    const {targetId:peer}=await command('Target.createTarget',{url});
    try {
      const {sessionId:peerSession}=await command('Target.attachToTarget',{targetId:peer,flatten:true});
      const peerEnd=Date.now()+5000;
      while(true) {
        const r=await command('Runtime.evaluate',{expression:"document.documentElement.lang",returnByValue:true},peerSession);
        if(r.result.value==='zh-CN')break;
        if(Date.now()>peerEnd)throw Error('Saved language did not persist');
        await new Promise(r=>setTimeout(r,100));
      }
    } finally {await command('Target.closeTarget',{targetId:peer});}
    await evaluate("document.querySelector('[data-language=en]').click()");
    const englishEnd=Date.now()+5000;
    while(!await evaluate("document.documentElement.lang==='en' && document.querySelector('[data-action=resume]').textContent==='Continue'")) {
      if(Date.now()>englishEnd)throw Error('English switch failed');
      await new Promise(r=>setTimeout(r,100));
    }
    await evaluate("[...document.querySelectorAll('.space-actions button')].find(b=>b.dataset.action==='resume').click()");
    const resumed=Date.now()+10000;
    while(!await evaluate("document.querySelector('#spaces-message').textContent.includes('Control returned')")){
      if(Date.now()>resumed)throw Error('Popup resume did not return control');
      await new Promise(r=>setTimeout(r,100));
    }
    return {popupRendersProgress:true,popupHumanResume:true,languageSwitchAndPersistence:true,panel,screenshot:output};
  } finally {
    if(targetId)await command('Target.closeTarget',{targetId}).catch(()=>{});
    for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('UI test closed'));}
    ws.close();
  }
}
