import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFrames,sampleFrames,CHANNELS} from '../public/timeline.mjs';
import {SpeechPlayer} from '../public/player.mjs';
import {escapeXml} from '../speech.mjs';
const row=(v)=>Array(55).fill(v);
test('Azure frame indexes preserve initial silence and out-of-order chunks',()=>{
 const frames=normalizeFrames([{FrameIndex:31,BlendShapes:[row(1)]},{FrameIndex:30,BlendShapes:[row(0)]}]);
 assert.equal(sampleFrames(frames,.49)[17],0);assert.equal(sampleFrames(frames,30.5/60)[17],.5);assert.equal(sampleFrames(frames,2)[17],0);
 assert.equal(CHANNELS[17],'jawOpen');assert.equal(CHANNELS[51],'tongueOut');
});
test('rejects absent, malformed, duplicate and missing blend frames',()=>{
 for(const groups of [[],[{FrameIndex:0,BlendShapes:[[1]]}],[{FrameIndex:0,BlendShapes:[row(NaN)]}],[{FrameIndex:0,BlendShapes:[row(0)]},{FrameIndex:0,BlendShapes:[row(1)]}],[{FrameIndex:0,BlendShapes:[row(0)]},{FrameIndex:2,BlendShapes:[row(1)]}]]) assert.throws(()=>normalizeFrames(groups));
});
test('clamps Azure blendshape overshoot to valid morph weights',()=>{
 const [frame]=normalizeFrames([{FrameIndex:0,BlendShapes:[[ -.052, 1.02, ...row(.2).slice(2) ]]}]);
 assert.equal(frame.values[0],0);
 assert.equal(frame.values[1],1);
 assert.equal(frame.values[2],.2);
});
class AudioFake extends EventTarget {paused=true;currentTime=0;async play(){this.paused=false;}pause(){this.paused=true;}removeAttribute(){this.src='';}load(){this.currentTime=0;}}
const packet={source:'test',frames:[{time:0,values:row(0)},{time:1,values:row(1)}]};
function player(fetchSpeech=async()=>packet){const audio=new AudioFake();const p=new SpeechPlayer({audio,fetchSpeech,makeUrl:()=> 'blob:test',revokeUrl:()=>{}});return {audio,p};}
test('mouth follows actual audio progress, pause/resume and stop clear state',async()=>{
 const {p,audio}=player();await p.speak('从未预录的新句子');audio.currentTime=.5;assert.equal(p.sample()[17],.5);
 p.pause();assert.equal(p.sample()[17],0);assert.equal(audio.currentTime,.5);
 await p.resume();assert.equal(p.sample()[17],.5);p.stop();assert.equal(p.sample()[17],0);assert.equal(audio.src,'');assert.equal(p.state,'idle');
});
test('late synthesis cannot restart after stop or replace a newer sentence',async()=>{
 const resolves=[];const {p}=player(()=>new Promise(r=>resolves.push(r)));
 const first=p.speak('旧句子');const second=p.speak('新句子');resolves[0](packet);await first;assert.equal(p.state,'synthesizing');
 p.stop();resolves[1](packet);await second;assert.equal(p.state,'idle');assert.equal(p.frames.length,0);
});
test('SSML cannot be injected through arbitrary text',()=>assert.equal(escapeXml('<voice>&"\''),'&lt;voice&gt;&amp;&quot;&apos;'));

test('seeking during a pending play request cannot be undone by its late completion',async()=>{
 const {p,audio}=player();audio.duration=1;let complete;
 audio.play=()=>new Promise(resolve=>{complete=resolve;});
 const loading=p.load(packet);assert.equal(p.state,'ready');
 assert.equal(p.seek(.5),true);assert.equal(p.state,'paused');assert.equal(audio.currentTime,.5);
 complete();await loading;assert.equal(p.state,'paused');assert.equal(audio.paused,true);
 p.stop();assert.equal(p.seek(.5),false);assert.equal(audio.currentTime,0);
});

test('selected speed survives audio resource reset, replay, seeking and resume',async()=>{
 const {p,audio}=player();
 audio.load=()=>{audio.currentTime=0;audio.playbackRate=audio.defaultPlaybackRate??1;};
 Object.defineProperty(audio,'src',{get(){return this._src;},set(v){this._src=v;this.playbackRate=this.defaultPlaybackRate??1;}});
 for(const rate of [.275,.325,.4,.5]){
  p.setPlaybackRate(rate);await p.speak('慢一点');assert.equal(audio.playbackRate,rate);assert.equal(audio.defaultPlaybackRate,rate);
  p.stop();await p.load(packet);assert.equal(audio.playbackRate,rate);
  audio.duration=1;p.seek(.4);await p.resume();assert.equal(audio.playbackRate,rate);assert.equal(audio.preservesPitch,true);
 }
});
