const fs=require('fs'),assert=require('assert/strict');
function read(dir){const b=fs.readFileSync('D:/AI语言训练/mouth_teacher/runtime/public/'+dir+'/tiger.glb'),len=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+len));return {j,bin:b.subarray(28+len)};}
const a=read('character-v3'),b=read('character-round-candidate'),changed=[];
function bytes(g,id){const ac=g.j.accessors[id];const view=i=>{const v=g.j.bufferViews[i];return g.bin.subarray(v.byteOffset||0,(v.byteOffset||0)+v.byteLength);};const parts=[];if(ac.bufferView!==undefined)parts.push(view(ac.bufferView));if(ac.sparse)parts.push(view(ac.sparse.indices.bufferView),view(ac.sparse.values.bufferView));return Buffer.concat(parts);}
assert.deepEqual(a.j.nodes,b.j.nodes);assert.deepEqual(a.j.skins,b.j.skins);
for(let m=0;m<a.j.meshes.length;m++){const x=a.j.meshes[m],y=b.j.meshes[m];assert.equal(x.name,y.name);for(let p=0;p<x.primitives.length;p++){const u=x.primitives[p],v=y.primitives[p];for(const key of Object.keys(u.attributes))assert(bytes(a,u.attributes[key]).equals(bytes(b,v.attributes[key])),x.name+' '+key);for(let t=0;t<(u.targets||[]).length;t++)for(const key of Object.keys(u.targets[t]))if(!bytes(a,u.targets[t][key]).equals(bytes(b,v.targets[t][key]))){const name=x.extras.targetNames[t];assert.equal(name,'mouthPucker');changed.push({mesh:x.name,target:name,attribute:key});}}}
assert(changed.length>0);fs.writeFileSync('D:/AI语言训练/mouth_teacher/work/v4/round-diff.json',JSON.stringify({onlyPuckerChanged:true,changed},null,2));console.log(JSON.stringify(changed));

