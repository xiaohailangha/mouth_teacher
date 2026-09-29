import {pinyin} from 'pinyin-pro';
const xml=s=>s.replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));

// Explicit syllable pronunciation is a separate slow-observation mode.
// Breaks make Azure return individual word boundaries. Bookmarks before phoneme
// tags were empirically reported at the end, so they are not used for alignment.
export function pronunciationPlan(text,readings){
 if([...text].length>80||/[^\p{Script=Han}\p{P}\s]/u.test(text))throw Object.assign(Error('逐字观察暂支持 80 字以内的汉字和标点；数字、英文请使用自然说话。'),{status:400});
 const units=pinyin(text,{type:'all',toneType:'none'}),displayUnits=pinyin(text,{type:'all'}),syllables=[];
 let specified=null;
 if(readings!==undefined&&readings!==''){
  if(typeof readings!=='string'||readings.length>1000)throw Object.assign(Error('校对拼音格式错误'),{status:400});
  specified=readings.trim().toLowerCase().replaceAll('ü','v').split(/\s+/);
  if(specified.length!==units.filter(u=>u.isZh).length)throw Object.assign(Error('校对拼音须与汉字一一对应，空格分隔，标点不用填写。'),{status:400});
 }
 let content='';
 for(const [index,u] of units.entries()){
  let spelling=u.pinyin.replaceAll('ü','v'),chosenTone=u.num||5;
  if(u.isZh&&specified){
   const match=/^([a-zv]+)([1-5])$/.exec(specified[syllables.length]);
   const allowed=pinyin(u.origin,{multiple:true,type:'array',toneType:'none'}).map(v=>v.replaceAll('ü','v'));
   if(!match||!allowed.includes(match[1]))throw Object.assign(Error(`请核对“${u.origin}”的拼音，使用该字读音加 1–5 声调数字。`),{status:400});
   spelling=match[1];chosenTone=Number(match[2]);
  }
  if(u.isZh&&/^[a-zv]+$/.test(spelling)&&!['m','n','ng','hm','hng'].includes(spelling)){
   const id=syllables.length,tone=chosenTone,initial=specified?(spelling.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])/)?.[0]||''):u.initial;
   syllables.push({id,text:u.origin,pinyin:spelling,displayPinyin:specified?spelling.replaceAll('v','ü')+tone:displayUnits[index].pinyin,tone,initial,final:specified?spelling.slice(initial.length):u.final.replaceAll('ü','v'),pronunciationSource:specified?'parent-reviewed-explicit-ssml':'pinyin-pro-explicit-ssml'});
   content+=`<phoneme alphabet="sapi" ph="${spelling} ${tone}">${xml(u.origin)}</phoneme><break time="120ms"/>`;
  }else if(u.isZh)throw Object.assign(Error(`“${u.origin}”的逐字读音尚未支持，请先使用自然说话。`),{status:400});
  else content+=xml(u.origin);
 }
 if(!syllables.length)throw Object.assign(Error('请至少输入一个汉字。'),{status:400});
 return {content,syllables};
}

export function alignSyllables(syllables,words){
 const spoken=words.map(w=>({...w,characters:w.text.replace(/[^\p{Script=Han}]/gu,'')})).filter(w=>w.characters);
 if(spoken.length!==syllables.length)throw Error('语音服务未返回完整逐字时间；没有用估算时间替代，请重试或使用自然说话。');
 return syllables.map((s,i)=>{const w=spoken[i],time=w.time,end=w.time+w.duration;
  if(w.characters!==s.text||!Number.isFinite(time)||!Number.isFinite(end)||end<=time||(i>0&&time<spoken[i-1].time))throw Error('逐字语音边界与文字不一致，已停止舌位播放。');
  return {...s,time,end,timingSource:'azure-word-boundary',pronunciationSource:s.pronunciationSource||'pinyin-pro-explicit-ssml'};
 });
}
