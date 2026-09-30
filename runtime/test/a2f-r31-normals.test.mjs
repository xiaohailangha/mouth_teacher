import test from 'node:test';
import assert from 'node:assert/strict';
import {auditR31Tongue, loadR31Tongue} from '../audit-r31-tongue.mjs';
import {addA2fR31TongueShapes} from '../public/a2f-r31-tongue.mjs';

test('eight real R31 tongue shapes have deformed normals, fixed roots and intact triangles', () => {
  const report = auditR31Tongue();
  assert.equal(report.shapes.length, 8);
  for (const shape of report.shapes) {
    assert.ok(shape.maxNormalAngle > 1, `${shape.name}: lighting still uses neutral normals`);
    assert.ok(shape.maxNormalError < 1e-6, `${shape.name}: normals disagree with deformed indexed surface`);
    assert.equal(shape.maxRootDisplacement, 0, `${shape.name}: root moves`);
    assert.equal(shape.reversedTriangles, 0, `${shape.name}: reversed triangles`);
    assert.equal(shape.collapsedTriangles, 0, `${shape.name}: collapsed triangles`);
  }
});

test('adding R31 shapes preserves authored targets and neutral surface and is idempotent', () => {
  const mesh = loadR31Tongue(), g = mesh.geometry;
  const positions = g.attributes.position.array.slice(), normals = g.attributes.normal.array.slice();
  const authored = g.morphAttributes.position.slice(), normalTargets = g.morphAttributes.normal.slice();
  addA2fR31TongueShapes(mesh);
  const count = g.morphAttributes.position.length;
  addA2fR31TongueShapes(mesh);
  assert.equal(g.morphAttributes.position.length, count);
  assert.equal(g.morphAttributes.normal.length, count);
  assert.deepEqual(g.attributes.position.array, positions);
  assert.deepEqual(g.attributes.normal.array, normals);
  authored.forEach((target, i) => assert.equal(g.morphAttributes.position[i], target));
  normalTargets.forEach((target, i) => assert.equal(g.morphAttributes.normal[i], target));
});

test('added tip left/right follow the authored R31 whole-tongue directions', () => {
  const mesh = loadR31Tongue();
  addA2fR31TongueShapes(mesh);
  const g = mesh.geometry;
  function meanX(name) {
    const target = g.morphAttributes.position[mesh.morphTargetDictionary[name]];
    let x = 0;
    for (let i = 0; i < target.count; i++) x += target.getX(i);
    return x / target.count;
  }
  assert.ok(meanX('tongueLeft') > 0);
  assert.ok(meanX('tongueRight') < 0);
  assert.ok(meanX('tongueTipLeft') > 0);
  assert.ok(meanX('tongueTipRight') < 0);
});
