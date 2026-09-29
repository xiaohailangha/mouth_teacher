import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleA2fTongue} from '../public/a2f-tongue-visual.mjs';

test('A2F display gain strengthens body motion without inventing tongue-tip articulation', () => {
  const raw = {tongueMiddleRaise: .4, tongueRetract: .5, tongueTipRaisePreview: 0};
  assert.deepEqual(visibleA2fTongue(raw, false), raw);
  const shown = visibleA2fTongue(raw, true);
  assert.ok(Math.abs(shown.tongueMiddleRaise - .72) < 1e-12);
  assert.equal(shown.tongueRetract, .625);
  assert.equal(shown.tongueTipRaisePreview, 0);
  assert.equal(visibleA2fTongue({tongueMiddleRaise: 1, tongueRetract: 1}).tongueMiddleRaise, .85);
  assert.equal(visibleA2fTongue({tongueMiddleRaise: 0, tongueRetract: 0}).tongueRetract, 0);
});
