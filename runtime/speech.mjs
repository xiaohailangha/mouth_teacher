import sdk from 'microsoft-cognitiveservices-speech-sdk';
import {normalizeFrames} from './public/timeline.mjs';
import {pronunciationPlan,alignSyllables} from './pronunciation.mjs';
import {resolveVoiceProfile} from './voice-profiles.mjs';
import {resolveSpeechPace,paceContent,naturalContent} from './speech-pace.mjs';
let lastSuccess=null;
export const escapeXml = s => s.replace(/[<>&"']/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
function safeErrorDetails(value) {
 const secret=process.env.AZURE_SPEECH_KEY || '';
 let message=String(value || 'Azure 未提供具体错误信息');
 if(secret) message=message.replaceAll(secret,'[密钥已隐藏]');
 return message.replace(/\b[A-Za-z0-9+/]{32,}={0,2}\b/g,'[敏感值已隐藏]').slice(0,500);
}
export function speechConfigStatus() {
 const key=process.env.AZURE_SPEECH_KEY || '';
 return {application:'mouth-teacher',version:3,configured: Boolean(/^[A-Za-z0-9+/=]{32,}$/.test(key) && process.env.AZURE_SPEECH_REGION && process.env.AZURE_SPEECH_VOICE), region: process.env.AZURE_SPEECH_REGION || null, voice: process.env.AZURE_SPEECH_VOICE || null,role:process.env.AZURE_SPEECH_ROLE||null,style:process.env.AZURE_SPEECH_STYLE||null, verified:Boolean(lastSuccess),lastSuccess};
}
export function synthesize(text, signal, {articulation=false,voiceProfile,readings,pace}={}) {
 const speechPace=resolveSpeechPace(pace);
 const status=resolveVoiceProfile(voiceProfile,speechConfigStatus());
 if (!status.configured) return Promise.reject(Object.assign(Error('尚未配置 Azure Speech。请在 Windows 运行 tools/configure_speech.ps1，密钥不会进入 App。'),{status:503}));
 if (!/^zh-CN-[A-Za-z0-9-]+$/.test(status.voice)) return Promise.reject(Error('请配置 zh-CN 普通话声音'));
 const config=sdk.SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY,status.region);
 const proxy=process.env.AZURE_SPEECH_PROXY;
 if(proxy){
  const match=/^([A-Za-z0-9.-]+):(\d{1,5})$/.exec(proxy);
  if(!match || Number(match[2])>65535) return Promise.reject(Error('AZURE_SPEECH_PROXY 格式应为 主机:端口'));
  config.setProxy(match[1],Number(match[2]));
 }
 config.speechSynthesisVoiceName=status.voice;
 config.speechSynthesisOutputFormat=sdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm;
 const plan=articulation?pronunciationPlan(text,readings):null;
 let content=paceContent(plan?.content||naturalContent(text,escapeXml,speechPace),speechPace);
 if(status.role||status.style)content=`<mstts:express-as style="${escapeXml(status.style||'cheerful')}"${status.role?` role="${escapeXml(status.role)}"`:''}>${content}</mstts:express-as>`;
 const ssml=`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="zh-CN"><voice name="${escapeXml(status.voice)}"><mstts:viseme type="FacialExpression"/>${content}</voice></speak>`;
 return new Promise((resolve,reject)=>{
  const synthesizer=new sdk.SpeechSynthesizer(config,null);
  const groups=[],visemes=[],words=[]; let settled=false, parseError;
  const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);synthesizer.close(); error?reject(error):resolve(value);};
  const abort=()=>finish(Object.assign(Error('合成已取消'),{status:499}));
  const timer=setTimeout(()=>finish(Object.assign(Error('Azure 合成超时'),{status:504})),45000);
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){abort();return;}
  synthesizer.wordBoundary=(_,e)=>{if(e.boundaryType===sdk.SpeechSynthesisBoundaryType.Word)words.push({time:e.audioOffset/10000000,duration:e.duration/10000000,text:e.text,textOffset:e.textOffset});};
  synthesizer.visemeReceived=(_,e)=>{
   if(!e.animation)visemes.push({time:e.audioOffset/10000000,id:e.visemeId});
   if(e.animation) {try{groups.push(JSON.parse(e.animation));}catch{parseError=Error('Azure 面部数据不是有效 JSON');}}
  };
  synthesizer.speakSsmlAsync(ssml,result=>{
   if(result.reason!==sdk.ResultReason.SynthesizingAudioCompleted){
    const cancellation=sdk.CancellationDetails.fromResult(result);
    const detail=safeErrorDetails(result.errorDetails || cancellation.errorDetails);
    finish(Error(`Azure 合成失败（代码 ${cancellation.ErrorCode}）：${detail}`));return;
   }
   try {
    if(parseError)throw parseError;
    const frames=normalizeFrames(groups);
    if(!result.audioData?.byteLength)throw Error('Azure 未返回音频');
    lastSuccess={at:new Date().toISOString(),frames:frames.length,channels:55};
    finish(null,{schema:1,source:'azure',speechPace:speechPace.id,synthesisRate:speechPace.rate,playbackRate:1,voice:status.voice,role:status.role,style:status.style,region:status.region,frames,visemes,words,syllables:plan?alignSyllables(plan.syllables,words):[],pronunciationMode:plan?'explicit-syllables':'natural',audioBase64:Buffer.from(result.audioData).toString('base64'),mime:'audio/wav'});
   }catch(error){finish(error);}
  },error=>finish(Error(`Azure 连接失败：${safeErrorDetails(error)}`)));
 });
}
