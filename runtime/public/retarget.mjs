import {controlsFromFrame} from './timeline.mjs';
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};

// FacialExpression chunk callbacks also contain dummy viseme 0 events at time 0.
// Keep a sorted, unique timeline before sampling real phoneme transitions.
export function normalizeVisemes(events=[]){
 const byTime=new Map();
 for(const e of events)if(Number.isFinite(e.time)&&e.time>=0&&Number.isInteger(e.id)&&e.id>=0&&e.id<=21){
  if(!byTime.has(e.time)||e.id!==0)byTime.set(e.time,{time:e.time,id:e.id});
 }
 return [...byTime.values()].sort((a,b)=>a.time-b.time);
}
export function visemeWeights(events,time){
 if(!events.length)return null;
 let lo=0,hi=events.length-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(events[mid].time<=time)lo=mid;else hi=mid-1;}
 const current=events[lo];
 if(time<current.time-.018)return new Map([[0,1]]);
 const previous=events[Math.max(0,lo-1)],next=events[lo+1];
 let a=previous.id,b=current.id,t=smooth((time-current.time+.018)/.036);
 if(next&&time>=next.time-.018){a=current.id;b=next.id;t=smooth((time-next.time+.018)/.036);}
 const weights=new Map();weights.set(a,1-t);weights.set(b,(weights.get(b)||0)+t);return weights;
}

// Character-specific calibration. Azure values describe a generic human face;
// the original tiger rig has different rest values and deformation ranges.
// Jaw bones have one owner. Visemes supply lip-contact/silence corrections only.
export function retargetControls(row,events,time){
 const r=controlsFromFrame(row),v={...r};
 const weights=visemeWeights(events,time);
 const weight=id=>weights?.get(id)||0;
 const silence=weight(0),seal=weight(21),u=weight(7),o=weight(8),wide=weight(6),fv=weight(18);
 const contact=clamp(silence+seal),speech=1-silence;
 v.jawOpen=clamp((r.jawOpen-.1-r.mouthClose*.3)*1.55)*(1-contact);
 v.jawOpen=v.jawOpen*(1-u*.25)*(1-fv)+.26*fv;
 v.jawLipRetain=u*.55;
 v.mouthFv=fv;
 v.mouthClose=0;
 v.mouthPucker=clamp(Math.max((r.mouthPucker-.045)*1.6,u*.84,o*.42))*(1-contact);
 v.mouthFunnel=clamp(Math.max((r.mouthFunnel-.06)*1.4,o*.5))*(1-contact)*(1-v.mouthPucker);
 const round=clamp(v.mouthPucker+v.mouthFunnel*.65);
 for(const side of ['Left','Right']){
  v['mouthSmile'+side]=clamp((r['mouthSmile'+side]-.03)*1.2+wide*.14)*(1-round*.8)*(1-contact);
  v['mouthStretch'+side]=clamp((r['mouthStretch'+side]-.09)*1.2+wide*.2)*(1-round)*(1-contact);
  v['mouthLowerDown'+side]=clamp((r['mouthLowerDown'+side]-.18)*.65)*(1-contact)*(1-round*.7);
  v['mouthUpperUp'+side]=clamp((r['mouthUpperUp'+side]-.02)*.7)*(1-contact)*(1-fv);
  v['mouthPress'+side]=seal*.2;
  v['mouthFrown'+side]=r['mouthFrown'+side]*.15*speech;
  v['mouthDimple'+side]=r['mouthDimple'+side]*.2*speech;
  // Do not import Azure's generic resting squint/blink onto this large-eyed child.
  v['eyeBlink'+side]=0;v['eyeSquint'+side]=r['eyeSquint'+side]*.12;v['eyeWide'+side]=r['eyeWide'+side]*.25;
  v['browDown'+side]=r['browDown'+side]*.35;
  v['browOuterUp'+side]=r['browOuterUp'+side]*.4;
 }
 for(const name of ['mouthRollLower','mouthRollUpper','mouthShrugLower','mouthShrugUpper','mouthLeft','mouthRight'])v[name]=Math.max(0,r[name]-.07)*.35*(1-contact);
 v.browInnerUp=r.browInnerUp*.25;
 v.tongueOut=0; // No claim of phoneme-accurate tongue teaching from generic facial data.
 v.lipContact=seal;v.silence=silence;
 return v;
}
