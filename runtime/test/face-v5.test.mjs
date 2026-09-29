import test from 'node:test';
import assert from 'node:assert/strict';
import {faceV5Weights} from '../public/face-v5.mjs';
test('tongue jaw correction interpolates between Blender sample poses',()=>{
 const v=faceV5Weights({jawOpen:.375,tongueExtend:.8});
 assert.equal(v.tongueExtend_jaw25,.4);assert.equal(v.tongueExtend_jaw50,.4);
 assert.equal(v.tongueExtend_jaw75,0);assert.equal(v.tongueJawCorrection25,.5);
});
test('stop-to-neutral clears all tongue corrections',()=>{
 const v=faceV5Weights({jawOpen:0});
 for(const [name,value] of Object.entries(v))assert.equal(value,0,name);
});
test('legacy articulation maps to new tongue morphs without requiring bones',()=>{
 const v=faceV5Weights({jawOpen:1,tongueTipUp:.7,tongueMidUp:.4});
 assert.equal(v.tongueTipRaisePreview_jaw100,.7);assert.equal(v.tongueMiddleRaise_jaw100,.4);
});
