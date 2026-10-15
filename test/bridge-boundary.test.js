// [INPUT] Synthetic WebSocket peers and loopback bridge.
// [OUTPUT] Regression checks for malformed input and response ownership.
// [POS] Release transport boundary tests.
// [PROTOCOL] No browser profile, production bridge or credentials are used.
import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { startBridge } from '../src/bridge.js';
import { tokenEquals } from '../src/lib/paths.js';
import { VERSION } from '../src/lib/version.js';

const until = async (predicate) => {
  const deadline = Date.now() + 2000;
  while (!predicate() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
  assert.ok(predicate(), 'Expected socket event did not arrive');
};
const peer = async (port, extension = false) => {
  const socket = new WebSocket(`ws://127.0.0.1:${port}`, extension
    ? { headers: { Origin: 'chrome-extension://synthetic-test' } } : {});
  const messages = [];
  socket.on('message', raw => messages.push(JSON.parse(raw)));
  socket.on('error', () => {});
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  return { socket, messages };
};
const hello = (p, extension, instanceId = 'fixture') => p.socket.send(JSON.stringify(extension
  ? { type: 'hello', role: 'extension', version: VERSION, instanceId }
  : { type: 'hello', role: 'agent', token: 'synthetic-release-token' }));

test('token comparison rejects multibyte and malformed values without throwing', () => {
  assert.equal(tokenEquals('x'.repeat(64), 'x'.repeat(64)), true);
  assert.equal(tokenEquals(String.fromCodePoint(0x00e9).repeat(64), 'x'.repeat(64)), false);
  assert.equal(tokenEquals({}, 'x'.repeat(64)), false);
  assert.equal(tokenEquals(null, 'x'.repeat(64)), false);
});

test('malformed JSON values and invalid token lengths leave the shared bridge alive', async t => {
  const server = startBridge({ port: 0, writeInfo: false, token: 'synthetic-release-token', auditFn: () => {} });
  t.after(() => server.close());
  await server.ready;
  const port = server.wss.address().port;
  for (const invalid of [null, [], 42, 'hello', {}, { type: 'hello', role: 'agent', token: {} },
    { type: 'hello', role: 'agent', token: String.fromCodePoint(0x00e9).repeat(23) }]) {
    const p = await peer(port);
    const closed = new Promise(resolve => p.socket.once('close', resolve));
    p.socket.send(JSON.stringify(invalid));
    await closed;
  }
  const valid = await peer(port);
  hello(valid, false);
  await until(() => valid.messages.some(m => m.type === 'welcome'));
  valid.socket.send(JSON.stringify({ type: 'ping' }));
  await until(() => valid.messages.some(m => m.type === 'pong'));
});

test('Normal-mode response belongs to the extension that received the command', async t => {
  const server = startBridge({ port: 0, writeInfo: false, token: 'synthetic-release-token', auditFn: () => {} });
  t.after(() => server.close());
  await server.ready;
  const port = server.wss.address().port;
  const owner = await peer(port, true);
  hello(owner, true, 'owner');
  await until(() => owner.messages.some(m => m.type === 'welcome'));
  const agent = await peer(port);
  hello(agent, false);
  await until(() => agent.messages.some(m => m.type === 'welcome'));
  agent.socket.send(JSON.stringify({ type: 'cmd', id: 'read', cmd: 'snapshot', params: {}, timeout: 2000 }));
  await until(() => owner.messages.some(m => m.type === 'cmd'));
  const command = owner.messages.find(m => m.type === 'cmd');
  const other = await peer(port, true);
  hello(other, true, 'other');
  await until(() => other.messages.some(m => m.type === 'welcome'));
  other.socket.send(JSON.stringify({ type: 'res', id: command.id, __k: command.__k, ok: true, data: 'forged' }));
  other.socket.send(JSON.stringify({ type: 'ping' }));
  await until(() => other.messages.some(m => m.type === 'pong'));
  assert.equal(agent.messages.some(m => m.type === 'res' && m.id === 'read'), false);
  owner.socket.send(JSON.stringify({ type: 'res', id: command.id, __k: command.__k, ok: true, data: 'owner' }));
  await until(() => agent.messages.some(m => m.type === 'res' && m.id === 'read'));
  assert.equal(agent.messages.find(m => m.type === 'res' && m.id === 'read').data, 'owner');
});

test('TaskSpace stays on its original browser and stops when that browser disconnects', async t => {
  const server = startBridge({ port: 0, writeInfo: false, token: 'synthetic-release-token', auditFn: () => {} });
  t.after(() => server.close());
  await server.ready;
  const port = server.wss.address().port;
  const owner = await peer(port, true);
  hello(owner, true, 'space-owner');
  await until(() => owner.messages.some(m => m.type === 'welcome'));
  const agent = await peer(port);
  hello(agent, false);
  await until(() => agent.messages.some(m => m.type === 'welcome'));
  agent.socket.send(JSON.stringify({ type:'cmd', id:'open', cmd:'spaces', params:{action:'open',url:'https://example.test'} }));
  await until(() => owner.messages.some(m => m.cmd === 'spaces'));
  const opening = owner.messages.find(m => m.cmd === 'spaces');
  owner.socket.send(JSON.stringify({type:'res',id:opening.id,__k:opening.__k,ok:true,data:{spaceId:'owned-space',tabId:42,state:'running'}}));
  await until(() => agent.messages.some(m => m.id === 'open'));
  const other = await peer(port, true);
  hello(other, true, 'space-other');
  await until(() => other.messages.some(m => m.type === 'welcome'));
  const send = (id, tabId=42) => agent.socket.send(JSON.stringify({type:'cmd',id,cmd:'snapshot',tabId,params:{spaceId:'owned-space'}}));
  send('wrong-tab', 43);
  await until(() => agent.messages.some(m => m.id === 'wrong-tab'));
  assert.equal(agent.messages.find(m => m.id === 'wrong-tab').error.code,'SPACE_STOPPED');
  send('pinned');
  await until(() => owner.messages.some(m => m.id === 'pinned'));
  assert.equal(other.messages.some(m => m.id === 'pinned'),false);
  const pinned = owner.messages.find(m => m.id === 'pinned');
  owner.socket.send(JSON.stringify({type:'res',id:pinned.id,__k:pinned.__k,ok:true,data:'owned answer'}));
  await until(() => agent.messages.some(m => m.id === 'pinned'));
  const closed = onceClosed(owner.socket);
  owner.socket.close();
  await closed;
  send('after-disconnect');
  await until(() => agent.messages.some(m => m.id === 'after-disconnect'));
  assert.equal(agent.messages.find(m => m.id === 'after-disconnect').error.code,'SPACE_STOPPED');
  assert.equal(other.messages.some(m => m.id === 'after-disconnect'),false);
});

const onceClosed = socket => new Promise(resolve => socket.once('close',resolve));

test('TaskSpace profile selection and page membership cannot fall back to another profile', async t => {
  const server = startBridge({ port: 0, writeInfo: false, token: 'synthetic-release-token', auditFn: () => {} });
  t.after(() => server.close());
  await server.ready;
  const port = server.wss.address().port;
  const first = await peer(port, true), second = await peer(port, true), agent = await peer(port);
  hello(first, true, 'first-profile'); hello(second, true, 'second-profile'); hello(agent, false);
  await until(() => [first, second, agent].every(p => p.messages.some(m => m.type === 'welcome')));
  const send = (id, params, cmd = 'spaces', tabId) => agent.socket.send(JSON.stringify({type:'cmd', id, cmd, params, tabId}));
  const response = async id => { await until(() => agent.messages.some(m => m.id === id)); return agent.messages.find(m => m.id === id); };
  const reply = async (id, data) => {
    await until(() => second.messages.some(m => m.id === id));
    const command = second.messages.find(m => m.id === id);
    second.socket.send(JSON.stringify({type:'res',id,__k:command.__k,ok:true,data}));
    return response(id);
  };
  send('profiles', {action:'profiles'});
  assert.deepEqual((await response('profiles')).data.profiles.map(p => p.profileId).sort(), ['first-profile','second-profile']);
  for (const action of ['open', 'list', 'claim']) {
    send(`ambiguous-${action}`, {action, url:'https://example.test'});
    assert.equal((await response(`ambiguous-${action}`)).error.code, 'SPACE_STOPPED');
  }
  send('missing-profile', {action:'open', profileId:'offline', url:'https://example.test'});
  assert.equal((await response('missing-profile')).error.code, 'SPACE_STOPPED');
  send('selected', {action:'open', profileId:'second-profile', url:'https://example.test'});
  await reply('selected', {spaceId:'multi',state:'running',pages:[{label:'main',tabId:42}]});
  assert.equal(first.messages.some(m => m.id === 'selected'), false);
  send('selected-list', {action:'list',profileId:'second-profile'});
  await reply('selected-list', {spaces:[{spaceId:'multi'}]});
  send('new-page', {action:'new-page',spaceId:'multi',pageLabel:'reference',url:'https://example.test'});
  await reply('new-page', {spaceId:'multi',pages:[{label:'main',tabId:42},{label:'reference',tabId:43}]});
  send('second-page', {spaceId:'multi'}, 'snapshot', 43);
  await reply('second-page', {text:'reference'});
  send('released', {action:'release-page',spaceId:'multi',pageLabel:'reference'});
  await reply('released', {spaceId:'multi',pages:[{label:'main',tabId:42}]});
  send('released-page', {spaceId:'multi'}, 'snapshot', 43);
  assert.equal((await response('released-page')).error.code, 'SPACE_STOPPED');
  send('in-flight', {spaceId:'multi'}, 'snapshot', 42);
  await until(() => second.messages.some(m => m.id === 'in-flight'));
  const replacement = await peer(port, true);
  hello(replacement, true, 'second-profile');
  await until(() => replacement.messages.some(m => m.type === 'welcome'));
  const interrupted = await response('in-flight');
  assert.equal(interrupted.error.code, 'NO_EXTENSION');
  assert.match(interrupted.error.message, /not replayed/);
  send('replaced', {spaceId:'multi'}, 'snapshot', 42);
  assert.equal((await response('replaced')).error.code, 'SPACE_STOPPED');
  assert.equal(replacement.messages.some(m => m.id === 'replaced'), false);
  send('restore-list',{action:'list',profileId:'second-profile'});
  await until(()=>replacement.messages.some(m=>m.id==='restore-list'));
  const listing=replacement.messages.find(m=>m.id==='restore-list');
  replacement.socket.send(JSON.stringify({type:'res',id:listing.id,__k:listing.__k,ok:true,data:{spaces:[{spaceId:'multi',owned:true,state:'recovered',pages:[{tabId:42}]}]}}));
  await response('restore-list');
  send('restored-status',{action:'status',spaceId:'multi'});
  await until(()=>replacement.messages.some(m=>m.id==='restored-status'));
  assert.equal(first.messages.some(m=>m.id==='restored-status'),false);
  const status=replacement.messages.find(m=>m.id==='restored-status');
  replacement.socket.send(JSON.stringify({type:'res',id:status.id,__k:status.__k,ok:true,data:{spaceId:'multi',state:'recovered',pages:[{tabId:42}]}}));
  await response('restored-status');
  const newcomer=await peer(port);hello(newcomer,false);
  await until(()=>newcomer.messages.some(m=>m.type==='welcome'));
  const sendNew=(id,params)=>newcomer.socket.send(JSON.stringify({type:'cmd',id,cmd:'spaces',params}));
  const newResponse=async id=>{await until(()=>newcomer.messages.some(m=>m.id===id));return newcomer.messages.find(m=>m.id===id);};
  const replyNew=async(id,data,ok=true)=>{
    await until(()=>replacement.messages.some(m=>m.id===id));
    const command=replacement.messages.find(m=>m.id===id);
    replacement.socket.send(JSON.stringify({type:'res',id,__k:command.__k,ok,data,error:ok?undefined:{code:'SPACE_STOPPED',message:'Explicit authorization required'}}));
    return newResponse(id);
  };
  sendNew('new-list',{action:'list',profileId:'second-profile'});
  await replyNew('new-list',{spaces:[{spaceId:'multi',owned:false,pages:[{tabId:42}]}]});
  sendNew('not-owner',{action:'status',spaceId:'multi'});
  assert.equal((await newResponse('not-owner')).error.code,'SPACE_STOPPED');
  sendNew('denied-claim',{action:'claim',spaceId:'multi',profileId:'second-profile'});
  assert.equal((await replyNew('denied-claim',null,false)).ok,false);
  sendNew('claim',{action:'claim',spaceId:'multi',profileId:'second-profile',userConfirmed:true});
  await replyNew('claim',{spaceId:'multi',state:'recovered',pages:[{tabId:42}]});
  sendNew('claimed-status',{action:'status',spaceId:'multi'});
  await replyNew('claimed-status',{spaceId:'multi',state:'recovered',pages:[{tabId:42}]});
  send('old-owner',{action:'status',spaceId:'multi'});
  assert.equal((await response('old-owner')).error.code,'SPACE_STOPPED');

});
