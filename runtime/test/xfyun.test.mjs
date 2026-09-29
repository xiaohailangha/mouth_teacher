import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTiming,timingFrames,pcmWav} from '../xfyun.mjs';
test('XFYun captured phoneme durations preserve silence and 5ms units',()=>{
 const raw='sil:28;你[=ni2]-n2:9;@-i2:9;好[=hao3]-h3:18;@-ao3:18;呀[=ya6]*-ia6:37;@-sp6:60;我[=wo3]-uo3:14;们[=men5]*-m5:18;@-en5:9;慢[=man4]-m4:18;@-an4:14;慢[=man4]*-m4:14;@-an4:14;说[=shuo1]*-sh1:23;@-uo1:18;sil:113;';
 const result=parseTiming(raw);assert.ok(Math.abs(result.duration-2.17)<1e-9);assert.equal(result.phonemes[6].name,'sp');assert.equal(result.phonemes[8].name,'m');assert.throws(()=>parseTiming('broken-data;'));
 const frames=timingFrames(result.phonemes,result.duration);assert.ok(frames.every(f=>f.values.length===55&&f.values.every(v=>Number.isFinite(v)&&v>=0&&v<=1)));assert.ok(frames[0].values.every(v=>v===0));assert.ok(frames.at(-1).values.every(v=>v===0));
});
test('XFYun PCM uses correct 24kHz mono WAV duration',()=>{const wave=pcmWav(Buffer.alloc(48000));assert.equal(wave.readUInt32LE(24),24000);assert.equal(wave.readUInt32LE(28),48000);assert.equal(wave.readUInt32LE(40),48000);assert.equal(wave.length,48044);});
