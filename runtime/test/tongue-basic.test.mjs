import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sampleBasicTongue} from '../public/tongue-basic.mjs';
const p=JSON.parse(fs.readFileSync(new URL('../public/reference/tongue-diagnostic.json',import.meta.url)));
test('actual diagnostic audio drives distinct tongue regions including pre-word d/g events',()=>{
 for(const [time,channel] of [[.16,'tongueTipUp'],[.77,'tongueTipUp'],[1.3775,'tongueRootUp'],[2.3,'tongueMidUp']]){
  const v=sampleBasicTongue(p.syllables,p.visemes,time);assert(v.controls[channel]>.7);
  assert(Object.entries(v.controls).filter(([k])=>k!==channel).every(([,v])=>v===0));
 }
 for(const time of [0,.67,1.26,2.6])assert(Object.values(sampleBasicTongue(p.syllables,p.visemes,time).controls).every(v=>v===0));
});
test('unrecognized syllables and absent alignment do not invent tongue motions',()=>{
 assert.equal(sampleBasicTongue([{pinyin:'sha',time:0,end:1}],p.visemes,.2).supported,false);
 assert(Object.values(sampleBasicTongue([],p.visemes,.16).controls).every(v=>v===0));
});
test('audio-time sampling is deterministic and continuous at anticipation and release',()=>{
 for(let t=0;t<2.6;t+=.003){
  const a=sampleBasicTongue(p.syllables,p.visemes,t),b=sampleBasicTongue(p.syllables,p.visemes,t+.00001);
  assert.deepEqual(a,sampleBasicTongue(p.syllables,p.visemes,t));
  for(const k of Object.keys(a.controls))assert(Math.abs(a.controls[k]-b.controls[k])<.001);
 }
});
