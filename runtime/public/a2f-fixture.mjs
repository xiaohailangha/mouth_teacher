import {CHANNELS} from './timeline.mjs';

const canonical = value => String(value).replace(/[^a-z0-9]/gi, '').toLowerCase();
const channelIndex = new Map(CHANNELS.map((name, index) => [canonical(name), index]));
const tongueTargets = {
  tongueTipUp: ['tongueTipRaisePreview'], tongueTipDown: ['tongueTipLowerPreview'],
  tongueTipLeft: ['tongueTipLeft'], tongueTipRight: ['tongueTipRight'],
  tongueRollUp: ['tongueTipCurl'], tongueRollDown: ['tongueRollDown'],
  tongueRollLeft: ['tongueRollLeft'], tongueRollRight: ['tongueRollRight'],
  tongueUp: ['tongueMiddleRaise'], tongueDown: ['tongueDown'],
  tongueLeft: ['tongueLeft'], tongueRight: ['tongueRight'],
  tongueIn: ['tongueRetract'], tongueStretch: ['tongueExtend'],
  tongueWide: ['tongueWide'], tongueNarrow: ['tongueNarrow'],
};

export function sampleA2fTongue(frames, seconds) {
  if (!frames?.length || seconds < frames[0].time || seconds > frames.at(-1).time + 1 / 60) return {};
  let lo = 0, hi = frames.length - 1;
  while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (frames[mid].time <= seconds) lo = mid; else hi = mid - 1; }
  const a = frames[lo], b = frames[Math.min(lo + 1, frames.length - 1)];
  const t = b.time === a.time ? 0 : Math.max(0, Math.min(1, (seconds - a.time) / (b.time - a.time)));
  const controls = {};
  for (const name of Object.keys(a.tongue || {})) controls[name] = (a.tongue[name] || 0) * (1 - t) + (b.tongue?.[name] || 0) * t;
  return controls;
}

export function a2fFaceFrames(face) {
  if (![1, 2].includes(face?.schema) || face.source !== 'nvidia-audio2face-3d-v3.0' || face.fps !== 60 ||
      !Array.isArray(face.channels) || !face.channels.length || !Array.isArray(face.frames) || !face.frames.length)
    throw Error('Audio2Face 面部数据无效');
  const indexes = face.channels.map(name => channelIndex.get(canonical(name)));
  const matched = new Set(indexes.filter(index => index !== undefined));
  if (matched.size < 20 || !matched.has(channelIndex.get('jawopen')) ||
      !matched.has(channelIndex.get('mouthpucker')) || !matched.has(channelIndex.get('mouthsmileleft')))
    throw Error('Audio2Face 通道与小虎子模型不匹配');
  if (matched.size !== indexes.filter(index => index !== undefined).length)
    throw Error('Audio2Face 通道重复');
  if (face.schema === 2 && matched.size !== 52)
    throw Error('Audio2Face 面部 52 路通道不完整');
  const tongueChannels = face.schema === 2 ? face.tongueChannels : [];
  if (face.schema === 2 && (!Array.isArray(tongueChannels) || tongueChannels.length !== 16 ||
      new Set(tongueChannels).size !== tongueChannels.length ||
      tongueChannels.some(name => !(name in tongueTargets))))
    throw Error('Audio2Face 舌头通道无效');
  const frames = face.frames.map((frame, frameIndex) => {
    if (!Array.isArray(frame.values) || frame.values.length !== indexes.length ||
        (face.schema === 2 && (!Array.isArray(frame.tongueValues) || frame.tongueValues.length !== tongueChannels.length ||
          frame.tongueValues.some(value => !Number.isFinite(value)))) ||
        frame.values.some(value => !Number.isFinite(value)) ||
        !Number.isFinite(frame.time) || frame.time < 0 ||
        Math.abs(frame.time - frameIndex / 60) > 0.005)
      throw Error('Audio2Face 帧数据或时间戳无效');
    const values = Array(55).fill(0);
    indexes.forEach((index, i) => { if (index !== undefined) values[index] = Math.max(0, Math.min(1, frame.values[i])); });
    const tongue = {}, rawTongue = {};
    tongueChannels.forEach((name, i) => {
      rawTongue[name] = Math.max(0, Math.min(1, frame.tongueValues[i]));
      for (const target of tongueTargets[name] || [])
        tongue[target] = rawTongue[name];
    });
    return {time: frameIndex / 60, values, tongue, rawTongue};
  });
  return frames;
}

export function a2fFixturePacket(entry, face) {
  if (!entry || !/^\d{2}\.wav$/.test(entry.audio) || typeof entry.text !== 'string')
    throw Error('Audio2Face 音频清单无效');
  return {schema: 1, source: 'a2f3d', voice: entry.voice, audioSource: 'xfyun', faceSource: face.source,
    audioUrl: `/fixtures/a2f/${entry.audio}`, mime: 'audio/wav', text: entry.text,
    frames: a2fFaceFrames(face), visemes: [], words: [], syllables: []};
}
