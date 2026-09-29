// Limited animation directions for R31, not measured Mandarin contact targets.
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function sampleBasicTongue(syllables,events,time){
 const controls={tongueTipUp:0,tongueMidUp:0,tongueRootUp:0,tongueOut:0};
 let unit=null,supported=false;
 for(const s of syllables){
  if(time>=s.time-.08&&time<s.end+.04)unit=s;
  const spec=s.pinyin==='la'?[14,'tongueTipUp',.85]:s.pinyin==='da'?[19,'tongueTipUp',.85]:s.pinyin==='ga'?[20,'tongueRootUp',.85]:s.pinyin==='yi'?[6,'tongueMidUp',.75]:null;
  if(!spec)continue;
  if(unit===s)supported=true;
  // Azure consonant events may precede the corresponding word boundary.
  const candidates=events.filter(e=>e.time>=s.time-.06&&e.time<s.end&&e.id===spec[0]);
  if(!candidates.length)continue;
  const start=candidates[0].time;
  const next=events.find(e=>e.time>start&&e.id!==spec[0]);
  const end=Math.min(s.end,next?.time??s.end);
  // Authored anticipation/release makes brief consonants inspectable at slow speed.
  // This is animation smoothing, not a phoneme-duration/contact measurement.
  const weight=smooth((time-(start-.07))/.07)*(1-smooth((time-end)/.06))*spec[2];
  controls[spec[1]]=Math.max(controls[spec[1]],weight);
 }
 const tip=controls.tongueTipUp,mid=controls.tongueMidUp,root=controls.tongueRootUp;
 return {controls,syllable:unit,supported, jawLimit:1-Math.max(tip/.85*.9,root/.85*.85,mid/.75*.82),description:supported?'基础动作方向示意；提前抬起与释放为动画过渡，接触面未专业标定':'此音暂未接入 R31 独立舌动作'};
}
