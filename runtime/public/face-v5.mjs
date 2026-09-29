const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
export const tongueActions=['tongueTipRaisePreview','tongueTipLowerPreview','tongueExtend','tongueRetract','tongueLeft','tongueRight','tongueMiddleRaise','tongueRootRaise','tongueTipCurl'];
export function faceV5Weights(input){
 const v={...input};v.jawOpen=clamp(v.jawOpen);
 // Existing articulation channels are only approximate animation inputs.
 for(const [old,name] of Object.entries({tongueTipUp:'tongueTipRaisePreview',tongueMidUp:'tongueMiddleRaise',tongueRootUp:'tongueRootRaise',tongueOut:'tongueExtend',tongueForward:'tongueExtend',tongueRetroflex:'tongueTipCurl'}))v[name]=Math.max(clamp(v[name]),clamp(input[old]));
 for(const j of [.25,.5,.75,1]){
  const hat=Math.max(0,1-Math.abs(v.jawOpen-j)/.25);
  if(j<1)v['tongueJawCorrection'+Math.round(j*100)]=hat;
  for(const name of tongueActions)v[name+'_jaw'+Math.round(j*100)]=clamp(v[name])*hat;
 }
 return v;
}
