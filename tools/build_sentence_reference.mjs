import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {CHANNELS} from '../runtime/public/timeline.mjs';
const folder=fileURLToPath(new URL('../runtime/public/reference/',import.meta.url));
const original=JSON.parse(fs.readFileSync(folder+'baba-azure.json','utf8').replace(/^\uFEFF/,''));
// Individually authored animation reference for this audio only. These timings
// are based on its speech events; not a measured articulatory/clinical target.
const poses={
 rest:{jawOpen:0,mouthClose:.55},
 seal:{jawOpen:0,mouthClose:.8,mouthPressLeft:.1,mouthPressRight:.1},
 a:{jawOpen:.70,mouthPucker:.36,mouthUpperUpLeft:.08,mouthUpperUpRight:.08},
 softA:{jawOpen:.44,mouthPucker:.32,mouthUpperUpLeft:.06,mouthUpperUpRight:.06},
 o:{jawOpen:.35,mouthPucker:.49,mouthFunnel:.08},
 i:{jawOpen:.19,mouthPucker:.12,mouthStretchLeft:.05,mouthStretchRight:.05},
 n:{jawOpen:.10,mouthPucker:.17},
};
const keys=[
 [0,'rest'],[.08,'seal'],[.135,'seal'],[.185,'a'],[.22,'softA'],
 [.255,'seal'],[.275,'seal'],[.315,'softA'],[.36,'seal'],[.386,'seal'],
 [.447,'a'],[.485,'o'],[.525,'seal'],[.542,'seal'],[.589,'softA'],
 [.643,'o'],[.687,'seal'],[.715,'seal'],[.78,'a'],[.89,'o'],
 [1.04,'o'],[1.17,'rest'],[1.40,'rest'],[1.45,'seal'],[1.51,'seal'],
 [1.57,'a'],[1.637,'seal'],[1.65,'seal'],[1.69,'softA'],
 [1.73,'seal'],[1.745,'seal'],[1.785,'a'],[1.815,'i'],
 [1.85,'seal'],[1.867,'seal'],[1.9,'i'],[1.95,'softA'],[1.995,'n'],
 [2.05,'seal'],[2.075,'seal'],[2.15,'a'],[2.23,'o'],[2.32,'o'],[2.40,'rest'],
];
const end=Math.max(original.frames.at(-1).time,2.5);
keys.push([end+.02,'rest']);
function sample(time){
 let index=0;while(index<keys.length-2&&keys[index+1][0]<=time)index++;
 const [ta,pa]=keys[index],[tb,pb]=keys[index+1];
 let t=Math.max(0,Math.min(1,(time-ta)/(tb-ta)));t=t*t*(3-2*t);
 return CHANNELS.map(name=>(poses[pa][name]||0)*(1-t)+(poses[pb][name]||0)*t);
}
const frames=Array.from({length:Math.ceil(end*60)+1},(_,i)=>({time:i/60,values:sample(i/60)}));
const packet={...original,source:'authored-reference',syllables:[],frames,
 reference:{text:'爸爸抱宝宝，妈妈买面包。',revision:2,kind:'hand-authored-animation-study',keys,poses,clinicalValidated:false}};
fs.writeFileSync(folder+'baba-reference.json',JSON.stringify(packet));
fs.writeFileSync(folder+'baba-azure.json',JSON.stringify(original));
console.log(JSON.stringify({frames:frames.length,keys:keys.length,audioIdentical:packet.audioBase64===original.audioBase64}));
