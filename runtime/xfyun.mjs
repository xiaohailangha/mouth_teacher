import {createHmac} from 'node:crypto';
import {resolveSpeechPace} from './speech-pace.mjs';
const endpoint='wss://cbm01.cn-huabei-1.xf-yun.com/v1/private/mcd9m97e6';
export const xfyunConfigured=()=>!!(process.env.XFYUN_APP_ID&&process.env.XFYUN_API_KEY&&process.env.XFYUN_API_SECRET);
export function parseTiming(raw){
 let time=0;const phonemes=[];
 for(const item of raw.split(';').filter(s=>s.trim())){
  const token=item.replace(/\{[^}]*\}/g,'').trim();
  const match=token.match(/^(.*):([0-9]+)$/);if(!match)throw Error('讯飞音素格式无法识别');
  const duration=Number(match[2])*.005, label=match[1];
  const name=label.includes('-')?label.slice(label.lastIndexOf('-')+1):label;
  phonemes.push({time,end:time+duration,name:name.replace(/[0-9]+$/,''),label});time+=duration;
 }
 return {phonemes,duration:time};
}
// Character-authored approximate poses, NOT vendor BlendShapes or teaching tongue positions.
export function timingFrames(phonemes,duration){
 const pose=name=>{const v=Array(55).fill(0);if(/^(sil|sp)$/.test(name))return v;if(/^[bpm]$/.test(name)){v[35]=v[36]=.2;return v;}v[17]=/a/.test(name)?.5:.18;if(/^(u|uo|o|ou|v)/.test(name)){v[20]=.65;v[19]=.25;}if(/^(i|ia|ie)/.test(name)){v[23]=v[24]=.15;v[29]=v[30]=.2;}return v;};
 const poses=phonemes.map(p=>pose(p.name));let index=0;
 return Array.from({length:Math.ceil(duration*60)+1},(_,i)=>{const time=i/60;while(index<phonemes.length-1&&phonemes[index].end<=time)index++;const p=phonemes[index];if(!p||time>=duration)return {time,values:Array(55).fill(0)};const t=Math.max(0,Math.min(1,(time-p.time)/.025)),weight=t*t*(3-2*t),previous=index?poses[index-1]:Array(55).fill(0);return {time,values:poses[index].map((v,j)=>previous[j]+(v-previous[j])*weight)};});
}
export function pcmWav(pcm){const h=Buffer.alloc(44);h.write('RIFF');h.writeUInt32LE(36+pcm.length,4);h.write('WAVEfmt ',8);h.writeUInt32LE(16,16);h.writeUInt16LE(1,20);h.writeUInt16LE(1,22);h.writeUInt32LE(24000,24);h.writeUInt32LE(48000,28);h.writeUInt16LE(2,32);h.writeUInt16LE(16,34);h.write('data',36);h.writeUInt32LE(pcm.length,40);return Buffer.concat([h,pcm]);}
export async function synthesizeXfyun(text,signal,{pace='gentle',voice='x6_shiwangxiaoxin_pro'}={}){
 if(!xfyunConfigured())throw Error('讯飞服务尚未配置');
 resolveSpeechPace(pace);if(!['x6_shiwangxiaoxin_pro','x6_lingfeiyi_pro'].includes(voice))throw Object.assign(Error('请选择已开通的讯飞声音'),{status:400});
 const speed={extraSlow:30,gentle:40,easy:45,normal:50}[pace];
 const url=new URL(endpoint),date=new Date().toUTCString();
 const signature=createHmac('sha256',process.env.XFYUN_API_SECRET).update(`host: ${url.host}\ndate: ${date}\nGET ${url.pathname} HTTP/1.1`).digest('base64');
 url.search=new URLSearchParams({host:url.host,date,authorization:Buffer.from(`api_key="${process.env.XFYUN_API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`).toString('base64')});
 const packets=await new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(Error('已停止合成'));return;}
  const socket=new WebSocket(url),audio=new Map(),timing=new Map();let done=false,bytes=0;
  const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);socket.close();error?reject(error):resolve({audio,timing});};
  const abort=()=>finish(Error('已停止合成'));const timer=setTimeout(()=>finish(Error('讯飞合成超时，请重试')),60000);signal?.addEventListener('abort',abort,{once:true});
  socket.addEventListener('open',()=>socket.send(JSON.stringify({header:{app_id:process.env.XFYUN_APP_ID,status:2},parameter:{oral:{oral_level:'low',spark_assist:0,remain:1},tts:{vcn:voice,speed,volume:50,pitch:50,rhy:1,audio:{encoding:'raw',sample_rate:24000,channels:1,bit_depth:16,frame_size:0}}},payload:{text:{encoding:'utf8',compress:'raw',format:'plain',status:2,seq:0,text:Buffer.from(text).toString('base64')}}})));
  socket.addEventListener('message',event=>{try{const p=JSON.parse(event.data);if(p.header?.code){finish(Error(`讯飞合成失败（${p.header.code}），请检查音色授权或额度`));return;}for(const [key,map,field] of [['audio',audio,'audio'],['pybuf',timing,'text']]){const chunk=p.payload?.[key];if(chunk?.[field]){const b=Buffer.from(chunk[field],'base64');bytes+=b.length;if(bytes>16000000)throw Error('讯飞返回音频过长');map.set(chunk.seq,b);}}if(p.header?.status===2)finish();}catch{finish(Error('讯飞响应数据无效'));}});
  socket.addEventListener('error',()=>finish(Error('讯飞连接失败，请检查网络')));socket.addEventListener('close',()=>{if(!done)finish(Error('讯飞连接提前关闭'));});
 });
 const join=map=>Buffer.concat([...map].sort((a,b)=>a[0]-b[0]).map(v=>v[1]));
 const pcm=join(packets.audio);if(!pcm.length||pcm.length%2)throw Error('讯飞未返回有效音频');
 const duration=pcm.length/48000,timing=parseTiming(join(packets.timing).toString('utf8'));
 if(!timing.phonemes.length||Math.abs(timing.duration-duration)>.1)throw Error('讯飞音素与音频时长不一致，暂不播放');
 return {source:'xfyun',voice,region:'讯飞超拟人',speechPace:pace,synthesisRate:speed,playbackRate:1,animationSource:'authored-phoneme-mapping',phonemes:timing.phonemes,frames:timingFrames(timing.phonemes,duration),visemes:[],words:[],syllables:[],duration,phonemeDuration:timing.duration,mime:'audio/wav',audioBase64:pcmWav(pcm).toString('base64')};
}
