import * as THREE from 'three';

const smooth = value => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

// Experimental, local R31 shapes for A2F channels absent from the authored rig.
// Coordinates are measured from the exported tongue, so the root stays fixed.
export const addedA2fTongueShapes = [
  'tongueTipLeft', 'tongueTipRight', 'tongueRollDown',
  'tongueRollLeft', 'tongueRollRight', 'tongueDown',
  'tongueWide', 'tongueNarrow',
];

export function addA2fR31TongueShapes(mesh) {
  if (mesh?.name !== 'Teacher_舌头' || !mesh.morphTargetDictionary) throw Error('R31 舌头网格无效');
  const geometry = mesh.geometry, position = geometry.attributes.position;
  if (!position || geometry.morphTargetsRelative !== true) throw Error('R31 舌头形态键不是相对位移');
  const yMin = -0.24534, yMax = -0.11728, halfWidth = 0.05601;
  const morphs = geometry.morphAttributes.position;
  for (const name of addedA2fTongueShapes) {
    if (mesh.morphTargetDictionary[name] !== undefined) continue;
    const delta = new Float32Array(position.count * 3);
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), y = position.getY(i);
      const front = Math.max(0, Math.min(1, (yMax - y) / (yMax - yMin)));
      const tip = smooth((front - .70) / .25);
      const body = smooth((front - .12) / .35) * (1 - .25 * tip);
      const side = Math.max(-1, Math.min(1, x / halfWidth));
      let dx = 0, dz = 0;
      switch (name) {
        // R31's authored tongueLeft moves toward local +X (character left).
        case 'tongueTipLeft': dx = .009 * tip; break;
        case 'tongueTipRight': dx = -.009 * tip; break;
        case 'tongueRollDown': dz = -.009 * tip; break;
        case 'tongueRollLeft': dz = .008 * side * tip; break;
        case 'tongueRollRight': dz = -.008 * side * tip; break;
        case 'tongueDown': dz = -.010 * body; break;
        case 'tongueWide': dx = .006 * side * body; break;
        case 'tongueNarrow': dx = -.006 * side * body; break;
      }
      delta[i * 3] = dx;
      delta[i * 3 + 2] = dz;
    }
    mesh.morphTargetDictionary[name] = morphs.length;
    morphs.push(new THREE.Float32BufferAttribute(delta, 3));
    if (geometry.morphAttributes.normal?.length) {
      // Relative normal targets must describe the deformed surface, not zero
      // (which leaves specular highlights attached to the neutral tongue).
      const surface = new THREE.BufferGeometry();
      const deformed = new Float32Array(position.count * 3);
      for (let i = 0; i < position.count; i++) {
        deformed[i * 3] = position.getX(i) + delta[i * 3];
        deformed[i * 3 + 1] = position.getY(i);
        deformed[i * 3 + 2] = position.getZ(i) + delta[i * 3 + 2];
      }
      surface.setAttribute('position', new THREE.Float32BufferAttribute(deformed, 3));
      surface.setIndex(geometry.index);
      surface.computeVertexNormals();
      const normal = surface.attributes.normal, base = geometry.attributes.normal;
      const normalDelta = new Float32Array(position.count * 3);
      for (let i = 0; i < position.count; i++) {
        normalDelta[i * 3] = normal.getX(i) - base.getX(i);
        normalDelta[i * 3 + 1] = normal.getY(i) - base.getY(i);
        normalDelta[i * 3 + 2] = normal.getZ(i) - base.getZ(i);
      }
      geometry.morphAttributes.normal.push(new THREE.Float32BufferAttribute(normalDelta, 3));
      surface.dispose();
    }
    mesh.morphTargetInfluences.push(0);
  }
  geometry.computeBoundingSphere();
  return mesh;
}
