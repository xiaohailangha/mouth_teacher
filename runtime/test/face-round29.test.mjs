import test from 'node:test';
import assert from 'node:assert/strict';
import {faceRound29Weights} from '../public/face-round29.mjs';
import {speechFace} from '../public/speech-face.mjs';
test('round29 halfway extension reproduces Blender clearance and arc weights',()=>{
 const v=faceRound29Weights({jawOpen:.7,tongueExtend:.5});
 assert.equal(v.tongueExtendClearance,1);assert.ok(Math.abs(v.tongueRestClearance-.42)<1e-8);
 assert.ok(Math.abs(v.jawArcCorrection75-.8)<1e-8);assert.equal(v.jawLipExposure,.7);
});
test('coordinated closure applies once before all dependent correctives',()=>{
 const v=faceRound29Weights({jawOpen:.7,mouthClose:.5});assert.equal(v.jawOpen,.35);
 const zero=faceRound29Weights({});assert.ok(Object.values(zero).every(v=>v===0));
});
test('A2F solved jaw is not nearly erased by its simultaneous mouthClose',()=>{
 const v=faceRound29Weights({jawOpen:.8,mouthClose:.9},{a2f:true});
 assert.ok(v.jawOpen>.5);
 assert.ok(v.jawOpen<.8);
 assert.ok(Math.abs(faceRound29Weights({jawOpen:.8,mouthClose:.9}).jawOpen-.08)<1e-8);
});
test('clear speech preserves b/p/m contact and silence despite jaw amplification',()=>{
 const row=Array(55).fill(0);row[17]=.6;row[18]=.5;
 for(const id of [0,21])assert.equal(speechFace(row,[{time:0,id}],.2).jawOpen,0);
 const events=[{time:0,id:2}];
 assert.ok(speechFace(row,events,.2).jawOpen>speechFace(row,events,.2,'legacy').jawOpen);
 assert.equal(speechFace(row,events,.2,'raw').jawOpen,.6);
 assert.equal(speechFace(row,events,.2,'raw').mouthClose,0);
});
test('Azure full-face comparison retains expression channels without incompatible R31 closure',()=>{
 const row=Array(55).fill(0);row[0]=.87;row[17]=.6;row[18]=.5;row[43]=.3;row[51]=.4;
 const full=speechFace(row,[{time:0,id:2}],.2,'full');
 assert.equal(full.eyeBlinkLeft,.87);assert.equal(full.browInnerUp,.3);assert.equal(full.jawOpen,.6);
 assert.equal(full.mouthClose,0);assert.equal(full.tongueOut,0);
 assert.equal(speechFace(row,[{time:0,id:2}],.2).eyeBlinkLeft,0);
});
