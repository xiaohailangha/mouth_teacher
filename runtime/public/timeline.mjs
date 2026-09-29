// Azure's documented order (1-based in docs, zero-based here). Never use ARKit order.
export const CHANNELS = 'eyeBlinkLeft eyeLookDownLeft eyeLookInLeft eyeLookOutLeft eyeLookUpLeft eyeSquintLeft eyeWideLeft eyeBlinkRight eyeLookDownRight eyeLookInRight eyeLookOutRight eyeLookUpRight eyeSquintRight eyeWideRight jawForward jawLeft jawRight jawOpen mouthClose mouthFunnel mouthPucker mouthLeft mouthRight mouthSmileLeft mouthSmileRight mouthFrownLeft mouthFrownRight mouthDimpleLeft mouthDimpleRight mouthStretchLeft mouthStretchRight mouthRollLower mouthRollUpper mouthShrugLower mouthShrugUpper mouthPressLeft mouthPressRight mouthLowerDownLeft mouthLowerDownRight mouthUpperUpLeft mouthUpperUpRight browDownLeft browDownRight browInnerUp browOuterUpLeft browOuterUpRight cheekPuff cheekSquintLeft cheekSquintRight noseSneerLeft noseSneerRight tongueOut headRoll leftEyeRoll rightEyeRoll'.split(' ');
export function normalizeFrames(groups) {
  const frames = new Map();
  for (const group of groups) {
    if (!Number.isSafeInteger(group.FrameIndex) || group.FrameIndex < 0 || !Array.isArray(group.BlendShapes)) throw Error('面部数据 FrameIndex 无效');
    group.BlendShapes.forEach((row, i) => {
      if (!Array.isArray(row) || row.length !== 55 || row.some(v => !Number.isFinite(v))) throw Error('面部数据必须为每帧 55 个有限数值');
      const index = group.FrameIndex + i;
      if (frames.has(index)) throw Error('面部帧重复');
      // Live Azure BlendShapes can contain small negative overshoot; morph weights cannot.
      frames.set(index, row.map(v => Math.max(0, Math.min(1, v))));
    });
  }
  const sorted = [...frames].sort((a, b) => a[0] - b[0]);
  if (!sorted.length) throw Error('该声音未返回 BlendShapes，不能验证口型同步');
  for (let i = 1; i < sorted.length; i++) if (sorted[i][0] !== sorted[i-1][0] + 1) throw Error('面部帧缺失');
  return sorted.map(([index, values]) => ({time: index / 60, values}));
}
export function sampleFrames(frames, seconds) {
  const zero = new Float32Array(55);
  if (!frames.length || seconds < frames[0].time || seconds > frames.at(-1).time + 1/60) return zero;
  let lo = 0, hi = frames.length - 1;
  while (lo < hi) { const mid = Math.ceil((lo+hi)/2); if (frames[mid].time <= seconds) lo=mid; else hi=mid-1; }
  const a=frames[lo], b=frames[Math.min(lo+1,frames.length-1)];
  const t=b.time===a.time ? 0 : Math.max(0,Math.min(1,(seconds-a.time)/(b.time-a.time)));
  return Float32Array.from(a.values,(v,i)=>v+(b.values[i]-v)*t);
}
export function controlsFromFrame(row) { return Object.fromEntries(CHANNELS.map((name,i)=>[name,row[i] || 0])); }
