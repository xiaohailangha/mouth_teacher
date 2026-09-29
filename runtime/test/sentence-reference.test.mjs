import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sampleFrames,controlsFromFrame} from '../public/timeline.mjs';
import {faceRound29Weights} from '../public/face-round29.mjs';
test('sentence reference uses identical audio and keeps authored bilabial holds closed',()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../public/reference/'+name,import.meta.url),'utf8'));
 const source=read('baba-azure.json'),reference=read('baba-reference.json');
 assert.equal(reference.audioBase64,source.audioBase64);
 assert.equal(reference.source,'authored-reference');
 assert.deepEqual(reference.syllables,[]);
 assert.equal(reference.reference.clinicalValidated,false);
 for(const [i,frame] of reference.frames.entries()){
  assert.equal(frame.values.length,55);
  assert.ok(frame.values.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
  if(i)assert.ok(frame.time>reference.frames[i-1].time);
 }
 for(const time of [.10,.265,.375,.535,.7,1.48,1.858,2.065]){
  const weights=faceRound29Weights(controlsFromFrame(sampleFrames(reference.frames,time)));
  assert.ok(weights.jawOpen<.015,`lip seal at ${time}: ${weights.jawOpen}`);
 }
 const vowel=faceRound29Weights(controlsFromFrame(sampleFrames(reference.frames,.447)));
 assert.ok(vowel.jawOpen>.6);
 assert.ok(vowel.mouthPucker>.3&&vowel.mouthPucker<.5);
});
