import {CHANNELS} from './timeline.mjs';

const canonical = value => String(value).replace(/[^a-z0-9]/gi, '').toLowerCase();
const channelIndex = new Map(CHANNELS.map((name, index) => [canonical(name), index]));

export function a2fFixturePacket(entry, face) {
  if (!entry || !/^\d{2}\.wav$/.test(entry.audio) || typeof entry.text !== 'string')
    throw Error('Audio2Face 音频清单无效');
  if (face?.schema !== 1 || face.source !== 'nvidia-audio2face-3d-v3.0' || face.fps !== 60 ||
      !Array.isArray(face.channels) || !face.channels.length || !Array.isArray(face.frames) || !face.frames.length)
    throw Error('Audio2Face 面部数据无效');
  const indexes = face.channels.map(name => channelIndex.get(canonical(name)));
  const matched = new Set(indexes.filter(index => index !== undefined));
  if (matched.size < 20 || !matched.has(channelIndex.get('jawopen')) ||
      !matched.has(channelIndex.get('mouthpucker')) || !matched.has(channelIndex.get('mouthsmileleft')))
    throw Error('Audio2Face 通道与小虎子模型不匹配');
  if (matched.size !== indexes.filter(index => index !== undefined).length)
    throw Error('Audio2Face 通道重复');
  const frames = face.frames.map((frame, frameIndex) => {
    if (!Array.isArray(frame.values) || frame.values.length !== indexes.length ||
        frame.values.some(value => !Number.isFinite(value)) ||
        !Number.isFinite(frame.time) || frame.time < 0 ||
        Math.abs(frame.time - frameIndex / 60) > 0.005)
      throw Error('Audio2Face 帧数据或时间戳无效');
    const values = Array(55).fill(0);
    indexes.forEach((index, i) => { if (index !== undefined) values[index] = Math.max(0, Math.min(1, frame.values[i])); });
    return {time: frameIndex / 60, values};
  });
  return {schema: 1, source: 'a2f3d', voice: entry.voice, audioSource: 'xfyun', faceSource: face.source,
    audioUrl: `/fixtures/a2f/${entry.audio}`, mime: 'audio/wav', text: entry.text,
    frames, visemes: [], words: [], syllables: []};
}
