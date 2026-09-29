import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {a2fFaceFrames} from '../public/a2f-fixture.mjs';
import {CHANNELS} from '../public/timeline.mjs';
import {addA2fR31TongueShapes, addedA2fTongueShapes} from '../public/a2f-r31-tongue.mjs';

const face = JSON.parse(readFileSync(new URL('../public/fixtures/a2f/01-full.json', import.meta.url)));
const glb = readFileSync(new URL('../public/character-v5/face-round31.glb', import.meta.url));
const json = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)));

test('all 52 A2F face channels and 16 tongue channels reach distinct R31 targets', () => {
  const frames = a2fFaceFrames(face);
  const faceTargets = new Set(json.meshes.flatMap(mesh => mesh.extras?.targetNames || []));
  const tongueTargets = new Set(json.meshes[json.nodes.find(node => node.name === 'Teacher_舌头').mesh].extras.targetNames);
  for (const channel of face.channels) {
    assert.ok(CHANNELS.includes(channel), `unknown face channel: ${channel}`);
    assert.ok(faceTargets.has(channel), `missing face target: ${channel}`);
    const displacement = Math.max(...json.meshes.flatMap(mesh => {
      const index = mesh.extras?.targetNames?.indexOf(channel) ?? -1;
      return index < 0 ? [] : mesh.primitives.flatMap(primitive => {
        const accessor = json.accessors[primitive.targets?.[index]?.POSITION];
        return accessor ? [...accessor.min, ...accessor.max].map(Math.abs) : [];
      });
    }));
    assert.ok(displacement > .0001, `empty face shape: ${channel}`);
  }
  const mapped = Object.keys(frames[0].tongue);
  assert.equal(mapped.length, 16);
  assert.equal(new Set(mapped).size, 16);
  for (const target of mapped) assert.ok(tongueTargets.has(target) || addedA2fTongueShapes.includes(target), `missing tongue target: ${target}`);
  assert.deepEqual(Object.keys(frames[0].rawTongue), face.tongueChannels);
  const down = face.tongueChannels.indexOf('tongueDown');
  assert.ok(frames.some((frame, i) => frame.tongue.tongueDown === Math.min(1, Math.max(0, face.frames[i].tongueValues[down])) && frame.tongue.tongueDown > .1));
});

test('new R31 tongue shapes move the intended region without moving the root', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    -.03, -.24, .92, .03, -.24, .92,
    -.03, -.18, .93, .03, -.18, .93,
    0, -.12, .94,
  ], 3));
  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = [];
  const mesh = new THREE.Mesh(geometry);
  mesh.name = 'Teacher_舌头';
  mesh.morphTargetDictionary = {};
  mesh.morphTargetInfluences = [];
  addA2fR31TongueShapes(mesh);
  assert.equal(mesh.morphTargetInfluences.length, 8);
  const down = geometry.morphAttributes.position[mesh.morphTargetDictionary.tongueDown];
  const roll = geometry.morphAttributes.position[mesh.morphTargetDictionary.tongueRollDown];
  const narrow = geometry.morphAttributes.position[mesh.morphTargetDictionary.tongueNarrow];
  assert.ok(down.getZ(2) < -.003);
  assert.ok(roll.getZ(0) < -.005);
  assert.ok(narrow.getX(0) > 0 && narrow.getX(1) < 0);
  for (const shape of geometry.morphAttributes.position)
    for (const component of [shape.getX(4), shape.getY(4), shape.getZ(4)]) assert.ok(Math.abs(component) < 1e-8);
});
