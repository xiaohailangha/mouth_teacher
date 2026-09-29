import * as THREE from 'three';

// Character-space oral envelope. This is a fitted collision reference, not a
// clinically measured palate. Keep CPU probes and the GPU correction identical.
export function palateFront(x){return -.260+.065*(x/.085)**2;}
export function palateHeight(x,y){return .964+.024*THREE.MathUtils.smoothstep(y,-.260,-.210)-.018*(x/.085)**2-.016*THREE.MathUtils.smoothstep(y,-.12,-.065);}
function constrainPoint(v){if(v.y>=palateFront(v.x)&&v.y<=-.065&&Math.abs(v.x)<=.085)v.z=Math.min(v.z,palateHeight(v.x,v.y)-.001);return v;}
export function constrainTongueShader(shader, envelope){
 shader.uniforms.oralToRest=envelope?.toRest||{value:new THREE.Matrix4()};
 shader.uniforms.oralFromRest=envelope?.fromRest||{value:new THREE.Matrix4()};
 shader.vertexShader='uniform mat4 oralToRest;\nuniform mat4 oralFromRest;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>',`#include <skinning_vertex>
 transformed=(oralToRest*vec4(transformed,1.0)).xyz;
 float across=pow(transformed.x/0.085,2.0);
 if(transformed.y>=-0.260+0.065*across && transformed.y<=-0.065 && abs(transformed.x)<=0.085){
  float roof=0.964+0.024*smoothstep(-0.260,-0.210,transformed.y)-0.018*across-0.016*smoothstep(-0.12,-0.065,transformed.y);
  transformed.z=min(transformed.z,roof-0.001);
 }
 transformed=(oralFromRest*vec4(transformed,1.0)).xyz;`);
}

// An explanatory tongue surface, fitted to this cartoon's teeth. It is not a scan.
// The posterior extension makes the root region observable; source tongue is retained.
export class OralView {
 constructor(model,renderer){
  this.model=model;this.active=false;this.saved=[];
  model.traverse(o=>{if(o.isMesh){let parent=o,tooth=false;while(parent&&parent!==model){if(parent.name.includes('牙齿'))tooth=true;parent=parent.parent;}this.saved.push({mesh:o,tooth,visible:o.visible,material:o.material,cast:o.castShadow,receive:o.receiveShadow});}});
  const source=model.getObjectByName('Teacher_舌头');
  if(!source?.isSkinnedMesh)throw Error('缺少可驱动舌体');
  const skeleton=source.skeleton;
  const boneIndex=n=>{const i=skeleton.bones.findIndex(b=>b.name===n||b.name===n.replaceAll('.',''));if(i<0)throw Error('缺少舌骨 '+n);return i;};
  const ids=[boneIndex('tong_03.x'),boneIndex('tong_02.x'),boneIndex('tong_01.x')];
  const anchor=boneIndex('head.x');
  const stations=[[-.264,.920,.005,.003],[-.246,.922,.034,.010],[-.212,.923,.055,.014],[-.171,.925,.059,.020],[-.125,.923,.055,.023],[-.083,.900,.042,.029],[-.065,.866,.030,.020],[-.063,.851,.025,.014]];
  const centerCurve=new THREE.CatmullRomCurve3(stations.map(v=>new THREE.Vector3(v[0],v[1],0)),false,'centripetal');
  const radiusCurve=new THREE.CatmullRomCurve3(stations.map(v=>new THREE.Vector3(v[2],v[3],0)),false,'catmullrom',.25);
  const pos=[],colors=[],indices=[],weights=[],skin=[],sides=24,rows=57;
  const palette=[new THREE.Color('#ef8065'),new THREE.Color('#edb548'),new THREE.Color('#9980d2')];
  for(let r=0;r<rows;r++){
   const t=r/(rows-1),center=centerCurve.getPoint(t),tangent=centerCurve.getTangent(t).normalize(),radii=radiusCurve.getPoint(t),v=[center.x,center.y,Math.max(.002,radii.x),Math.max(.002,radii.y)];
   const segment=t<.32?0:1,blend=segment===0?Math.min(1,t/.32):Math.min(1,(t-.32)/.36);
   // Color identifies the region being observed; it must not inherit the
   // bone-weight interpolation, which made most of the raised tip yellow.
   const color=t<.24?palette[0].clone().lerp(palette[1],THREE.MathUtils.smoothstep(t,.16,.24)):
    palette[1].clone().lerp(palette[2],THREE.MathUtils.smoothstep(t,.50,.62));
   for(let j=0;j<sides;j++){
    const angle=j/sides*Math.PI*2,thickness=Math.sin(angle)*v[3];pos.push(Math.cos(angle)*v[2],v[0]-thickness*tangent.y,v[1]+thickness*tangent.x);colors.push(color.r,color.g,color.b);
    const anchored=THREE.MathUtils.smoothstep(t,.65,1);
    skin.push(ids[segment],ids[segment+1],anchor,0);weights.push((1-blend)*(1-anchored),blend*(1-anchored),anchored,0);
    if(r<rows-1){const x=r*sides+j,y=r*sides+(j+1)%sides;indices.push(x,y,x+sides,y,y+sides,x+sides);}
   }
  }
  for(let j=1;j<sides-1;j++){indices.push(0,j+1,j);const end=(rows-1)*sides;indices.push(end,end+j,end+j+1);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skin,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));geometry.setIndex(indices);geometry.computeVertexNormals();
  geometry.morphTargetsRelative=true;geometry.morphAttributes.position=[];geometry.morphAttributes.normal=[];
  const bendCenter=t=>{const c=centerCurve.getPoint(t),front=THREE.MathUtils.smoothstep(-c.x,.195,.270);c.x+=.027*front;c.y+=.071*front;return c;};
  const bentRows=Array.from({length:rows},(_,r)=>{const t=r/(rows-1);return {center:bendCenter(t),tangent:bendCenter(Math.min(1,t+.001)).sub(bendCenter(Math.max(0,t-.001))).normalize(),radii:radiusCurve.getPoint(t)};});
  for(const name of ['tongueRetroflex','tongueGroove','tongueLateral']){
   const delta=new Float32Array(pos.length),target=new Float32Array(pos),normals=new Float32Array(pos.length);
   for(let i=0;i<pos.length/3;i++){
    const x=pos[i*3],y=pos[i*3+1],angle=(i%24)/24*Math.PI*2,upper=Math.max(0,Math.sin(angle));
    if(name==='tongueRetroflex'){const row=bentRows[Math.floor(i/24)],thickness=Math.sin(angle)*Math.max(.002,row.radii.y);delta[i*3+1]=row.center.x-thickness*row.tangent.y-pos[i*3+1];delta[i*3+2]=row.center.y+thickness*row.tangent.x-pos[i*3+2];}
    if(name==='tongueGroove')delta[i*3+2]=-.006*upper*Math.exp(-((x/.018)**2))*THREE.MathUtils.smoothstep(-y,.185,.230);
    if(name==='tongueLateral')delta[i*3+2]=-.009*upper*THREE.MathUtils.smoothstep(Math.abs(x),.015,.045)*THREE.MathUtils.smoothstep(-y,.165,.230);
    for(let axis=0;axis<3;axis++)target[i*3+axis]+=delta[i*3+axis];
   }
   const targetGeo=new THREE.BufferGeometry();targetGeo.setAttribute('position',new THREE.BufferAttribute(target,3));targetGeo.setIndex(indices);targetGeo.computeVertexNormals();
   for(let i=0;i<normals.length;i++)normals[i]=targetGeo.attributes.normal.array[i]-geometry.attributes.normal.array[i];targetGeo.dispose();
   const positionAttribute=new THREE.BufferAttribute(delta,3),normalAttribute=new THREE.BufferAttribute(normals,3);positionAttribute.name=name;normalAttribute.name=name;
   geometry.morphAttributes.position.push(positionAttribute);geometry.morphAttributes.normal.push(normalAttribute);
  }
  const tongue=new THREE.SkinnedMesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,side:THREE.DoubleSide,metalness:0}));
  this.envelope={toRest:{value:new THREE.Matrix4()},fromRest:{value:new THREE.Matrix4()}};
  this.headIndex=anchor;
  tongue.material.onBeforeCompile=shader=>constrainTongueShader(shader,this.envelope);tongue.material.customProgramCacheKey=()=> 'oral-ceiling-head-v1';
  this.source=source;this.teachingMaterial=tongue.material;this.normalMaterial=source.material.clone();this.normalMaterial.onBeforeCompile=source.material.onBeforeCompile;this.normalMaterial.customProgramCacheKey=source.material.customProgramCacheKey;
  const normalCompile=this.normalMaterial.onBeforeCompile;
  this.normalMaterial.onBeforeCompile=shader=>{normalCompile(shader);shader.uniforms.oralToRest=this.envelope.toRest;shader.uniforms.oralFromRest=this.envelope.fromRest;};
  tongue.name='TeachingTongue';source.parent.add(tongue);tongue.bind(skeleton,source.bindMatrix);tongue.frustumCulled=false;tongue.material=this.normalMaterial;tongue.visible=true;source.visible=false;this.tongue=tongue;
  this.skin=new THREE.MeshStandardMaterial({color:0xe4bcab,transparent:true,opacity:.055,depthWrite:false,side:THREE.FrontSide,roughness:1});
  renderer.localClippingEnabled=true;
  this.teeth=new THREE.MeshStandardMaterial({color:0xfff2d6,roughness:.5});this.gum=new THREE.MeshStandardMaterial({color:0xbd706e,roughness:.75});
  const roofGeo=new THREE.PlaneGeometry(.17,.19,20,24),p=roofGeo.attributes.position;
  for(let i=0;i<p.count;i++){const x=p.getX(i),t=(p.getY(i)+.095)/.19,y=THREE.MathUtils.lerp(palateFront(x),-.065,t);p.setXYZ(i,x,y,palateHeight(x,y));}roofGeo.computeVertexNormals();
  this.roof=new THREE.Mesh(roofGeo,new THREE.MeshStandardMaterial({color:0x7d9fae,transparent:true,opacity:.25,depthWrite:false,side:THREE.DoubleSide}));this.roof.visible=false;model.add(this.roof);
 }
 setSection(value){const planes=value?[new THREE.Plane(new THREE.Vector3(-1,0,0),0)]:[];this.teeth.clippingPlanes=planes;this.gum.clippingPlanes=planes;this.teeth.needsUpdate=true;this.gum.needsUpdate=true;}
 updateEnvelope(){
  const s=this.tongue.skeleton,m=this.envelope.fromRest.value;
  m.copy(this.tongue.bindMatrixInverse).multiply(s.bones[this.headIndex].matrixWorld).multiply(s.boneInverses[this.headIndex]).multiply(this.tongue.bindMatrix);
  this.envelope.toRest.value.copy(m).invert();
  this.roof.matrixAutoUpdate=false;
  this.roof.matrix.copy(this.model.matrixWorld).invert().multiply(this.tongue.matrixWorld).multiply(m);
 }
 constrain(v){v.applyMatrix4(this.envelope.toRest.value);constrainPoint(v);return v.applyMatrix4(this.envelope.fromRest.value);}
 landmarks(){return [4,20,31,48].map(row=>{const v=new THREE.Vector3();this.tongue.getVertexPosition(row*24+6,v);this.constrain(v);return this.tongue.localToWorld(v);});}
 probe(){return Object.fromEntries([['tipSurface',4],['midSurface',20],['posteriorDorsum',31],['rootEnd',56]].map(([name,row])=>{const v=new THREE.Vector3();this.tongue.getVertexPosition(row*24+6,v);this.constrain(v);this.tongue.localToWorld(v);this.model.worldToLocal(v);return [name,v.toArray()];}));}
 referenceProfiles(){
  return this.saved.filter(s=>s.tooth).map(s=>{const o=s.mesh,points=[],v=new THREE.Vector3(),bounds=new THREE.Box3();
   for(let i=0;i<o.geometry.attributes.position.count;i++){o.getVertexPosition(i,v);o.localToWorld(v);this.model.worldToLocal(v);bounds.expandByPoint(v);if(Math.abs(v.x)<.006)points.push(v.toArray());}
   return {name:o.name,parent:o.parent.name,materials:(Array.isArray(s.material)?s.material:[s.material]).map(m=>m.name),min:bounds.min.toArray(),max:bounds.max.toArray(),sagittal:points};
  });
 }
 authoringData(){const g=this.tongue.geometry,r=this.roof.geometry;return {schema:1,space:'Blender world XYZ, forward -Y',positions:Array.from(g.attributes.position.array),indices:Array.from(g.index.array),colors:Array.from(g.attributes.color.array),skinIndices:Array.from(g.attributes.skinIndex.array),skinWeights:Array.from(g.attributes.skinWeight.array),bones:this.tongue.skeleton.bones.map(b=>b.name),morphs:g.morphAttributes.position.map(a=>({name:a.name,deltas:Array.from(a.array)})),palate:{positions:Array.from(r.attributes.position.array),indices:Array.from(r.index.array)},note:'Authoring base and morphs. Runtime palate collision correction is not baked into these keys; teaching accuracy is unverified.'};}
 setActive(value){
  this.active=value;
  for(const saved of this.saved){const o=saved.mesh;
   if(!value){o.visible=o===this.source?false:saved.visible;o.material=saved.material;o.castShadow=saved.cast;o.receiveShadow=saved.receive;continue;}
   o.visible=o.name==='Teacher_头'||saved.tooth;o.castShadow=false;o.receiveShadow=false;
   if(o.name==='Teacher_头')o.material=this.skin;
   else if(saved.tooth){const mat=m=>m.name.includes('Teeth')?this.teeth:this.gum;o.material=Array.isArray(saved.material)?saved.material.map(mat):mat(saved.material);}
  }
  this.tongue.material=value?this.teachingMaterial:this.normalMaterial;this.tongue.visible=true;this.roof.visible=value;
 }
 dispose(){this.setActive(false);for(const material of [this.skin,this.teeth,this.gum,this.teachingMaterial])material.dispose();}
}
