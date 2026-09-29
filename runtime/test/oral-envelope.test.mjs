import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {OralView} from '../public/oral-view.mjs';

test('palate correction follows head rotation and translation without changing contact',()=>{
 const model=new THREE.Group(),head=new THREE.Bone();head.name='head.x';model.add(head);
 const bones=[head];for(const name of ['tong_01.x','tong_02.x','tong_03.x']){const b=new THREE.Bone();b.name=name;head.add(b);bones.push(b);}
 const source=new THREE.SkinnedMesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial());source.name='Teacher_舌头';model.add(source);model.updateMatrixWorld(true);source.bind(new THREE.Skeleton(bones));
 const view=new OralView(model,{});model.updateMatrixWorld(true);view.updateEnvelope();
 const rest=new THREE.Vector3(0,-.23,1.02),contact=view.constrain(rest.clone());assert.ok(contact.z<rest.z-.02);
 head.rotation.set(.2,-.15,.08);head.position.set(.02,.01,-.015);model.updateMatrixWorld(true);view.updateEnvelope();
 const movement=view.envelope.fromRest.value;
 const expected=contact.clone().applyMatrix4(movement);
 const actual=view.constrain(rest.clone().applyMatrix4(movement));
 assert.ok(actual.distanceTo(expected)<1e-10);
 const roofPoint=new THREE.Vector3(0,-.23,.98);
 assert.ok(roofPoint.clone().applyMatrix4(view.roof.matrix).distanceTo(roofPoint.clone().applyMatrix4(movement))<1e-10);
 view.dispose();
});
