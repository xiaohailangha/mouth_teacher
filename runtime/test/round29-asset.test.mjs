import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('round29 exported GLB is complete and includes runtime corrective shapes',()=>{
 const bytes=fs.readFileSync(new URL('../public/character-v5/face-round29.glb',import.meta.url));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
 assert.ok(!json.skins?.length);
 const meshes=json.meshes;
 for(const name of ['jawArcCorrection25','jawArcCorrection50','jawArcCorrection75','jawLipExposure','tongueExtendClearance','tongueRestClearance']){
  const mesh=meshes.find(m=>m.extras?.targetNames?.includes(name));assert.ok(mesh,name);
  const index=mesh.extras.targetNames.indexOf(name);
  assert.ok(mesh.primitives.some(p=>{const a=json.accessors[p.targets[index].POSITION];return [...(a.min||[]),...(a.max||[])].some(v=>Math.abs(v)>1e-7);}),name+' has nonzero deformation');
 }
});
