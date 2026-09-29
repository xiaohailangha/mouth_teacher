import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CHANNELS} from '../runtime/public/timeline.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../work/v2/speech');
await fs.mkdir(root,{recursive:true});
const cases={closed:'爸爸抱宝宝，妈妈买面包。',round:'乌龟喝水，小鱼游泳，圆圆的月亮。',vowels:'啊，哦，鹅，衣，乌，鱼。',mixed:'小虎子，今天我们一起练习说话。慢慢张开嘴巴，再轻轻合上嘴唇。'};
const report=[];
for(const [name,text] of Object.entries(cases)){
 const response=await fetch('http://127.0.0.1:8787/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
 const packet=await response.json();if(!response.ok)throw Error(packet.error);
 await fs.writeFile(path.join(root,name+'.json'),JSON.stringify({...packet,text}));
 await fs.writeFile(path.join(root,name+'.wav'),Buffer.from(packet.audioBase64,'base64'));
 const ranges=Object.fromEntries(CHANNELS.map((n,i)=>[n,[Math.min(...packet.frames.map(f=>f.values[i])),Math.max(...packet.frames.map(f=>f.values[i]))]]).filter(([,v])=>v[1]>.01));
 report.push({name,text,frames:packet.frames.length,visemes:packet.visemes,seconds:packet.frames.at(-1).time,ranges});
 console.log(name,packet.frames.length,'frames',packet.visemes.length,'visemes');
}
await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));
