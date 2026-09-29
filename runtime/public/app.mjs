import {OralR31} from './oral-r30.mjs';
import {sampleBasicTongue} from './tongue-basic.mjs';
import {faceRound29Weights} from './face-round29.mjs';
import {speechFace} from './speech-face.mjs';
import {faceV5Weights,tongueActions} from './face-v5.mjs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {controlsFromFrame,CHANNELS,sampleFrames} from './timeline.mjs';
import {SpeechPlayer} from './player.mjs';
import {a2fFixturePacket,sampleA2fTongue} from './a2f-fixture.mjs';
import {retargetControls,visemeWeights} from './retarget.mjs';
import {OralView,constrainTongueShader} from './oral-view.mjs';
import {sampleArticulation} from './articulation.mjs';
import {speechMotion} from './speech-motion.mjs';
const sampleTongue=(...args)=>(assetVersion===6?sampleBasicTongue:sampleArticulation)(...args);
const $=id=>document.getElementById(id);
const requestedVersion=new URLSearchParams(location.search).get('asset');
const assetVersion=requestedVersion==='1'?1:requestedVersion==='2'?2:requestedVersion==='3'?3:requestedVersion==='4'?4:requestedVersion==='5'?5:6;
const assetPath=assetVersion>=2?`/character-v${Math.min(assetVersion,5)}`:'/character';
const canvas=$('scene'), scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
if(assetVersion>=2){
 renderer.toneMappingExposure=1.0;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
 scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.35;room.dispose();pmrem.dispose();
}
const camera=new THREE.PerspectiveCamera(30,1,.01,100);camera.position.set(0,1.22,2.9);
const orbit=new OrbitControls(camera,canvas);orbit.target.set(0,1.22,0);orbit.enableDamping=true;orbit.minDistance=1.35;orbit.maxDistance=6;orbit.maxPolarAngle=Math.PI*.6;
let closeView=true,mouthView=false;
function frameCamera(){if(oralView?.active){orbit.minDistance=.22;camera.position.set(oralSide?.57:.28,.995,oralSide?.20:.69);orbit.target.set(0,.916,.18);orbit.update();return;}orbit.minDistance=1.35;const distance=Math.max(mouthView?1.8:closeView?2.9:3.95,(mouthView?.75:1.35)/(2*Math.tan(Math.PI/12)*camera.aspect)+.3),height=mouthView?1.02:closeView?1.22:.9;camera.position.set(0,height,distance);orbit.target.set(0,height,0);orbit.update();}
function mouthButton(){ $('mouth-camera').textContent=mouthView?'恢复视角':'放大嘴型';$('mouth-camera').setAttribute('aria-pressed',String(mouthView)); }
$('camera').onclick=()=>{mouthView=false;closeView=!closeView;frameCamera();mouthButton();$('camera').textContent=closeView?'看看全身':'看清嘴型';};
$('mouth-camera').onclick=()=>{mouthView=!mouthView;frameCamera();mouthButton();};
scene.add(new THREE.HemisphereLight(0xfff7e6,0x8aa991,assetVersion>=2?.9:2.5));
const light=new THREE.DirectionalLight(0xffffff,assetVersion>=2?2.4:3);light.position.set(-2,3,4);scene.add(light);
if(assetVersion>=2){light.position.set(-1.5,3.5,5);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-1.2,right:1.2,top:2,bottom:-.4,near:.1,far:9});light.shadow.bias=-.0002;light.shadow.normalBias=.001;light.shadow.radius=3;}
const fill=new THREE.DirectionalLight(0xffecd3,assetVersion>=2?.8:1.5);fill.position.set(2,1,-1);scene.add(fill);
const group=new THREE.Group();group.rotation.x=-Math.PI/2;scene.add(group);
let manifest,model,bones={},morphs=[],raf,ready=false,manual={},frameCount=0,lastControls={},oralView,oralSide=true,tongueDemo='tip',holdDemo=false,lessonSpeech=false,gestureStart=-100;
let demoEnabled=false,demoStarted=0,heldWeight=0,oralPaused=null,presentWeight=0,lastRenderTime=0;
const demos={tip:{channel:'tongueTipUp',text:'啦，啦，啦。',viseme:14,jaw:.1,description:'舌尖接近上齿龈，再放下。l 的位置示意，气流细节未标定。'},mid:{channel:'tongueMidUp',text:'衣，衣，衣。',viseme:6,jaw:.18,description:'舌前中部抬高，舌尖保持较低。i 的舌位示意。'},root:{channel:'tongueRootUp',text:'哥，哥，哥。',viseme:20,jaw:.15,description:'舌后部向软腭方向抬起，再释放。g 的位置示意；紫色延伸段是舌根区域参照。'}};
demos.front={channel:'tongueTipUp',gain:.4,extra:{tongueGroove:.8},text:'思，思，思。',jaw:.06,description:'舌尖靠近齿背，舌面形成窄通道。s 的位置示意，气流未标定。'};
demos.retro={channel:'tongueRetroflex',gain:.9,extra:{tongueGroove:.25},text:'诗，诗，诗。',jaw:.12,description:'舌尖后缩并上翘，靠近硬腭前部。sh 的一种位置示意，尚未专业标定。'};
const resize=new ResizeObserver(()=>{const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();frameCamera();});resize.observe(canvas.parentElement);
const audio=new Audio();audio.preload='auto';
function requirePairing(){if(!$('pair-dialog').open)$('pair-dialog').showModal();$('status').textContent='请家长先连接家庭服务。';}
function showServiceStatus(status){
 if(status.pairingRequired){requirePairing();return;}
 $('status').textContent=status.configured?'小虎子准备好了，试着说一句吧。':'语音尚未配置，请家长先完成本机设置。';
 $('speech-config').textContent=status.configured?`${status.voice}${status.role?' / '+status.role:''}${status.style?' / '+status.style:''} · ${status.region} · ${status.verified?'本次服务已实测':'尚未实测'}`:'密钥仅保存在 Windows 服务端；请运行本机配置脚本。';
}
$('pair-form').onsubmit=async event=>{
 event.preventDefault();const button=$('pair-form').querySelector('button');button.disabled=true;$('pair-error').textContent='正在连接…';
 try{const response=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:$('pair-code').value})});const data=await response.json();if(!response.ok)throw Error(data.error);$('pair-code').value='';$('pair-dialog').close();showServiceStatus(await fetch('/api/status').then(r=>r.json()));}
 catch(e){$('pair-error').textContent=e.message||'连接失败，请重试。';}finally{button.disabled=false;}
};
// Pace is synthesized by Azure; audio always plays at its original speed.
try{const saved=localStorage.getItem('teacher-pace-v1');if(['gentle','extraSlow','easy','normal'].includes(saved))$('speed').value=saved;}catch{}
audio.defaultPlaybackRate=audio.playbackRate=1;audio.preservesPitch=true;
$('speed').onchange=()=>{player.setPlaybackRate(1);try{localStorage.setItem('teacher-pace-v1',$('speed').value);}catch{}$('status').textContent='下次朗读按新节奏生成；重播保留原音频。';};
 let replayPacket=null;
const mappedSpeech=(row,time)=>player.source==='a2f3d'?{...controlsFromFrame(row),...sampleA2fTongue(player.frames,time)}:player.source==='authored-reference'?controlsFromFrame(row):assetVersion===6?speechFace(row,player.visemes,time,$('mouth-mode').value,Number($('mouth-gain').value)):retargetControls(row,player.visemes,time);
const player=new SpeechPlayer({audio,fetchSpeech:async(text,signal,options)=>{
 const response=await fetch('/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,articulation:options?.articulation===true,voiceProfile:$('voice-profile').value,readings:options?.readings,pace:$('speed').value}),signal});
 const data=await response.json();if(data.pairingRequired)requirePairing();if(!response.ok)throw Error(data.error || '合成失败');
 if(!signal.aborted)$('speech-config').textContent=`${data.voice}${data.role?' / '+data.role:''}${data.style?' / '+data.style:''} · ${data.region} · 本次合成已验证`;
 if(signal.aborted)throw Error('已停止');
  replayPacket=data;$('replay').disabled=false;return data;
},onState:(state,message)=>{
 const reference=['authored-reference','a2f3d'].includes(player.source)&&['playing','paused','ready'].includes(state);
 $('mouth-mode').disabled=reference;$('mouth-gain').disabled=reference||$('mouth-mode').value!=='clear';
  if(ready&&assetVersion===6&&['playing','paused'].includes(state))$('model-status').textContent=`小虎子 · R31 · ${player.source==='a2f3d'?'Audio2Face 面部与舌头帧':player.source==='authored-reference'?'单句校准参考':player.source==='azure'?'Azure 口型':'同步测试'}`;
 if(state==='paused')oralPaused={...lastControls};else oralPaused=null;
 if(oralView?.active)$('oral-hold').textContent=state==='paused'?'继续配音':'定格观察';
 $('status').textContent=message; $('speak').disabled=!ready;
 if(state==='playing' && player.source==='azure')$('speech-config').textContent=$('speech-config').textContent.replace('尚未实测','本次合成已验证');
 $('stop').disabled=state==='idle';$('pause').disabled=state!=='playing';$('resume').disabled=!['paused','ready'].includes(state);
 if(state==='idle'){$('progress').value=0;if(oralView?.active)$('oral-description').textContent=demos[tongueDemo].description;}
}});
async function setupA2fFixtures(){
 try {
  const response=await fetch('/fixtures/a2f/manifest.json');if(!response.ok)return;
  const manifest=await response.json();const entries=manifest.entries?.filter(entry=>entry.faceSource==='nvidia-audio2face-3d-v3.0'&&/^\d{2}-(?:face|full)\.json$/.test(entry.face));
  if(!entries?.length)return;
  const select=$('a2f-fixture-select');
  for(const entry of entries){const option=document.createElement('option');option.value=entry.id;option.textContent=`${entry.id} · ${entry.text}`;select.append(option);}
  $('a2f-fixtures').hidden=false;
  $('a2f-fixture-play').onclick=async()=>{
   const entry=entries.find(item=>item.id===select.value);if(!entry)return;
   resetManual();player.stop('');const generation=player.generation;player.abort=new AbortController();player.setState('synthesizing','正在读取离线面部帧…');
   try {
    const result=await fetch(`/fixtures/a2f/${entry.face}`,{signal:player.abort.signal});if(!result.ok)throw Error('面部数据读取失败');
    const packet=a2fFixturePacket(entry,await result.json());if(generation!==player.generation)return;
    $('text').value=entry.text;replayPacket=packet;$('replay').disabled=false;
    mouthView=true;frameCamera();mouthButton();await player.load(packet,generation);
   }catch(error){if(generation===player.generation)player.stop(error.message||'离线样例读取失败');}
  };
 }catch(error){console.warn('Audio2Face fixture manifest unavailable:',error.message);}
}
setupA2fFixtures();
function resetManual(){manual={};lessonSpeech=false;demoEnabled=false;document.querySelectorAll('#sliders input').forEach(e=>e.value=0);}
function setOral(active){
 if(!oralView)return;oralView.setActive(active);oralView.setSection(oralSide);$('oral-side').textContent=oralSide?'正面观察':'侧面剖视';demoEnabled=active&&player.state==='idle';holdDemo=false;demoStarted=performance.now()/1000;
 document.body.classList.toggle('oral-mode',active);$('oral-tools').hidden=!active;$('oral-legend').hidden=!active;
 document.querySelector('.observation-note').hidden=!active;$('oral-toggle').setAttribute('aria-pressed',String(active));$('oral-toggle').textContent=active?'返回小虎子':'看口腔内部';
 $('oral-description').textContent=demos[tongueDemo].description;
 document.querySelector('.panel h2').textContent=active?'看看舌头怎样动':'今天想说些什么？';document.querySelector('.description').textContent=active?'选一个部位，或输入新句子逐字观察。':'写一句新话，让小虎子说给你听。';
 document.querySelector('.heading h1').textContent=active?'走进口腔看一看':'慢慢说，开心学';document.querySelector('.heading p').textContent=active?'原模型舌体 · 牙齿与内壁 · 侧面剖视':'看嘴型 · 听声音 · 跟着说';frameCamera();
}
$('oral-toggle').onclick=()=>setOral(!oralView?.active);
document.querySelectorAll('[data-tongue]').forEach(button=>button.onclick=()=>{player.stop('慢动作舌位示意');tongueDemo=button.dataset.tongue;lessonSpeech=false;holdDemo=false;demoEnabled=true;demoStarted=performance.now()/1000;$('oral-hold').textContent='定格观察';$('oral-description').textContent=demos[tongueDemo].description;document.querySelectorAll('[data-tongue]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));});
$('oral-hold').onclick=()=>{if(['playing','paused','ready'].includes(player.state)){if(player.state==='playing')player.pause();else player.resume();return;}holdDemo=!holdDemo;heldWeight=(lastControls[demos[tongueDemo].channel]||0)/(demos[tongueDemo].gain||1);demoEnabled=true;if(!holdDemo)demoStarted=performance.now()/1000-Math.acos(1-2*Math.min(1,Math.max(0,heldWeight)))*2/Math.PI;$('oral-hold').textContent=holdDemo?'继续慢动作':'定格观察';};
$('oral-side').onclick=()=>{oralSide=!oralSide;oralView?.setSection(oralSide);$('oral-side').textContent=oralSide?'正面观察':'侧面剖视';frameCamera();};
$('oral-read').onclick=()=>{lessonSpeech=false;demoEnabled=false;player.speak(demos[tongueDemo].text,{articulation:true});};
$('greet').onclick=()=>{
 // A greeting must show the hand; the mouth close-up otherwise hides it.
 if(!oralView?.active){mouthView=false;closeView=false;frameCamera();mouthButton();$('camera').textContent='看清嘴型';}
 gestureStart=performance.now()/1000;
};
$('speak').onclick=()=>{resetManual();const text=$('text').value.trim();if(!text){$('status').textContent='先写一句话吧。';return;}player.speak(text);};
$('observe').onclick=()=>{const text=$('text').value.trim();if(!text){$('status').textContent='先写一句话吧。';return;}setOral(true);resetManual();player.speak(text,{articulation:true,readings:readings.value.trim()});};
$('stop').onclick=()=>{resetManual();demoEnabled=false;holdDemo=false;$('oral-hold').textContent='定格观察';player.stop();};$('pause').onclick=()=>player.pause();$('resume').onclick=()=>player.resume();
$('progress').oninput=()=>{
 if(!player.seek(Number($('progress').value)*audio.duration))return;
 const row=sampleFrames(player.frames,audio.currentTime);
 const pose=player.source!=='synthetic-test'?mappedSpeech(row,audio.currentTime):controlsFromFrame(row);
 if(player.syllables.length){const a=sampleTongue(player.syllables,player.visemes,audio.currentTime);Object.assign(pose,a.controls);pose.jawOpen=Math.min(pose.jawOpen,a.jawLimit);}
 oralPaused={...lastControls,...pose};
 // Clear tongue channels absent at a silent interval instead of retaining the
 // tongue from the previously selected syllable.
 for(const name of ['tongueTipUp','tongueMidUp','tongueRootUp','tongueRetroflex','tongueGroove','tongueLateral'])oralPaused[name]=pose[name]||0;
};
async function playComparison(packet){if(!packet)return;resetManual();player.stop('');replayPacket=packet;try{await player.load(packet);}catch(e){player.stop(e.message);}}
 $('replay').onclick=()=>playComparison(replayPacket);
async function playSentenceReference(calibrated){
 if(!ready)return;
 resetManual();player.stop('');const generation=player.generation;
 player.abort=new AbortController();player.setState('synthesizing','正在读取同一句参考音频…');
 try{
  const response=await fetch('/reference/pace/'+$('speed').value+'-'+(calibrated?'baba-reference.json':'baba-azure.json'),{signal:player.abort.signal});
  if(!response.ok)throw Error('参考音频读取失败');const packet=await response.json();
  if(generation!==player.generation)return;
  $('text').value='爸爸抱宝宝，妈妈买面包。';player.setPlaybackRate(1);
  $('mouth-mode').value='clear';$('mouth-gain').value='1.5';$('mouth-gain-value').textContent='1.50 倍';
  mouthView=true;frameCamera();mouthButton();replayPacket=packet;$('replay').disabled=false;
  $('reference-note').textContent=calibrated?'新节奏音频＋按新时间线迁移的人工口型。仅作动画对照，需重新验收。':'同一音频：Azure 数据＋当前舒展映射，幅度 1.50 倍。';
  await player.load(packet,generation);
 }catch(e){if(generation===player.generation)player.stop(e.message);}
}
async function playTongueDiagnostic(enabled){
 if(!ready)return;resetManual();player.stop('');const id=player.generation;player.abort=new AbortController();player.setState('synthesizing','读取固定舌动作诊断音频…');
 try{const r=await fetch('/reference/pace/'+$('speed').value+'-tongue-diagnostic.json',{signal:player.abort.signal});if(!r.ok)throw Error('诊断音频读取失败');const packet=await r.json();if(id!==player.generation)return;
 if(!enabled)packet.syllables=[];
 $('text').value='啦，哒，嘎，衣。';setOral(true);demoEnabled=false;player.setPlaybackRate(1);replayPacket=packet;$('replay').disabled=false;
 $('tongue-note').textContent=enabled?'已接入舌尖 / 舌后 / 舌中独立动作；同一音频，按音频时钟播放。方向示意，非精确教学舌位。':'同一音频，关闭独立舌动作，仅保留原有嘴唇与下颌。';
 await player.load(packet,id);
 }catch(e){if(id===player.generation)player.stop(e.message);}
}
$('tongue-play').onclick=()=>playTongueDiagnostic(true);
$('tongue-original').onclick=()=>playTongueDiagnostic(false);
$('reference-play').onclick=()=>playSentenceReference(true);
$('reference-original').onclick=()=>playSentenceReference(false);
$('mouth-gain').oninput=()=>{$('mouth-gain-value').textContent=Number($('mouth-gain').value).toFixed(2)+' 倍';};
$('mouth-mode').onchange=()=>{$('mouth-gain').disabled=$('mouth-mode').value!=='clear';};
$('reset').onclick=()=>{resetManual();player.stop();};
document.querySelectorAll('[data-text]').forEach(el=>el.onclick=()=>{$('text').value=el.dataset.text;$('readings').value='';});
$('text').addEventListener('input',()=>{$('readings').value='';});
for(const [name,label] of [['jawOpen','张口'],...(assetVersion===6?[['mouthClose','联动闭口']]:[]),['mouthPucker','圆唇（形态键）'],['mouthSmileLeft','左嘴角'],['eyeBlinkLeft','左眼闭合'],['eyeBlinkRight','右眼闭合'],['tongueTipUp','舌尖抬起'],...(assetVersion>=5?[['tongueExtend','伸舌'],['tongueRetract','收舌'],['tongueLeft','舌头向左'],['tongueRight','舌头向右'],['tongueMiddleRaise','舌中抬起'],['tongueRootRaise','舌根段抬起'],['tongueTipCurl','舌尖弯曲']]:[])]){
 const labelEl=document.createElement('label');labelEl.textContent=label;const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=1;slider.step=.01;slider.value=0;slider.dataset.channel=name;
   slider.oninput=()=>{demoEnabled=false;lessonSpeech=false;holdDemo=false;if(player.state!=='idle')player.stop('基础变形检查');manual[name]=Number(slider.value);};labelEl.append(slider);$('sliders').append(labelEl);
}
const p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3(),baseQ=new THREE.Quaternion(),deltaQ=new THREE.Quaternion(),retainQ=new THREE.Quaternion();
function applyControls(values,time){
 if(assetVersion>=5)values=assetVersion===6?faceRound29Weights(values,{a2f:player.source==='a2f3d'}):faceV5Weights(values);
 lastControls=values;
 for(const [name,base] of Object.entries(manifest.neutral)){
  const b=bones[name];if(!b)continue;b.position.fromArray(base.p);b.quaternion.fromArray(base.q);b.scale.fromArray(base.s);
 }
 // Close reduces skeletal jaw opening; do not add a second jaw morph.
 const poseWeights={jawOpen:Math.max(0,(values.jawOpen||0)*(assetVersion>=2?1:1-(values.mouthClose||0)))};
 for(const name of ['tongueOut','tongueTipUp','tongueMidUp','tongueRootUp','tongueForward','gestureWave','gesturePresent'])if(manifest.poses[name])poseWeights[name]=values[name]||0;
 for(const [pose,weight] of Object.entries(poseWeights)){
  if(!weight || (assetVersion>=5 && !pose.startsWith('gesture')))continue;
  for(const [name,target] of Object.entries(manifest.poses[pose])){
   const b=bones[name],base=manifest.neutral[name];if(!b)continue;
   const retained=pose==='jawOpen'?manifest.poses.jawClosedLips?.[name]:null,retain=retained?Math.min(1,Math.max(0,values.jawLipRetain||0)):0;
   p.fromArray(target.p);if(retain)p.lerp(s.fromArray(retained.p),retain);p.sub(s.fromArray(base.p));b.position.addScaledVector(p,weight);
   baseQ.fromArray(base.q);q.fromArray(target.q);if(retain)q.slerp(retainQ.fromArray(retained.q),retain);deltaQ.copy(baseQ).invert().multiply(q);q.identity().slerp(deltaQ,weight);b.quaternion.multiply(q);
   for(let i=0;i<3;i++){const scale=target.s[i]+(retain?(retained.s[i]-target.s[i])*retain:0);b.scale.setComponent(i,b.scale.getComponent(i)*(1+(scale/base.s[i]-1)*weight));}
  }
 }
 for(const mesh of morphs){for(const [name,index] of Object.entries(mesh.morphTargetDictionary))mesh.morphTargetInfluences[index]=Math.min(1,Math.max(0,values[name]||0));}
 // Small procedural idle motion is independent of speech time.
 const head=bones['head.x'];if(head&&!oralView?.active){head.rotateY(Math.sin(time*.71)*.025);head.rotateX(Math.sin(time*1.1)*.018+(values.headSpeechNod||0));if($('expression').value==='curious')head.rotateY(.055);}
 model.rotation.z=oralView?.active?0:Math.sin(time*.53)*.012;
 const hand=bones['hand.r'];if(hand&&!oralView?.active)hand.rotateY(Math.sin(time*7)*.24*(values.gestureWave||0));
}
let nextBlink=2.8,blinkStart=-100;
function render(ms){
 const t=ms/1000;
 const dtFrame=Math.min(.1,Math.max(0,t-lastRenderTime));lastRenderTime=t;
 if(ready){
  const row=player.state==='paused'?sampleFrames(player.frames,audio.currentTime):player.sample();
  const speaking=player.state==='playing'&&!audio.paused&&!player.waiting;
  const v=assetVersion>=2&&speaking&&player.source!=='synthetic-test'?mappedSpeech(row,audio.currentTime):controlsFromFrame(row);
  const articulation=sampleTongue(player.syllables,player.visemes,audio.currentTime);
  if(speaking&&player.syllables.length){Object.assign(v,articulation.controls);v.jawOpen=Math.min(v.jawOpen,articulation.jawLimit);}
  if(oralPaused){Object.assign(v,mappedSpeech(sampleFrames(player.frames,audio.currentTime),audio.currentTime));if(player.syllables.length){Object.assign(v,articulation.controls);v.jawOpen=Math.min(v.jawOpen,articulation.jawLimit);}}
  const currentWord=player.words.find(w=>audio.currentTime>=w.time&&audio.currentTime<w.time+w.duration);
  const unit=articulation.syllable;
  $('spoken-unit').hidden=!['playing','paused'].includes(player.state)||!(unit||currentWord);
  const phoneticText=unit?(unit.displayPinyin||unit.pinyin.replaceAll('v','ü')+(unit.tone===5?'':unit.tone)):'';
  $('spoken-unit').textContent=unit?`${unit.text} · ${phoneticText}${oralView?.active&&!articulation.supported?' · 舌位待细分':''}`:currentWord?.text||'';
  if(oralView?.active&&player.syllables.length&&['playing','paused'].includes(player.state))$('oral-description').textContent=unit?`${unit.text}（${phoneticText}）：${articulation.description}`:'字间停顿，舌头回到过渡位置。';
  if(oralView?.active){

   if(!oralPaused&&demoEnabled&&!speaking&&!['paused','synthesizing','ready'].includes(player.state)){const demo=demos[tongueDemo],weight=holdDemo?heldWeight:(1-Math.cos((t-demoStarted)*Math.PI/2))*.5;v.jawOpen=demo.jaw;v[demo.channel]=weight*(demo.gain||1);for(const [name,gain] of Object.entries(demo.extra||{}))v[name]=weight*gain;$('stop').disabled=false;}
   else if(speaking&&lessonSpeech){const demo=demos[tongueDemo],weight=visemeWeights(player.visemes,audio.currentTime)?.get(demo.viseme)||0;v[demo.channel]=weight;v.jawOpen=Math.min(v.jawOpen,1-(1-demo.jaw)*weight);}
  }else{
   const g=t-gestureStart;v.gestureWave=g>=0&&g<3?Math.sin(Math.PI*g/3)**2*.95:0;
   const motion=speechMotion(player.words,audio.currentTime);
   if(speaking){presentWeight=motion.gesturePresent;v.headSpeechNod=motion.headSpeechNod;}
   else if(player.state==='paused'){presentWeight=oralPaused?.gesturePresent||0;v.headSpeechNod=oralPaused?.headSpeechNod||0;}
   else presentWeight*=Math.exp(-dtFrame*5);
   v.gesturePresent=presentWeight;
   const expression=$('expression').value,happy=expression==='happy',curious=expression==='curious';
   v.browInnerUp=Math.max(v.browInnerUp||0,(curious?.3:.07)+v.gestureWave*.12);
   if(happy){v.eyeSquintLeft=.18;v.eyeSquintRight=.18;v.browOuterUpLeft=.2;v.browOuterUpRight=.2;}
   if(curious){v.eyeWideLeft=.15;v.eyeWideRight=.1;v.browOuterUpLeft=.25;}
   if(!speaking&&player.state!=='paused'){v.mouthSmileLeft=(happy?.45:.10)+v.gestureWave*.2;v.mouthSmileRight=(happy?.45:.10)+v.gestureWave*.2;}
  }
  if(t>nextBlink){blinkStart=t;nextBlink=t+3+Math.random()*3;}
  const dt=t-blinkStart;const blink=dt>=0&&dt<.2?Math.sin(dt/.2*Math.PI):0;
  v.eyeBlinkLeft=Math.max(v.eyeBlinkLeft,blink);v.eyeBlinkRight=Math.max(v.eyeBlinkRight,blink);
  Object.assign(v,manual);applyControls(v,t);
  $('progress').value=Number.isFinite(audio.duration)&&audio.duration>0?audio.currentTime/audio.duration:0;
  $('progress').disabled=!['playing','paused','ready'].includes(player.state)||!Number.isFinite(audio.duration)||audio.duration<=0;
  if(++frameCount%30===0)$('debug').textContent=`状态 ${player.state} · 音频 ${audio.currentTime.toFixed(2)} s · ${morphs.length} 个形态键网格 · ${renderer.info.render.calls} draw calls · 模型 ${assetVersion===6?'R31':assetVersion} · 服务张口 ${Number(row[17]||0).toFixed(2)} → 映射 ${Number(lastControls.jawOpen||0).toFixed(2)}`;
 }
 orbit.update();if(oralView){scene.updateMatrixWorld(true);oralView.updateEnvelope?.();}renderer.render(scene,camera);
 $('oral-labels').hidden=!oralView?.active||!oralView.landmarks;
 if(oralView?.active){const labels=$('oral-labels').children;(oralView.landmarks?.()||[]).forEach((point,i)=>{point.project(camera);const x=Math.max(6,Math.min(canvas.clientWidth-75,(point.x*.5+.5)*canvas.clientWidth-25)),y=(-point.y*.5+.5)*canvas.clientHeight+canvas.offsetTop-24;labels[i].style.transform=`translate(${x}px,${y}px)`;});}
 raf=requestAnimationFrame(render);
}
try{
 const [gltf,data]=await Promise.all([new GLTFLoader().loadAsync(assetPath+'/tiger.glb'),fetch(assetPath+'/controls.json').then(r=>r.json())]);
 model=gltf.scene;manifest=data;
 if(assetVersion>=5){
  const face=await new GLTFLoader().loadAsync(assetPath+(assetVersion===6?'/face-round31.glb':'/face.glb'));
  const head=model.getObjectByName('head.x')||model.getObjectByName('headx');
  model.updateMatrixWorld(true);
  const replacements=[...face.scene.children];
  for(const mesh of replacements){
   const old=model.getObjectByName(mesh.name);
   if(!old)throw Error('找不到被替换网格 '+mesh.name);
   // Preserve the existing runtime-compatible textures and materials.
   const oldMeshes=[];old.traverse(o=>{if(o.isMesh)oldMeshes.push(o);}); let part=0; mesh.traverse(o=>{if(o.isMesh){const source=oldMeshes[part++]||oldMeshes[0];if(o.material?.name==='Oral_Cavity')o.material=o.material.clone();else o.material=Array.isArray(source.material)?source.material.map(m=>m.clone()):source.material.clone();}});
   old.removeFromParent();model.add(mesh);model.updateMatrixWorld(true);if(head)head.attach(mesh);
  }
 }
 model.traverse(o=>{if(o.isBone)bones[o.name]=o;if(o.morphTargetDictionary)morphs.push(o);if(o.isMesh)o.frustumCulled=false;});
 const eyeMaterials=new Map();
 if(assetVersion>=2)model.traverse(o=>{if(o.isMesh){
 const eyeMaterial=mat=>{if(!mat.name.startsWith('Runtime_Tiny'))return mat;if(!eyeMaterials.has(mat.uuid))eyeMaterials.set(mat.uuid,new THREE.MeshPhysicalMaterial({name:mat.name,map:mat.map,color:mat.color,roughness:.22,metallic:0,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.4}));return eyeMaterials.get(mat.uuid);};
 o.material=Array.isArray(o.material)?o.material.map(eyeMaterial):eyeMaterial(o.material);
 // The GLB shares Tongue.001 with both gums. Isolate the tongue before
 // assigning deformation shaders, otherwise the gums inherit the correction.
 if(o.name==='Teacher_舌头')o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();
 o.castShadow=true;o.receiveShadow=true;for(const mat of Array.isArray(o.material)?o.material:[o.material]){
  mat.shadowSide=THREE.BackSide;
  if(mat.name==='Oral_Cavity'){
   // This material belongs only to the authored interior faces, not skin.
   // Retain readable mucosa near the opening, with a soft depth transition.
   mat.color.setRGB(.43,.12,.135);mat.roughness=.78;mat.metalness=0;
   mat.envMapIntensity=.75;mat.emissive.setRGB(.16,.035,.044);mat.emissiveIntensity=.65;
   mat.onBeforeCompile=shader=>{
    shader.vertexShader='varying float vCavityDepth;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>','#include <skinning_vertex>\nvCavityDepth = transformed.y;');
    shader.fragmentShader='varying float vCavityDepth;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight *= mix(1.0, 0.72, smoothstep(-0.25, -0.10, vCavityDepth));\n#include <opaque_fragment>');
   };
   mat.customProgramCacheKey=()=> 'oral-mucosa-depth-v2';
  }
  if(mat.name.startsWith('Runtime_Tiny')){
   mat.transparent=false;mat.depthWrite=true;mat.side=THREE.FrontSide;mat.alphaTest=mat.name.includes('Sclera')?.35:0;
   mat.roughness=.13;mat.envMapIntensity=1.3;mat.needsUpdate=true;
  }
  if(mat.name.includes('Tongue')){mat.color.setRGB(.32,.025,.031);mat.roughness=.53;mat.envMapIntensity=.08;}
  if(mat.name.includes('Teeth')){mat.color.setRGB(.70,.64,.56);mat.roughness=.5;mat.envMapIntensity=.06;o.receiveShadow=false;}
  const modernOral=assetVersion>=5&&new URLSearchParams(location.search).get('oralMaterial')!=='legacy';
  if(modernOral&&(mat.name.includes('Tongue')||mat.name.includes('Teeth'))){
   // Faceit meshes have different local coordinates from the old skinned rig.
   // The old local-Y depth mask incorrectly blackened tongue/teeth after export.
   mat.metalness=0;mat.envMapIntensity=.45;mat.roughness=.55;
   if(mat.name.includes('Tongue')){
    mat.color.setRGB(.40,.075,.085);o.receiveShadow=true;
    mat.emissive.copy(mat.color);mat.emissiveIntensity=.10;
   }
  }
  if(!modernOral&&(mat.name.includes('Tongue')||mat.name.includes('Teeth'))){
   mat.onBeforeCompile=shader=>{
    if(o.name==='Teacher_舌头'&&assetVersion<5)constrainTongueShader(shader);
    shader.vertexShader='varying float vOralDepth;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <skinning_vertex>','#include <skinning_vertex>\nvOralDepth = transformed.y;');
    shader.fragmentShader='varying float vOralDepth;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight *= mix(0.16, 1.0, 1.0 - smoothstep(-0.31, -0.19, vOralDepth));\n#include <opaque_fragment>');
   };
   mat.customProgramCacheKey=()=> o.name==='Teacher_舌头'?'oral-depth-ceiling-v3':'oral-depth-v1';
  }
 }}});
 // Blender/glTF may sanitize punctuation in bone names; preserve the source mapping.
 for(const name of Object.keys(manifest.neutral))if(!bones[name])bones[name]=bones[name.replaceAll('.','')];
 const missing=Object.keys(manifest.neutral).filter(n=>!bones[n]);if(missing.length)throw Error(`缺少 ${missing.length} 个骨骼节点`);
 group.add(model);model.updateWorldMatrix(true,true);renderer.render(scene,camera);
 if(assetVersion>=2){
  // Small toon corneal catchlights follow the eye bones and are occluded by eyelids.
  const ray=new THREE.Raycaster(),white=new THREE.MeshBasicMaterial({color:0xfffdf4});
  for(const [eyeName,boneName] of [['Teacher_左眼','c_eye.l'],['Teacher_右眼','c_eye.r']]){
   const eye=model.getObjectByName(eyeName),parent=bones[boneName]||bones['head.x'];if(!eye||!parent)continue;
   const bounds=new THREE.Box3().setFromObject(eye),center=bounds.getCenter(new THREE.Vector3());
   for(const [dx,dy,radius] of [[.029,.036,.0055],[.019,.026,.0025]]){
    ray.set(new THREE.Vector3(center.x+dx,center.y+dy,3),new THREE.Vector3(0,0,-1));
    const hit=ray.intersectObject(eye,true)[0];if(!hit)continue;
    const glint=new THREE.Mesh(new THREE.SphereGeometry(radius,10,8),white);glint.name='CornealCatchlight';hit.point.z+=.002;
    glint.position.copy(parent.worldToLocal(hit.point));parent.add(glint);
   }
  }
 }
 if(assetVersion>=3&&assetVersion<5){oralView=new OralView(model,renderer);morphs.push(oralView.tongue);}
 if(assetVersion===6){oralView=new OralR31(model,renderer);document.querySelectorAll('[data-tongue=front],[data-tongue=retro]').forEach(e=>e.hidden=true);demos.tip.description='舌尖独立抬起与放下：基础方向示意，齿龈接触面未标定。';demos.mid.description='舌中独立抬起与放下：基础方向示意，硬腭接触面未标定。';demos.root.text='嘎，嘎，嘎。';demos.root.description='舌后部独立抬起与释放：基础方向示意，接触面未标定。';$('oral-legend').innerHTML='<p>R31 原模型剖视：舌体、牙齿与口腔内壁。未添加解剖学上腭标志。</p>';}else if(assetVersion>=5){$('oral-toggle').hidden=true;$('observe').hidden=true;}
 ready=true;$('reference-play').disabled=false;$('reference-original').disabled=false;$('speak').disabled=false;$('observe').disabled=assetVersion<3;$('model-status').textContent=assetVersion===6?'小虎子已就位 · R31 口部模型':'小虎子已就位 · 可自由转动查看';
 const status=await fetch('/api/status').then(r=>r.json());
 showServiceStatus(status);
}catch(error){$('model-status').textContent='角色加载失败';$('status').textContent=error.message;console.error(error);}
raf=requestAnimationFrame(render);
// Explicit synthetic signal tests the real audio clock without pretending to be TTS.
function fixture(){
 const sr=24000,n=sr*4,buffer=new ArrayBuffer(44+n*2),view=new DataView(buffer);const str=(offset,s)=>[...s].forEach((c,i)=>view.setUint8(offset+i,c.charCodeAt(0)));
 str(0,'RIFF');view.setUint32(4,36+n*2,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sr,true);view.setUint32(28,sr*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);str(36,'data');view.setUint32(40,n*2,true);
 for(let i=0;i<n;i++){const t=i/sr,envelope=Math.max(0,Math.sin(t*Math.PI*2));view.setInt16(44+i*2,Math.sin(2*Math.PI*330*t)*envelope*1200,true);}
 const frames=Array.from({length:240},(_,i)=>{const values=Array(55).fill(0);values[17]=Math.max(0,Math.sin(i/60*Math.PI*2));values[20]=Math.max(0,Math.sin(i/60*Math.PI));return {time:i/60,values};});
 let binary='';for(const b of new Uint8Array(buffer))binary+=String.fromCharCode(b);
 return {source:'synthetic-test',frames,mime:'audio/wav',audioBase64:btoa(binary)};
}
$('fixture').onclick=async()=>{resetManual();player.stop('');try{await player.load(fixture());}catch(e){player.stop(e.message);}};
window.teacher={oralVisibility(name,visible){if(['Teacher_舌头','Teacher_牙齿上','Teacher_牙齿下'].includes(name))model.getObjectByName(name).visible=visible;},get ready(){return ready;},get state(){return player.state;},get controls(){return lastControls;},get audioTime(){return audio.currentTime;},get audioDuration(){return audio.duration;},get playbackRate(){return audio.playbackRate;},seek:time=>{if(!player.seek(time))return false;$('progress').value=time/audio.duration;$('progress').oninput();return true;},get frameCount(){return frameCount;},setControls(v){resetManual();player.stop('基础变形检查');manual={...v};},speak:(text,options)=>{resetManual();return player.speak(text,options);},stop:()=>{resetManual();player.stop();},pause:()=>player.pause(),resume:()=>player.resume(),testAudio:()=>{resetManual();player.stop('');return player.load(fixture());},get diagnostics(){return {bones:Object.keys(bones).length,morphs:morphs.map(m=>({name:m.name,keys:Object.keys(m.morphTargetDictionary)})),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,oral:oralView?.probe(),get oralReferences(){return oralView?.referenceProfiles();},get oralAuthoring(){return oralView?.authoringData();}};}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)player.pause();});
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);player.dispose();resize.disconnect();orbit.dispose();oralView?.dispose();scene.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();}});scene.environment?.dispose();renderer.dispose();},{once:true});







