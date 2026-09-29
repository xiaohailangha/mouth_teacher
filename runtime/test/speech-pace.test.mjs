import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {resolveSpeechPace,paceContent,naturalContent} from '../speech-pace.mjs';
import {escapeXml} from '../speech.mjs';
test('natural pace uses allowlisted synthesis settings and pauses only at written boundaries',()=>{
 const p=resolveSpeechPace();assert.equal(p.rate,'-15%');
 const c=naturalContent('爸爸抱宝宝，妈妈买面包。',escapeXml,p);
 assert.equal(c,'爸爸抱宝宝，<break time="260ms"/>妈妈买面包。');
 assert.equal(naturalContent('你好',escapeXml,p),'你好');
 assert(!naturalContent('<voice>',escapeXml,p).includes('<voice>'));
 assert(!naturalContent('你好，妈妈。',escapeXml,resolveSpeechPace('normal')).includes('<break'));
 assert.throws(()=>resolveSpeechPace('"/><audio src="x'));assert(paceContent('你好',p).includes('rate="-15%"'));
});
test('each newly synthesized reference shares audio and timing, with playback at 1x',()=>{
 const read=name=>JSON.parse(fs.readFileSync(new URL('../public/reference/pace/'+name,import.meta.url)));
 for(const pace of ['gentle','normal','easy','extraSlow']){
  const a=read(pace+'-baba-azure.json'),b=read(pace+'-baba-reference.json'),t=read(pace+'-tongue-diagnostic.json');
  assert.equal(a.audioBase64,b.audioBase64);assert.equal(a.frames.length,b.frames.length);
  for(const p of [a,b,t]){assert.equal(p.playbackRate,1);assert.equal(p.speechPace,pace);assert.equal(p.synthesisRate,resolveSpeechPace(pace).rate);assert(p.frames.length>0);}
  assert.equal(t.syllables.length,4);
  assert(b.frames.every((f,i)=>f.time===a.frames[i].time&&f.values.length===55&&f.values.every(v=>v>=0&&v<=1)));
 }
});
