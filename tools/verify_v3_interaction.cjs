const {chromium}=require('C:/Users/dyw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});
const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[],report={};p.on('pageerror',e=>errors.push(e.message));
try{
await p.goto('http://127.0.0.1:8787/');await p.waitForFunction(()=>window.teacher?.ready,null,{timeout:60000});
await p.locator('#greet').click();await p.waitForTimeout(1400);assert(await p.evaluate(()=>teacher.controls.gestureWave>.8));report.wave=true;
await p.locator('#expression').selectOption('happy');await p.waitForTimeout(100);assert(await p.evaluate(()=>teacher.controls.eyeSquintLeft>.1&&teacher.controls.mouthSmileLeft>.4));report.happy=true;
await p.locator('#oral-toggle').click();await p.locator('[data-tongue=tip]').click();await p.waitForTimeout(1100);await p.locator('#oral-hold').click();await p.waitForTimeout(100);const held=await p.evaluate(()=>teacher.controls.tongueTipUp);await p.waitForTimeout(350);assert.equal(await p.evaluate(()=>teacher.controls.tongueTipUp),held);report.hold=true;
await p.locator('#stop').click();await p.waitForTimeout(100);assert.equal(await p.evaluate(()=>teacher.controls.tongueTipUp||0),0);report.stopDemo=true;
report.lessons=[];
for(const [name,channel] of [['tip','tongueTipUp'],['mid','tongueMidUp'],['root','tongueRootUp']]){
 await p.locator(`[data-tongue=${name}]`).click();const response=p.waitForResponse(r=>r.url().endsWith('/api/speech')&&r.request().method()==='POST');await p.locator('#oral-read').click();const packet=await (await response).json();assert.equal(packet.voice,'zh-CN-YunxiNeural');assert(packet.frames.length>0);fs.mkdirSync('D:/AI语言训练/mouth_teacher/work/v3/lessons',{recursive:true});fs.writeFileSync('D:/AI语言训练/mouth_teacher/work/v3/lessons/'+name+'.json',JSON.stringify(packet));
 await p.waitForFunction(()=>teacher.state==='playing',null,{timeout:60000});let max=0;
 for(let i=0;i<120;i++){await p.waitForTimeout(25);const s=await p.evaluate(c=>({state:teacher.state,weight:teacher.controls[c]||0}),channel);max=Math.max(max,s.weight);if(s.state==='idle')break;}
 assert(max>.3,`${name}: no synchronized tongue movement`);report.lessons.push({name,voice:packet.voice,frames:packet.frames.length,maxWeight:max});if(await p.locator('#stop').isEnabled())await p.locator('#stop').click();
}
await p.locator('#oral-toggle').click();await p.locator('#expression').selectOption('warm');await p.locator('#oral-labels').waitFor({state:'hidden'});
assert.deepEqual(errors,[]);report.errors=errors;report.status=await (await p.request.get('http://127.0.0.1:8787/api/status')).json();fs.writeFileSync('D:/AI语言训练/mouth_teacher/work/v3/interaction-acceptance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
