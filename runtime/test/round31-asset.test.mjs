import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('R31 exported tongue posterior target keeps front displacement below 0.15 mm after subdivision and preserves oral material',()=>{
 const b=fs.readFileSync(new URL('../public/character-v5/face-round31.glb',import.meta.url)),size=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+size)),bin=b.subarray(28+size);
 assert.equal(b.length,b.readUInt32LE(8));assert(j.materials.some(m=>m.name==='Oral_Cavity'));
 function accessor(id){const a=j.accessors[id],out=new Float32Array(a.count*3);
  if(a.bufferView!==undefined){const v=j.bufferViews[a.bufferView];for(let i=0;i<a.count;i++)for(let k=0;k<3;k++)out[i*3+k]=bin.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||12)+k*4);}
  if(a.sparse){const s=a.sparse,iv=j.bufferViews[s.indices.bufferView],vv=j.bufferViews[s.values.bufferView],width={5121:1,5123:2,5125:4}[s.indices.componentType];for(let i=0;i<s.count;i++){const index=bin.readUIntLE((iv.byteOffset||0)+(s.indices.byteOffset||0)+i*width,width);for(let k=0;k<3;k++)out[index*3+k]=bin.readFloatLE((vv.byteOffset||0)+(s.values.byteOffset||0)+i*12+k*4);}}
  return out;
 }
 const mesh=j.meshes[j.nodes.find(n=>n.name==='Teacher_舌头').mesh],p=mesh.primitives[0],base=accessor(p.attributes.POSITION),delta=accessor(p.targets[mesh.extras.targetNames.indexOf('tongueRootRaise')].POSITION);
 const ys=Array.from({length:base.length/3},(_,i)=>base[i*3+1]),lo=Math.min(...ys),hi=Math.max(...ys);let fixed=0,max=0;
 for(let i=0;i<ys.length;i++){const d=Math.hypot(...delta.subarray(i*3,i*3+3));max=Math.max(max,d);if(ys[i]<lo+(hi-lo)*.25){assert(d<.00015);fixed++;}}
 assert(fixed>100);assert(max>.008);
});
