import {synthesizeXfyun, xfyunConfigured} from './xfyun.mjs';
import {a2fFaceFrames} from './public/a2f-fixture.mjs';

function workerUrl() {
  const setting = process.env.A2F_WORKER_URL;
  if (!setting) return null;
  const url = new URL(setting);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw Error('A2F_WORKER_URL 必须是本机 SSH 隧道的 http://127.0.0.1:端口/');
  return new URL('infer', url);
}

export function a2fConfigStatus() {
  return {provider: 'a2f3d', voice: 'x6_shiwangxiaoxin_pro', region: '讯飞超拟人 + NVIDIA A2F',
    configured: xfyunConfigured() && Boolean(process.env.A2F_WORKER_URL),
    xfyunConfigured: xfyunConfigured(), workerConfigured: Boolean(process.env.A2F_WORKER_URL)};
}

export async function synthesizeA2f(text, signal, {pace='gentle'}={}) {
  if (!xfyunConfigured()) throw Object.assign(Error('讯飞尚未配置；当前可播放已导出的 10 句 A2F 样例'), {status:503});
  const url = workerUrl();
  if (!url) throw Object.assign(Error('A2F GPU 服务未连接；当前可播放已导出的 10 句样例'), {status:503});
  try {
    const health = await fetch(new URL('health', url), {signal: AbortSignal.any([signal || new AbortController().signal, AbortSignal.timeout(3000)])});
    if (!health.ok || !(await health.json()).ready) throw Error('worker unavailable');
  } catch {
    throw Object.assign(Error('A2F GPU 服务未就绪；请先开机并连接 SSH 隧道'), {status:503});
  }
  const voice = await synthesizeXfyun(text, signal, {pace});
  if (voice.duration > 30) throw Object.assign(Error('当前 A2F 服务只支持 30 秒以内的单句音频'), {status:413});
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 150000);
  const abort = () => timeout.abort();
  signal?.addEventListener('abort', abort, {once: true});
  try {
    const response = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({audioBase64: voice.audioBase64}), signal: timeout.signal});
    if (!response.ok) throw Object.assign(Error(`A2F 推断失败（${response.status}）`), {status:502});
    const {face} = await response.json();
    if (face?.schema !== 2) throw Object.assign(Error('A2F 未返回舌头数据'), {status:502});
    return {...voice, schema: 1, source: 'a2f3d', faceSource: face.source,
      animationSource: 'nvidia-audio2face-3d-v3.0', frames: a2fFaceFrames(face),
      visemes: [], words: [], syllables: []};
  } catch (error) {
    if (signal?.aborted) throw Error('已停止');
    if (timeout.signal.aborted) throw Object.assign(Error('A2F 服务超时，请确认 GPU 已开机且 SSH 隧道仍连接'), {status:504});
    if (error.status) throw error;
    throw Object.assign(Error('A2F 服务连接失败，请确认 GPU 已开机且 SSH 隧道仍连接'), {status:503});
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
