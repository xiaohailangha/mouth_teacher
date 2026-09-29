import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {a2fFixturePacket} from '../public/a2f-fixture.mjs';

const fixture = new URL('../public/fixtures/a2f/', import.meta.url);
const readJson = name => JSON.parse(readFileSync(new URL(name, fixture), 'utf8'));

test('ten XFYun recordings have real Audio2Face frames aligned to their audio', () => {
  const manifest = readJson('manifest.json');
  assert.equal(manifest.voice, 'x6_shiwangxiaoxin_pro');
  assert.equal(manifest.entries.length, 10);
  assert.equal(new Set(manifest.entries.map(entry => entry.text)).size, 10);
  for (const entry of manifest.entries) {
    assert.equal(entry.audioSource, 'xfyun');
    assert.equal(entry.faceSource, 'nvidia-audio2face-3d-v3.0');
    assert.equal(entry.face, `${entry.id}-face.json`);
    const wav = readFileSync(fileURLToPath(new URL(entry.audio, fixture)));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
    assert.equal(wav.readUInt32LE(24), 24000);
    const face = readJson(entry.face);
    const packet = a2fFixturePacket(entry, face);
    assert.equal(face.schema, 2);
    assert.equal(face.channels.length, 52);
    assert.equal(face.tongueChannels.length, 16);
    assert.ok(Math.abs(packet.frames.at(-1).time - entry.duration) < 0.05, entry.id);
    assert.ok(packet.frames.some(frame => frame.values[17] > 0.05), `${entry.id}: jaw never moved`);
    assert.ok(packet.frames.some(frame => frame.tongue.tongueMiddleRaise > .1), `${entry.id}: tongue never moved`);
  }
});
