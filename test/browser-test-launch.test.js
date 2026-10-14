import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {browserTestArgs} from '../scripts/browser-test-launch.mjs';

test('Mac synthetic browser uses a mock keychain and only a disposable profile', () => {
  const temporaryDirectory = path.join(os.tmpdir(),'beat-spaces-test');
  const args = browserTestArgs({temporaryDirectory,extensionDirectory:'/test/extension',url:'http://127.0.0.1:3000',platform:'darwin'});
  assert(args.includes('--use-mock-keychain'));
  assert(args.includes('--headless=new'));
  assert(args.includes(`--user-data-dir=${path.join(temporaryDirectory,'profile')}`));
  assert(!args.some(a => a.includes('disable-web-security')));
});

test('synthetic test launcher refuses a real browser profile location', () => {
  assert.throws(() => browserTestArgs({temporaryDirectory:path.join(os.homedir(),'Library/Application Support/Google/Chrome'),extensionDirectory:'/test',url:'http://localhost'}),/disposable/);
});
