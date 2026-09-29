import test from 'node:test';
import assert from 'node:assert/strict';
import {CHANNELS} from '../public/timeline.mjs';
import {a2fFixturePacket,sampleA2fTongue} from '../public/a2f-fixture.mjs';
import {SpeechPlayer} from '../public/player.mjs';

const entry = {id: '01', text: '爸爸抱宝宝。', voice: 'x6_shiwangxiaoxin_pro', audio: '01.wav'};
const channels = CHANNELS.slice(0, 25);
const face = {schema: 1, source: 'nvidia-audio2face-3d-v3.0', fps: 60, channels,
  frames: [{time: 0, values: channels.map((_, i) => i === 17 ? .4 : 0)},
    {time: 1 / 60, values: channels.map((_, i) => i === 17 ? 1.2 : 0)}]};

test('Audio2Face named channels map to tiger frames and clamp solver overshoot', () => {
  const packet = a2fFixturePacket(entry, face);
  assert.equal(packet.source, 'a2f3d');
  assert.equal(packet.audioUrl, '/fixtures/a2f/01.wav');
  assert.equal(packet.frames[0].values.length, 55);
  assert.equal(packet.frames[0].values[17], .4);
  assert.equal(packet.frames[1].values[17], 1);
  assert.equal(packet.frames[0].values[51], 0);
});

test('Audio2Face fixture rejects incomplete channels and wrong timestamps', () => {
  assert.throws(() => a2fFixturePacket(entry, {...face, channels: channels.slice(0, 19)}));
  assert.throws(() => a2fFixturePacket(entry, {...face, frames: [{time: .2, values: face.frames[0].values}]}));
});

test('Audio2Face tongue solve drives independent tiger controls on the audio clock', () => {
  const tongueChannels = ['tongueTipUp','tongueTipDown','tongueTipLeft','tongueTipRight','tongueRollUp',
    'tongueRollDown','tongueRollLeft','tongueRollRight','tongueUp','tongueDown','tongueLeft',
    'tongueRight','tongueIn','tongueStretch','tongueWide','tongueNarrow'];
  const v = (tip, rear) => tongueChannels.map(name => name === 'tongueTipUp' ? tip : name === 'tongueStretch' ? rear : 0);
  const full = {...face, schema: 2, channels: CHANNELS.slice(0, 52), tongueChannels, frames: [
    {time: 0, values: CHANNELS.slice(0, 52).map(() => 0), tongueValues: v(0, 0)},
    {time: 1 / 60, values: CHANNELS.slice(0, 52).map(() => 0), tongueValues: v(.8, .6)},
  ]};
  const packet = a2fFixturePacket(entry, full);
  const half = sampleA2fTongue(packet.frames, 1 / 120);
  assert.ok(Math.abs(half.tongueTipRaisePreview - .4) < 1e-8);
  assert.ok(Math.abs(half.tongueExtend - .3) < 1e-8);
  assert.deepEqual(sampleA2fTongue(packet.frames, -1), {});
  assert.throws(() => a2fFixturePacket(entry, {...full, frames: [{...full.frames[0], tongueValues: [1]}]}));
});

test('static WAV URL is retained for playback without revoking a non-blob URL', async () => {
  class AudioFake extends EventTarget {async play() {} pause() {} removeAttribute() {} load() {}}
  let revoked = 0;
  const audio = new AudioFake();
  const player = new SpeechPlayer({audio, fetchSpeech: async () => {}, makeUrl: () => {throw Error('should not create Blob URL');}, revokeUrl: () => {revoked++;}});
  await player.load(a2fFixturePacket(entry, face));
  assert.equal(audio.src, '/fixtures/a2f/01.wav');
  player.stop();
  assert.equal(revoked, 0);
});
