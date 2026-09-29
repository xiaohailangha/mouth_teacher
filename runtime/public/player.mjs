import {sampleFrames} from './timeline.mjs';
import {normalizeVisemes} from './retarget.mjs';
export class SpeechPlayer {
 constructor({audio,fetchSpeech,onState=()=>{},makeUrl=packet=>URL.createObjectURL(new Blob([Uint8Array.from(atob(packet.audioBase64),c=>c.charCodeAt(0))],{type:packet.mime})),revokeUrl=url=>URL.revokeObjectURL(url)}) {
  Object.assign(this,{audio,fetchSpeech,onState,makeUrl,revokeUrl});this.generation=0;this.playAttempt=0;this.frames=[];this.visemes=[];this.words=[];this.syllables=[];this.state='idle';
  this.setPlaybackRate(audio.playbackRate||1);
  audio.addEventListener('ended',()=>{if(this.state==='playing')this.stop('说完啦，可以再试一句。');});
  audio.addEventListener('error',()=>{if(this.url)this.stop('音频播放失败，请重试。');});
  audio.addEventListener('waiting',()=>{this.waiting=true;});
  audio.addEventListener('playing',()=>{this.waiting=false;});
 }
 setPlaybackRate(rate){if(!Number.isFinite(rate)||rate<=0)throw Error('无效语速');this.playbackRate=rate;this.audio.defaultPlaybackRate=rate;this.audio.playbackRate=rate;this.audio.preservesPitch=true;}
 setState(state,message){this.state=state;this.onState(state,message);}
 stop(message='已停止，回到待机。') {
  ++this.generation;++this.playAttempt;this.abort?.abort();this.abort=null;this.audio.pause();
  this.audio.removeAttribute('src');this.audio.load();
  if(this.url&&this.ownsUrl)this.revokeUrl(this.url);this.url=null;this.ownsUrl=false;this.frames=[];this.visemes=[];this.words=[];this.syllables=[];this.waiting=false;this.setState('idle',message);
 }
 async speak(text,options={}) {
  this.stop('');const id=this.generation;this.abort=new AbortController();
  this.setState('synthesizing','正在生成声音和口型…');
  try{const packet=await this.fetchSpeech(text,this.abort.signal,options);if(id!==this.generation)return;await this.load(packet,id);}
  catch(error){if(id!==this.generation)return;this.stop(error.message || '合成失败');}
 }
 async load(packet,id=this.generation) {
  if(!Array.isArray(packet.frames)||!packet.frames.length||packet.frames.some((f,i)=>!Number.isFinite(f.time)||f.time<0||!Array.isArray(f.values)||f.values.length!==55||f.values.some(v=>!Number.isFinite(v)||v<0||v>1)||(i>0&&f.time<=packet.frames[i-1].time)))throw Error('无效的面部时间序列');
  this.frames=packet.frames;this.visemes=normalizeVisemes(packet.visemes);this.words=(packet.words||[]).filter(w=>Number.isFinite(w.time)&&Number.isFinite(w.duration)&&w.time>=0&&w.duration>=0&&typeof w.text==='string');this.syllables=(packet.syllables||[]).filter(s=>Number.isFinite(s.time)&&Number.isFinite(s.end)&&s.time>=0&&s.end>s.time&&typeof s.pinyin==='string');this.source=packet.source;this.ownsUrl=!packet.audioUrl;this.url=packet.audioUrl||this.makeUrl(packet);this.audio.src=this.url;this.setPlaybackRate(this.playbackRate);
  this.setState('ready','已准备好，点击继续播放。');await this.resume(id);
 }
 async resume(id=this.generation) {
  if(!['ready','paused'].includes(this.state))return;
  this.setPlaybackRate(this.playbackRate);
  const attempt=++this.playAttempt;
  try{await this.audio.play();if(id!==this.generation||attempt!==this.playAttempt)return;this.setState('playing',this.source==='authored-reference'?'单句校准参考 · 爸爸抱宝宝，妈妈买面包':this.source==='a2f3d'?'讯飞声音 + Audio2Face 面部与舌头动画':this.source==='xfyun'?'讯飞超拟人 · 小虎子正在说话…':this.source==='azure'?'小虎子正在说话…':'同步测试音播放中（不是中文语音）');}
  catch{if(id===this.generation&&attempt===this.playAttempt)this.setState('ready','浏览器需要手动播放，请点击“继续”。');}
 }
 pause(){if(this.state==='playing'){this.audio.pause();this.setState('paused','已暂停，点击继续可接着说。');}}
 seek(time){
  if(!['playing','paused','ready'].includes(this.state)||!this.frames.length||!Number.isFinite(time)||!Number.isFinite(this.audio.duration)||this.audio.duration<=0)return false;
  ++this.playAttempt;this.audio.pause();this.audio.currentTime=Math.max(0,Math.min(time,this.audio.duration));this.waiting=false;
  this.setState('paused','已定格到所选位置，点击继续可接着说。');return true;
 }
 sample(){return this.state==='playing'&&!this.audio.paused&&!this.waiting?sampleFrames(this.frames,this.audio.currentTime):new Float32Array(55);}
 dispose(){this.stop('');}
}
