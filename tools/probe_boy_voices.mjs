import {synthesize} from '../runtime/speech.mjs';
import fs from 'node:fs/promises';
const out=new URL('../work/v3/voices/',import.meta.url);await fs.mkdir(out,{recursive:true});
const report=[];
for(const [name,voice,role] of [['yunxi-boy','zh-CN-YunxiNeural','Boy'],['yunxia','zh-CN-YunxiaNeural',''],['yanye-boy','zh-CN-YunyeNeural','Boy']]){
 process.env.AZURE_SPEECH_VOICE=voice;process.env.AZURE_SPEECH_ROLE=role;process.env.AZURE_SPEECH_STYLE='cheerful';
 try{const p=await synthesize('你好呀，我是小虎子！我们一起慢慢说，爸爸抱宝宝，小鱼游来游去。');await fs.writeFile(new URL(name+'.wav',out),Buffer.from(p.audioBase64,'base64'));await fs.writeFile(new URL(name+'.json',out),JSON.stringify(p));report.push({name,voice,role,frames:p.frames.length,visemes:p.visemes.length,seconds:p.frames.at(-1).time,success:true});}
 catch(e){report.push({name,success:false,error:e.message});}
}
await fs.writeFile(new URL('report.json',out),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
