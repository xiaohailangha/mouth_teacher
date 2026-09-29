import test from 'node:test';
import assert from 'node:assert/strict';
import {retargetControls,normalizeVisemes,visemeWeights} from '../public/retarget.mjs';
const input=()=>{const row=Array(55).fill(0);row[17]=.55;row[18]=.35;row[19]=.2;row[20]=.15;row[37]=.4;row[38]=.4;return row;};
test('bilabial contact and silence neutralize generic Azure resting mouth values',()=>{
 for(const id of [0,21]){
  const c=retargetControls(input(),[{time:0,id}],.2);
  assert.equal(c.jawOpen,0);assert.equal(c.mouthPucker,0);assert.equal(c.mouthFunnel,0);assert.equal(c.mouthLowerDownLeft,0);
 }
 assert.ok(retargetControls(input(),[{time:0,id:2}],.2).jawOpen>.45);
});
test('rounded vowel remains distinct from open vowel and retains a small aperture',()=>{
 const u=retargetControls(input(),[{time:0,id:7}],.2),a=retargetControls(input(),[{time:0,id:2}],.2);
 assert.ok(u.mouthPucker>.8);assert.ok(a.mouthPucker<.2);assert.ok(u.jawOpen<a.jawOpen);assert.ok(u.jawOpen>0);assert.ok(u.jawLipRetain>.5);
});
test('viseme timeline sorts chunk events and crossfades at phoneme boundaries',()=>{
 const events=normalizeVisemes([{time:.1,id:21},{time:0,id:0},{time:0,id:0},{time:.2,id:2}]);
 assert.equal(events.length,3);const blend=visemeWeights(events,.2);
 assert.ok(Math.abs(blend.get(21)-.5)<1e-6);assert.ok(Math.abs(blend.get(2)-.5)<1e-6);
});
