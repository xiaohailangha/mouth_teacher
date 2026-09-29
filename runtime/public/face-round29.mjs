import {faceV5Weights} from './face-v5.mjs';
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
// Blender round29 mouthClose is coordinated closure, NOT Azure mouthClose.
export function faceRound29Weights(input,{a2f=false}={}){
 const close=clamp(input.mouthClose);
 // A2F already solves jaw and lip closure together. Its mouthClose must not
 // suppress the solved jaw a second time on the R31 character.
 const closureStrength=a2f?.35:1;
 const v=faceV5Weights({...input,mouthClose:close,jawOpen:clamp(input.jawOpen)*(1-closureStrength*close)});
 const j=v.jawOpen,a=clamp(v.tongueExtend);
 for(const p of [.25,.5,.75])v['jawArcCorrection'+Math.round(p*100)]=Math.max(0,1-Math.abs(j-p)/.25);
 v.jawLipExposure=j*(1-Math.max(clamp(v.mouthLowerDownLeft),clamp(v.mouthLowerDownRight)))*(1-close);
 v.tongueExtendClearance=4*a*(1-a)*Math.min(1,.6+2*j/3);
 v.tongueRestClearance=4*j*(1-j)*(1-a);
 v.tongueBodySettle=j*(1-a)*(1-Math.max(clamp(v.tongueMiddleRaise),clamp(v.tongueRootRaise)));
 return v;
}
