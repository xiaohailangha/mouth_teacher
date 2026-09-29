const {chromium}=require('C:/Users/dyw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert/strict'),fs=require('fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});
 try{
 const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
 const pages=await Promise.all(contexts.map(c=>c.newPage()));
 await Promise.all(pages.map(async p=>{await p.goto('http://127.0.0.1:8787/');await p.waitForFunction(()=>window.teacher?.ready,null,{timeout:60000});}));
 await pages[0].locator('#speed').selectOption('0.7');await pages[1].locator('#speed').selectOption('1');
 await pages[0].locator('#text').fill('风吹过绿色的小树，宝宝慢慢说，爸爸轻轻笑。');
 await pages[1].locator('#text').fill('小鱼在水里游来游去，乌龟背着小房子，慢慢走向美丽的花园。');
 const packets=[];for(const [i,p] of pages.entries())p.on('response',async r=>{if(r.url().endsWith('/api/speech')&&r.ok()){const d=await r.json();packets[i]=d;if(i===0)fs.writeFileSync('D:/AI语言训练/mouth_teacher/work/v2/speech/fv.json',JSON.stringify(d));}});
 await Promise.all(pages.map(p=>p.locator('#speak').click()));
 await Promise.all(pages.map(p=>p.waitForFunction(()=>teacher.state==='playing',null,{timeout:60000})));
 await pages[1].waitForTimeout(300);const before=await pages[1].evaluate(()=>teacher.audioTime);
 await pages[0].locator('#stop').click();await pages[1].waitForTimeout(600);
 const after=await pages[1].evaluate(()=>({time:teacher.audioTime,state:teacher.state}));assert.equal(after.state,'playing');assert(after.time>before);assert.equal(await pages[0].evaluate(()=>teacher.state),'idle');
 assert(packets.every(p=>p.source==='azure'&&p.visemes.length>0));
 const report={twoIndependentClients:true,stopDoesNotInterruptOther:true,otherClientBefore:before,otherClientAfter:after.time,independentSpeeds:await Promise.all(pages.map(p=>p.locator('#speed').inputValue())),frames:packets.map(p=>p.frames.length),visemes:packets.map(p=>p.visemes.length),note:'Two isolated Windows Chrome contexts; not physical iPads'};
 await pages[1].locator('#stop').click();fs.writeFileSync('D:/AI语言训练/mouth_teacher/work/v2/two-client-acceptance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
