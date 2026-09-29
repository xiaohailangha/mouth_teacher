import test from 'node:test';
import assert from 'node:assert/strict';
import {speechMotion} from '../public/speech-motion.mjs';
test('body beats follow phrase starts, avoid every-syllable waving and rest between phrases',()=>{
 const words=Array.from({length:8},(_,i)=>({time:i*.5,duration:.4,text:'字'}));
 assert.equal(speechMotion(words,-1).gesturePresent,0);
 assert(speechMotion(words,.8).gesturePresent>.3);
 assert.equal(speechMotion(words,2.5).gesturePresent,0);
 words.push({time:4.5,duration:.5,text:'新'});
 assert(speechMotion(words,5.3).gesturePresent>.3);
 assert.deepEqual(speechMotion(words,5.3),speechMotion(words,5.3));
 assert.equal(speechMotion([],5).gesturePresent,0);
});
