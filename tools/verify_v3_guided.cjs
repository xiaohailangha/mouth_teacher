const {chromium}=require('C:/Users/dyw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
const out='D:/AI语言训练/mouth_teacher/work/v3';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],report={};let requests=0;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().endsWith('/api/speech'))requests++;});
 page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|GL_INVALID|shader/i.test(m.text()))errors.push(m.text());});
 const snapshot=()=>page.evaluate(()=>({time:teacher.audioTime,state:teacher.state,jaw:teacher.controls.jawOpen,tip:teacher.controls.tongueTipUp||0,mid:teacher.controls.tongueMidUp||0,root:teacher.controls.tongueRootUp||0}));
 try{
  await page.goto('http://127.0.0.1:8787/');await page.waitForFunction(()=>window.teacher?.ready,null,{timeout:60000});
  const text='哥哥带小鱼看奶奶，衣服绿绿的。';await page.locator('#text').fill(text);
  const response=page.waitForResponse(r=>r.url().endsWith('/api/speech')&&r.request().method()==='POST');await page.locator('#observe').click();
  const packet=await (await response).json();assert(!packet.error,packet.error);assert.equal(packet.syllables.length,[...text].filter(c=>/\p{Script=Han}/u.test(c)).length);
  assert(packet.syllables.every(s=>s.timingSource==='azure-word-boundary'));assert.equal(packet.role,'Boy');
  fs.writeFileSync(out+'/guided-packet.json',JSON.stringify(packet));fs.writeFileSync(out+'/guided-speech.wav',Buffer.from(packet.audioBase64,'base64'));
  report.synthesis={text,voice:packet.voice,role:packet.role,syllables:packet.syllables,frames:packet.frames.length};
  await page.waitForFunction(()=>teacher.state==='playing'&&teacher.controls.tongueRootUp>.3,null,{timeout:60000});
  await page.locator('#oral-hold').click();await page.waitForTimeout(100);const paused=await snapshot();await page.waitForTimeout(350);assert.deepEqual(await snapshot(),paused);assert.equal(paused.state,'paused');
  if((await page.locator('#oral-side').textContent()).includes('侧面'))await page.locator('#oral-side').click();await page.waitForTimeout(150);await page.screenshot({path:out+'/screens/guided-paused.png'});
  const count=requests;await page.locator('#oral-toggle').click();await page.waitForTimeout(100);assert.deepEqual(await snapshot(),paused);await page.locator('#oral-toggle').click();await page.waitForTimeout(100);assert.deepEqual(await snapshot(),paused);assert.equal(requests,count);report.pauseAndViewSwitch=paused;
  await page.locator('#oral-hold').click();await page.waitForTimeout(300);assert((await snapshot()).time>paused.time);report.resume=true;
  await page.locator('#stop').click();await page.waitForTimeout(100);const stopped=await snapshot();assert.equal(stopped.time,0);assert.equal(stopped.state,'idle');assert.equal(stopped.root,0);assert.equal(stopped.jaw,0);report.stop=stopped;
  await page.locator('#oral-toggle').click();await page.locator('#text').fill('今天小虎子和你一起看彩虹。');await page.locator('#speak').click();await page.waitForFunction(()=>teacher.state==='playing',null,{timeout:60000});const before=await snapshot();await page.locator('#oral-toggle').click();await page.waitForTimeout(300);const after=await snapshot();assert.equal(after.state,'playing');assert(after.time>before.time);report.naturalViewSwitch=true;await page.locator('#stop').click();
  report.layouts=[];
  for(const [name,width,height] of [['desktop',1440,960],['ipad-landscape',1024,768],['ipad-portrait',768,1024]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(120);
   for(const mode of ['oral','normal']){
    if(mode==='normal')await page.locator('#oral-toggle').click();
    const box=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,stopBottom:document.querySelector('#stop').getBoundingClientRect().bottom,height:innerHeight}));
    assert(!box.overflow);assert(box.stopBottom<=box.height,`${name}/${mode} stop below fold: ${JSON.stringify(box)}`);report.layouts.push({name,mode,...box});
    await page.screenshot({path:out+'/screens/'+name+'-'+mode+'.png',fullPage:true});
   }
   await page.locator('#oral-toggle').click();
  }
  assert.deepEqual(errors,[]);report.errors=errors;report.passed=true;
 }finally{fs.writeFileSync(out+'/guided-acceptance.json',JSON.stringify(report,null,2));await browser.close();}
 console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1;});
