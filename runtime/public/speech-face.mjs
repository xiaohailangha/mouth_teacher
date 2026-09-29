import {controlsFromFrame} from './timeline.mjs';
import {retargetControls,visemeWeights} from './retarget.mjs';
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
export function speechFace(row,events,time,mode='clear',gain=1.5){
 const old=retargetControls(row,events,time);
 if(mode==='legacy')return old;
 const raw=controlsFromFrame(row);
 if(mode==='full'){
  // Azure's human-face channels can be compared without the character-specific
  // expression attenuation. R31 mouthClose and tongueOut have different meanings.
  raw.mouthClose=0;raw.tongueOut=0;return raw;
 }
 if(mode==='raw'){
  for(const [name,value] of Object.entries(raw))if(name.startsWith('mouth')||name.startsWith('jaw'))old[name]=value;
  // Raw amplitude comparison omits incompatible generic closure semantics.
  old.mouthClose=0;return old;
 }
 const weights=visemeWeights(events,time),weight=id=>weights?.get(id)||0;
 const contact=clamp(weight(0)+weight(21)),fv=weight(18),u=weight(7);
 const amount=Math.max(.8,Math.min(2,Number(gain)||1.5));
 old.jawOpen=(clamp((raw.jawOpen-.025)*amount)*(1-u*.15)*(1-fv)+.26*fv)*(1-contact);
 old.mouthClose=0;
 return old;
}
