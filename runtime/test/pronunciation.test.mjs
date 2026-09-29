import test from 'node:test';
import assert from 'node:assert/strict';
import {pronunciationPlan,alignSyllables} from '../pronunciation.mjs';
import {sampleArticulation} from '../public/articulation.mjs';

test('reviewed readings select a valid polyphone and reject wrong counts or injected spelling',()=>{
 const plan=pronunciationPlan('重行。','zhong4 hang2');
 assert.deepEqual(plan.syllables.map(s=>[s.pinyin,s.tone,s.initial]),[['zhong',4,'zh'],['hang',2,'h']]);
 assert(plan.content.includes('ph="zhong 4"'));assert.equal(plan.syllables[0].pronunciationSource,'parent-reviewed-explicit-ssml');
 for(const input of ['zhong4','zhong4 ma1','<voice> hang2',{},'zhong0 hang2'])assert.throws(()=>pronunciationPlan('重行',input));
});

test('tongue transitions continuously across observed boundaries and samples deterministically',()=>{
 const s={...pronunciationPlan('衣').syllables[0],time:.1,end:.6},events=[{time:0,id:6}];
 const sample=t=>sampleArticulation([s],events,t);
 assert(Math.abs(sample(.59999).controls.tongueMidUp-sample(.60001).controls.tongueMidUp)<.001);
 assert.equal(sample(.7).syllable,null);assert.deepEqual(sample(.7).controls,{});
 assert.equal(sample(.4).controls.tongueMidUp,.8);
 assert.deepEqual(sample(.6),sample(.6));assert.equal(sample(.60001).syllable,null);
});

test('contextual pronunciation is explicit and unsupported input cannot inject SSML',()=>{
 const plan=pronunciationPlan('重庆银行，女儿。');
 assert.deepEqual(plan.syllables.slice(0,4).map(s=>s.pinyin),['chong','qing','yin','hang']);
 assert(plan.content.includes('ph="nv 3"'));assert(!plan.content.includes('bookmark'));
 assert.throws(()=>pronunciationPlan('<voice>你好</voice>'));assert.throws(()=>pronunciationPlan('123'));assert.throws(()=>pronunciationPlan('啊'.repeat(81)));
});
test('alignment uses unequal observed word durations and rejects grouped or missing boundaries',()=>{
 const {syllables}=pronunciationPlan('奶奶。');
 const aligned=alignSyllables(syllables,[{text:'奶',time:.05,duration:.6},{text:'奶。',time:.9,duration:.3}]);
 assert.equal(aligned[0].end,.65);assert.equal(aligned[1].time,.9);
 assert.throws(()=>alignSyllables(syllables,[{text:'奶奶',time:.05,duration:1}]));
 assert.throws(()=>alignSyllables(syllables,[{text:'来',time:0,duration:.2},{text:'奶',time:.2,duration:.2}]));
});
test('same viseme does not confuse apical i, normal i, u and ü',()=>{
 const sample=(text,id)=>{const s=pronunciationPlan(text).syllables[0];return sampleArticulation([{...s,time:0,end:1}],[{time:0,id}],.5);};
 assert(sample('衣',6).controls.tongueMidUp>.5);
 assert.equal(sample('吃',6).supported,true);assert.equal(sample('吃',6).controls.tongueMidUp,0);assert(sample('吃',6).controls.tongueRetroflex>.5);
 assert.equal(sample('思',6).controls.tongueRetroflex,0);assert(sample('思',6).controls.tongueGroove>.5);
 assert(sample('鱼',7).controls.tongueMidUp>.5);assert.equal(sample('乌',7).controls.tongueMidUp,0);
 assert.equal(sample('啊',19).controls.tongueTipUp,0);
 assert(sample('奶',19).controls.tongueTipUp>.5);
 assert(sample('奶',19).jawLimit<=.11);assert(sample('哥',20).jawLimit<=.16);assert(sample('衣',6).jawLimit<=.19);
 assert.equal(sample('展',19).supported,true);assert(sample('展',19).controls.tongueRetroflex>.5);
 const zhan=pronunciationPlan('展').syllables[0];
 const ending=sampleArticulation([{...zhan,time:0,end:1}],[{time:0,id:19},{time:.1,id:15},{time:.2,id:2},{time:.4,id:19}],.5);
 assert(ending.controls.tongueTipUp>.5);assert.equal(ending.controls.tongueRetroflex,0);
 assert.equal(sampleArticulation([],[],1).syllable,null);
});
