import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveVoiceProfile} from '../voice-profiles.mjs';
test('voice candidates are allowlisted and do not mutate another client configuration',()=>{
 const configured={voice:'zh-CN-YunxiNeural',role:'Boy',style:'cheerful',region:'eastus'};
 const selected=resolveVoiceProfile('yunxia',configured);
 assert.equal(selected.voice,'zh-CN-YunxiaNeural');assert.equal(selected.role,null);assert.equal(selected.style,null);
 assert.equal(selected.region,'eastus');assert.equal(configured.role,'Boy');
 assert.equal(resolveVoiceProfile('default',configured),configured);
 for(const invalid of ['constructor','__proto__','<voice>',{},null])assert.throws(()=>resolveVoiceProfile(invalid,configured),{status:400});
});
