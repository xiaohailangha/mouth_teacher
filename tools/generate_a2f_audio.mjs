import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {synthesizeXfyun, xfyunConfigured} from '../runtime/xfyun.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(projectRoot, 'runtime', 'public', 'fixtures', 'a2f');
const voice = 'x6_shiwangxiaoxin_pro';
const pace = 'gentle';
const sentences = [
  ['01', '爸爸抱宝宝，妈妈买面包。'],
  ['02', '啦啦啦，舌尖轻轻抬起来。'],
  ['03', '哒哒哒，小鼓咚咚响。'],
  ['04', '嘎嘎嘎，小鸭走过来。'],
  ['05', '四是四，十是十。'],
  ['06', '圆圆的月亮挂在天上。'],
  ['07', '小鱼游过弯弯的河。'],
  ['08', '我会说：啊、哦、衣、乌。'],
  ['09', '你好呀，今天我们一起慢慢说话。'],
  ['10', '请跟我说：谢谢你，我做到了！'],
];

if (!xfyunConfigured()) throw Error('先在当前进程设置 XFYUN_APP_ID、XFYUN_API_KEY、XFYUN_API_SECRET');
await mkdir(outputDir, {recursive: true});
const manifest = {schema: 1, voice, pace, entries: []};
for (const [id, text] of sentences) {
  const wavPath = path.join(outputDir, `${id}.wav`);
  const metadataPath = path.join(outputDir, `${id}-audio.json`);
  let metadata;
  try {
    metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    const wav = await readFile(wavPath);
    if (metadata.text !== text || metadata.voice !== voice || wav.length < 44) throw Error('素材不匹配');
    process.stdout.write(`${id}: 已存在，跳过计费合成\n`);
  } catch {
    const packet = await synthesizeXfyun(text, undefined, {pace, voice});
    await writeFile(wavPath, Buffer.from(packet.audioBase64, 'base64'));
    metadata = {id, text, voice, pace, duration: packet.duration, audio: `${id}.wav`, audioSource: 'xfyun', faceSource: null};
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
    process.stdout.write(`${id}: 已生成 ${packet.duration.toFixed(2)} 秒讯飞音频\n`);
  }
  manifest.entries.push(metadata);
  await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}
