import * as THREE from 'three';
// Inspect the actual R31 meshes; never introduce a second deforming tongue.
export class OralR31 {
 constructor(model,renderer){
  this.active=false;this.section=true;this.items=[];this.hidden=[];this.renderer=renderer;
  this.plane=new THREE.Plane(new THREE.Vector3(-1,0,0),0);
  model.traverse(o=>{if(!o.isMesh)return;
   let p=o,part='';while(p){if(p.name.startsWith('Teacher_'))part=p.name;p=p.parent;}
   if(['Teacher_头','Teacher_牙齿上','Teacher_牙齿下'].includes(part)){
    const original=o.material,copy=(Array.isArray(original)?original:[original]).map(m=>m.clone());
    this.items.push({o,original,copy});
   }else if(part!=='Teacher_舌头')this.hidden.push({o,visible:o.visible});
  });
 }
 setActive(active){this.active=active;this.update();}
 setSection(section){this.section=section;this.update();}
 update(){
  this.renderer.localClippingEnabled=this.active;
  for(const {o,original,copy} of this.items){
   for(const m of copy){m.clippingPlanes=this.active&&this.section?[this.plane]:[];m.clipShadows=true;m.side=THREE.DoubleSide;m.needsUpdate=true;}
   o.material=this.active?(Array.isArray(original)?copy:copy[0]):original;
  }
  for(const {o,visible} of this.hidden)o.visible=this.active?false:visible;
 }
 probe(){return {active:this.active,section:this.section,source:'original-r31-meshes',clippedMeshes:this.items.length};}
 dispose(){for(const {copy} of this.items)for(const m of copy)m.dispose();}
}
