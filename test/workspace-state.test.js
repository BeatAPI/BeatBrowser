import test from 'node:test';
import assert from 'node:assert/strict';
import {taskPresentation,activityLabel} from '../extension/workspace-state.js';
test('focus pauses do not claim the human caused them or requested a review',()=>{
 const focused=taskPresentation({state:'user',pauseReason:'window-focused'});
 assert.match(focused.detail,/Window focused/);assert.doesNotMatch(focused.detail,/You have|requested/);
 assert.match(taskPresentation({state:'user',pauseReason:'review-requested'}).detail,/Review requested/);
 assert.equal(activityLabel({type:'user',reason:'window-focused'}),'Window gained focus');
});
test('finished tasks do not offer resume; unknown legacy pauses remain neutral',()=>{
 assert.equal(taskPresentation({state:'finished'}).canResume,false);
 assert.equal(taskPresentation({state:'finished'}).terminal,true);
 assert.equal(taskPresentation({state:'user'}).label,'Paused');
 assert.doesNotMatch(taskPresentation({state:'user'}).detail,/You have control/);
});
