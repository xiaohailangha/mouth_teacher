import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
for(const directory of ['character','character-v2','character-v3','character-v4']){
const file=new URL(`../public/${directory}/tiger.glb`,import.meta.url);
const bytes=fs.readFileSync(file),gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
const controls=JSON.parse(fs.readFileSync(new URL(`../public/${directory}/controls.json`,import.meta.url)));
test(`${directory}: runtime neutral pose matches GLB bind pose for every exported bone`,()=>{
 assert.equal(bytes.toString('utf8',0,4),'glTF');assert.equal(bytes.readUInt32LE(8),bytes.length);
 for(const [name,base] of Object.entries(controls.neutral)){
  const node=gltf.nodes.find(n=>n.name===name);assert.ok(node,`missing ${name}`);
  const p=node.translation||[0,0,0],q=node.rotation||[0,0,0,1],s=node.scale||[1,1,1];
  assert.ok(p.every((v,i)=>Math.abs(v-base.p[i])<.0001),`position ${name}`);
  const dot=q.reduce((sum,v,i)=>sum+v*base.q[i],0);assert.ok(Math.abs(dot)>.9999,`rotation ${name}`);
  assert.ok(s.every((v,i)=>Math.abs(v-base.s[i])<.0001),`scale ${name}`);
 }
});
test(`${directory}: lips and eyelids have nonempty morphs; jaw is exclusively skeletal`,()=>{
 const names=gltf.meshes.flatMap(m=>m.extras?.targetNames||[]);
 for(const name of controls.mappedMorphs)assert.ok(names.includes(name),`missing morph ${name}`);
 assert.ok(!names.includes('jawOpen'));assert.ok(gltf.skins.length>0);assert.ok(!gltf.animations?.length);
 const jaw=controls.poses.jawOpen['jawbone.x'];assert.notDeepEqual(jaw,controls.neutral['jawbone.x']);
});
if(directory!=='character')test(`${directory}: all 13 hair curves and both head accessories retain skeleton attachment`,()=>{
 const hair=gltf.nodes.filter(n=>n.name.startsWith('Teacher_NurbsPath'));
 assert.equal(hair.length,13);assert.ok(hair.every(n=>n.skin!==undefined));
 for(const name of ['Teacher_Cube.002','Teacher_Cube.003'])assert.ok(gltf.nodes.some(n=>n.name===name&&n.skin!==undefined),name);
 assert.equal(controls.meshCount,28);
 const a=controls.poses.jawOpen['jawbone.x'],b=controls.poses.jawClosedLips['jawbone.x'];
 assert.deepEqual(a,b,'lip retention must not add a second jaw motion');
});
if(directory==='character-v3')test('tongue regions and gestures have independent nonempty skeletal poses',()=>{
 for(const [pose,bone] of [['tongueTipUp','tong_03.x'],['tongueMidUp','tong_02.x'],['tongueRootUp','tong_01.x'],['gestureWave','hand.r'],['gesturePresent','hand.l']])assert.notDeepEqual(controls.poses[pose][bone],controls.neutral[bone],pose);
 assert.notDeepEqual(controls.poses.tongueTipUp,controls.poses.tongueMidUp);
});
}


