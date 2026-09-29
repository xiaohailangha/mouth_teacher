const {chromium}=require('C:/Users/dyw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const out=process.env.ROUND_CANDIDATE?'D:/AI语言训练/mouth_teacher/work/v4':'D:/AI语言训练/mouth_teacher/work/v3';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});
 const page=await browser.newPage({viewport:{width:1440,height:960}}),errors=[],checks={};
 page.on('pageerror',e=>errors.push(e.message));
 const sample=()=>page.evaluate(()=>({state:teacher.state,time:teacher.audioTime,jaw:teacher.controls.jawOpen||0,pucker:teacher.controls.mouthPucker||0}));
 try {
 if(process.env.ROUND_CANDIDATE)await page.route('**/character-v3/*',r=>r.continue({url:r.request().url().replace('/character-v3/','/character-round-candidate/')}));
 await page.goto('http://127.0.0.1:8787/');await page.waitForFunction(()=>window.teacher?.ready,{timeout:60000});
 await page.locator('#text').fill('今天小虎子邀请宝宝看月亮，爸爸抱宝宝，乌龟慢慢走，我们一起开心说话。');
 await page.locator('#speak').click();await page.waitForFunction(()=>teacher.state==='playing',null,{timeout:60000});
 const frames=[];for(let i=0;i<12;i++){await page.waitForTimeout(120);frames.push(await sample());}
 assert(frames.at(-1).time>frames[0].time);assert(Math.max(...frames.map(f=>f.jaw))>.1);checks.realSpeech=frames;
 await page.locator('#pause').click();await page.waitForTimeout(120);const paused=await sample();await page.waitForTimeout(350);const still=await sample();assert.equal(still.state,'paused');assert.equal(still.time,paused.time);assert.equal(still.jaw,paused.jaw);assert.equal(still.pucker,paused.pucker);checks.pause=still;
 await page.locator('#resume').click();await page.waitForTimeout(350);const resumed=await sample();assert(resumed.time>still.time);checks.resume=resumed;
 await page.locator('#stop').click();await page.waitForTimeout(120);const stopped=await sample();assert.equal(stopped.state,'idle');assert.equal(stopped.time,0);assert.equal(stopped.jaw,0);checks.stop=stopped;
 await page.locator('#speak').click();await page.locator('#stop').click();await page.waitForTimeout(2200);assert.equal((await sample()).state,'idle');checks.stopDuringSynthesis=true;
 // Hold an old successful response to reproduce a late response after cancellation.
 const packet=JSON.parse(fs.readFileSync('D:/AI语言训练/mouth_teacher/work/v2/speech/closed.json','utf8'));
 await page.route('**/api/speech',async route=>{await new Promise(r=>setTimeout(r,900));try{await route.fulfill({json:packet});}catch{}});
 await page.locator('#speak').click();await page.waitForTimeout(100);await page.locator('#stop').click();await page.waitForTimeout(1300);assert.equal((await sample()).state,'idle');checks.lateResponseIgnored=true;
 await page.unroute('**/api/speech');
 await page.locator('#speed').selectOption('1');await page.locator('#text').fill('乌龟。');await page.locator('#speak').click();await page.waitForFunction(()=>teacher.state==='playing',null,{timeout:60000});await page.waitForFunction(()=>teacher.state==='idle',null,{timeout:20000});await page.waitForTimeout(80);assert.equal((await sample()).jaw,0);checks.naturalEnd=true;
 for(const [name,width,height] of [['desktop',1440,960],['ipad-landscape',1024,768],['ipad-portrait',768,1024]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(200);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:out+'/screens/'+name+'.png',fullPage:true});
 }
 await page.evaluate(()=>teacher.setControls({jawOpen:.15,mouthFv:1,eyeBlinkLeft:0,eyeBlinkRight:0}));await page.waitForTimeout(120);await page.locator('#scene').screenshot({path:out+'/screens/fv.png'});
 checks.frameTiming=await page.evaluate(()=>new Promise(resolve=>{const times=[];let prev;function tick(t){if(prev)times.push(t-prev);prev=t;if(times.length<120)requestAnimationFrame(tick);else{times.sort((a,b)=>a-b);resolve({medianMs:times[60],p95Ms:times[114],platform:'Windows Chrome, headless D3D11, not iPad'});}}requestAnimationFrame(tick);}));
 assert.deepEqual(errors,[]);checks.javascriptErrors=errors;checks.status=await (await page.request.get('http://127.0.0.1:8787/api/status')).json();checks.passed=true;
 }finally{fs.writeFileSync(out+'/acceptance.json',JSON.stringify(checks,null,2));await browser.close();}
 console.log(JSON.stringify(checks));
})().catch(e=>{console.error(e);process.exitCode=1;});

