import {visemeWeights} from './retarget.mjs';

// These are broad articulatory targets, not measured tongue motion.
// The explicit syllable disambiguates i from apical vowels and u from ü.
// Unsupported articulations are reported instead of masquerading as a taught pose.
function articulationAt(syllables,events,time){
 const s=syllables.find(s=>time>=s.time&&time<s.end);
 const result={controls:{},jawLimit:1,syllable:s||null,supported:false,description:''};
 if(!s)return result;
 const weights=visemeWeights(events,time),w=id=>weights?.get(id)||0;
 const apical=/^(zhi|chi|shi|ri|zi|ci|si)$/.test(s.pinyin);
 const vowelBefore=events.some(e=>e.time>=s.time-.04&&e.time<=time&&[1,2,4,6,7,8].includes(e.id));
 const retroflex=/^(zh|ch|sh|r)$/.test(s.initial),frontSibilant=/^[zcs]$/.test(s.initial);
 const frontRound=/^(yu|yue|yuan|yun)$/.test(s.pinyin)||/^[jqx]u/.test(s.pinyin)||s.pinyin.includes('v');
 const c=result.controls;
 const alveolar=w(14)+w(19)*((/^[dtn]$/.test(s.initial)||(/[^g]n$/.test(s.final)&&vowelBefore))?1:0);
 const highFront=(!apical?w(6):0)+w(16)+(frontRound?w(7)+w(4):0),highBack=!frontRound?w(7):0;
 c.tongueTipUp=Math.min(1,alveolar);
 c.tongueMidUp=Math.min(1,highFront*.8);
 c.tongueRootUp=Math.min(1,w(20)+w(12)*.65+highBack*.75);
 c.tongueLateral=w(14)*.8;
 const sibilant=w(15)+(apical?w(6):0),retroClosure=retroflex&&!vowelBefore?w(19):0;
 c.tongueRetroflex=retroflex?Math.min(1,sibilant*.9+retroClosure):0;
 c.tongueGroove=(retroflex?.25:frontSibilant?.8:0)*sibilant;
 if(frontSibilant)c.tongueTipUp=Math.min(1,c.tongueTipUp+sibilant*.4);
 // A wide-open demonstration displaced the entire tongue away from the palate.
 // Keep phoneme-appropriate jaw clearance; the cutaway supplies visibility.
 result.jawLimit=Math.max(.06,1-alveolar*.9-w(20)*.85-(highFront+highBack)*.82-(retroflex||frontSibilant?sibilant*(retroflex?.88:.94):0)-retroClosure*.9);
 // Shared vowels are only given a neutral transit pose; no contact claim.
 const known=w(0)+w(1)+w(2)+w(4)+w(6)+w(7)+w(8)+w(12)+w(14)+w(16)+w(18)+w(19)+w(20)+w(21)+(retroflex||frontSibilant?w(15):0);
 result.supported=known>.5;
 result.description=result.supported?'舌位为动作方向示意，接触面尚未专业标定':'这个音的舌位细节还在制作中';
 if(c.tongueRetroflex>.1)result.description='舌尖后缩并上翘：位置示意，尚未完成专业标定';
 else if(frontSibilant&&sibilant>.1)result.description='舌尖靠近齿背，舌面形成窄通道：位置示意';
 return result;
}

// Smooth the discontinuity at observed syllable boundaries in audio time.
// This is a short animation transition, not measured Mandarin coarticulation.
// Stateless sampling preserves identical poses when paused, resumed or sought.
export function sampleArticulation(syllables,events,time){
 const current=articulationAt(syllables,events,time);
 const boundaries=[...new Set(syllables.flatMap(s=>[s.time,s.end]))].sort((a,b)=>a-b);
 for(let i=0;i<boundaries.length;i++){
  const boundary=boundaries[i],radius=Math.min(.04,(boundary-(boundaries[i-1]??-Infinity))/2,((boundaries[i+1]??Infinity)-boundary)/2);
  if(radius<=0||Math.abs(time-boundary)>=radius)continue;
  const before=articulationAt(syllables,events,boundary-radius),after=articulationAt(syllables,events,boundary+radius);
  const fraction=(time-boundary+radius)/(2*radius),blend=fraction*fraction*(3-2*fraction),controls={};
  for(const key of new Set([...Object.keys(before.controls),...Object.keys(after.controls)]))controls[key]=(before.controls[key]||0)*(1-blend)+(after.controls[key]||0)*blend;
  return {...current,controls,jawLimit:before.jawLimit*(1-blend)+after.jawLimit*blend};
 }
 return current;
}
