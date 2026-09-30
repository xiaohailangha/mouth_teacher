import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {addA2fR31TongueShapes, addedA2fTongueShapes} from './public/a2f-r31-tongue.mjs';

// Decode the real exported indexed mesh, including sparse GLTF morph targets.
export function loadR31Tongue() {
  const glb = readFileSync(new URL('./public/character-v5/face-round31.glb', import.meta.url));
  const jsonSize = glb.readUInt32LE(12), json = JSON.parse(glb.subarray(20, 20 + jsonSize));
  const bin = glb.subarray(28 + jsonSize);
  const widths = {SCALAR: 1, VEC3: 3};
  const readers = {5121: [1, 'readUInt8'], 5123: [2, 'readUInt16LE'], 5125: [4, 'readUInt32LE'], 5126: [4, 'readFloatLE']};
  function viewValues(viewIndex, offset, count, width, type) {
    const view = json.bufferViews[viewIndex], [bytes, method] = readers[type];
    const values = [];
    for (let i = 0; i < count; i++) for (let c = 0; c < width; c++)
      values.push(bin[method]((view.byteOffset || 0) + offset + i * (view.byteStride || width * bytes) + c * bytes));
    return values;
  }
  function attribute(index) {
    const a = json.accessors[index], width = widths[a.type];
    const values = a.bufferView === undefined ? Array(a.count * width).fill(0)
      : viewValues(a.bufferView, a.byteOffset || 0, a.count, width, a.componentType);
    if (a.sparse) {
      const s = a.sparse;
      const indices = viewValues(s.indices.bufferView, s.indices.byteOffset || 0, s.count, 1, s.indices.componentType);
      const sparse = viewValues(s.values.bufferView, s.values.byteOffset || 0, s.count, width, a.componentType);
      indices.forEach((vertex, i) => { for (let c = 0; c < width; c++) values[vertex * width + c] = sparse[i * width + c]; });
    }
    return a.componentType === 5126 ? new THREE.Float32BufferAttribute(values, width) : values;
  }
  const node = json.nodes.find(n => n.name === 'Teacher_舌头'), meshData = json.meshes[node.mesh];
  const primitive = meshData.primitives[0], geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', attribute(primitive.attributes.POSITION));
  geometry.setAttribute('normal', attribute(primitive.attributes.NORMAL));
  geometry.setIndex(attribute(primitive.indices));
  geometry.morphTargetsRelative = true;
  for (const [key, semantic] of [['position', 'POSITION'], ['normal', 'NORMAL']])
    geometry.morphAttributes[key] = primitive.targets.map(t => t[semantic] === undefined
      ? new THREE.Float32BufferAttribute(geometry.attributes.position.count * 3, 3) : attribute(t[semantic]));
  const mesh = new THREE.Mesh(geometry);
  mesh.name = node.name;
  mesh.morphTargetDictionary = Object.fromEntries(meshData.extras.targetNames.map((name, i) => [name, i]));
  return mesh;
}

export function auditR31Tongue() {
  const mesh = loadR31Tongue();
  addA2fR31TongueShapes(mesh);
  const g = mesh.geometry, base = g.attributes.position, baseNormal = g.attributes.normal;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const oldCross = new THREE.Vector3(), newCross = new THREE.Vector3();
  const shapes = addedA2fTongueShapes.map(name => {
    const index = mesh.morphTargetDictionary[name], delta = g.morphAttributes.position[index];
    const normalDelta = g.morphAttributes.normal[index];
    const surface = new THREE.BufferGeometry(), positions = base.clone();
    let maxDisplacement = 0, maxRootDisplacement = 0, maxNormalAngle = 0;
    for (let i = 0; i < base.count; i++) {
      a.fromBufferAttribute(delta, i);
      maxDisplacement = Math.max(maxDisplacement, a.length());
      if (base.getY(i) >= -.132) maxRootDisplacement = Math.max(maxRootDisplacement, a.length());
      positions.setXYZ(i, base.getX(i) + a.x, base.getY(i) + a.y, base.getZ(i) + a.z);
      b.fromBufferAttribute(baseNormal, i); c.fromBufferAttribute(normalDelta, i).add(b).normalize();
      maxNormalAngle = Math.max(maxNormalAngle, b.angleTo(c) * 180 / Math.PI);
    }
    surface.setAttribute('position', positions); surface.setIndex(g.index); surface.computeVertexNormals();
    let maxNormalError = 0, reversedTriangles = 0, collapsedTriangles = 0;
    for (let i = 0; i < base.count; i++) {
      a.fromBufferAttribute(baseNormal, i).add(b.fromBufferAttribute(normalDelta, i));
      maxNormalError = Math.max(maxNormalError, a.distanceTo(c.fromBufferAttribute(surface.attributes.normal, i)));
    }
    function cross(position, i, target) {
      a.fromBufferAttribute(position, g.index.getX(i));
      b.fromBufferAttribute(position, g.index.getX(i + 1)).sub(a);
      c.fromBufferAttribute(position, g.index.getX(i + 2)).sub(a);
      return target.crossVectors(b, c);
    }
    for (let i = 0; i < g.index.count; i += 3) {
      cross(base, i, oldCross); cross(positions, i, newCross);
      if (oldCross.lengthSq() > 1e-20 && newCross.lengthSq() < oldCross.lengthSq() * 1e-8) collapsedTriangles++;
      if (oldCross.dot(newCross) < 0) reversedTriangles++;
    }
    surface.dispose();
    return {name, maxDisplacement, maxRootDisplacement, maxNormalAngle, maxNormalError, reversedTriangles, collapsedTriangles};
  });
  return {asset: 'face-round31.glb', vertices: base.count, triangles: g.index.count / 3,
    scope: 'Eight added shapes at weight 1, neutral jaw. Not an oral collision or mixed-pose acceptance.', shapes};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = auditR31Tongue();
  mkdirSync(new URL('../work/a2f-r31/', import.meta.url), {recursive: true});
  writeFileSync(new URL('../work/a2f-r31/geometry-audit.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
