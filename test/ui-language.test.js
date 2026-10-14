import test from 'node:test';
import assert from 'node:assert/strict';
import '../extension/ui-language.js';
import {taskPresentation, activityLabel} from '../extension/workspace-state.js';
const ui = globalThis.BeatBrowserUI;
test('language follows Chrome unless the user has chosen one', () => {
  assert.equal(ui.resolve(undefined, 'zh-CN'), 'zh');
  assert.equal(ui.resolve(undefined, 'zh-TW'), 'zh');
  assert.equal(ui.resolve(undefined, 'ja-JP'), 'en');
  assert.equal(ui.resolve('en', 'zh-CN'), 'en');
  assert.equal(ui.resolve('zh', 'en-US'), 'zh');
  assert.equal(ui.resolve('invalid', 'en-US'), 'en');
});
test('system text translates while agent messages and parameter values stay intact', () => {
  assert.equal(ui.text('Continue', 'zh'), '\u7ee7\u7eed');
  assert.equal(ui.text('Continue', 'en'), 'Continue');
  assert.equal(ui.text('Custom agent message', 'zh'), 'Custom agent message');
  assert.equal(ui.text('{count} pages', 'zh', {count:2}), '2 \u4e2a\u9875\u9762');
  for (const key of ui.keys) {
    assert(ui.text(key,'en').trim());assert(ui.text(key,'zh').trim());
    assert.deepEqual(ui.text(key,'zh').match(/\{\w+\}/g),key.match(/\{\w+\}/g));
  }
});
test('Chinese task controls retain pause and terminal semantics', () => {
  const paused=taskPresentation({state:'user',pauseReason:'review-requested'},'zh');
  assert.equal(paused.label,'\u5df2\u6682\u505c');assert.equal(paused.canResume,true);
  assert.equal(taskPresentation({state:'finished'},'zh').canResume,false);
  assert.equal(activityLabel({type:'user',reason:'window-focused'},'zh'),'\u7a97\u53e3\u83b7\u5f97\u7126\u70b9');
});
