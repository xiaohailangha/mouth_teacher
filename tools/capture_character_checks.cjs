const {chromium}=require('C:/Users/dyw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
const out='D:/AI语言训练/mouth_teacher/work/v2/screens';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});
 const page=await browser.newPage({viewport:{width:1280,height:960},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8787/?asset=2');await page.waitForFunction(()=>window.teacher?.ready,{timeout:60000});
 await page.locator('#camera').click();
 await page.evaluate(()=>window.teacher.setControls({eyeBlinkLeft:0,eyeBlinkRight:0}));
 await page.locator('#scene').screenshot({path:out+'/full.png'});
 await page.locator('#camera').click();
 for(const [name,controls] of Object.entries({neutral:{},aa:{jawOpen:1},pucker:{jawOpen:.35,jawLipRetain:.55,mouthPucker:1},funnel:{jawOpen:.4,mouthFunnel:1},retained:{jawOpen:1,jawLipRetain:1},blink_half:{eyeBlinkLeft:.5,eyeBlinkRight:.5},blink:{eyeBlinkLeft:1,eyeBlinkRight:1},smile:{mouthSmileLeft:1,mouthSmileRight:1},fv_a:{jawOpen:.35,mouthFv:.6,mouthUpperUpLeft:.4,mouthUpperUpRight:.4},fv_b:{jawOpen:.5,mouthFv:1,mouthUpperUpLeft:.6,mouthUpperUpRight:.6}})){
  await page.evaluate(v=>window.teacher.setControls({eyeBlinkLeft:0,eyeBlinkRight:0,...v}),controls);
  await page.waitForTimeout(150);await page.locator('#scene').screenshot({path:out+'/'+name+'.png'});
 }
 await page.evaluate(()=>window.teacher.setControls({jawOpen:.26,mouthFv:1,eyeBlinkLeft:0,eyeBlinkRight:0}));await page.waitForTimeout(120);await page.locator('#scene').screenshot({path:out+'/fv_calibrated.png'});
 const {pathToFileURL}=require('url');
 const {retargetControls,normalizeVisemes}=await import(pathToFileURL('D:/AI语言训练/mouth_teacher/runtime/public/retarget.mjs'));
 const {sampleFrames}=await import(pathToFileURL('D:/AI语言训练/mouth_teacher/runtime/public/timeline.mjs'));
 for(const [name,file,id] of [['real_closed','closed',21],['real_aa','vowels',2],['real_i','vowels',6],['real_u','vowels',7],['real_o','vowels',8],['real_fv','fv',18]]){
  const packet=JSON.parse(fs.readFileSync('D:/AI语言训练/mouth_teacher/work/v2/speech/'+file+'.json','utf8'));
  const events=normalizeVisemes(packet.visemes);const idx=events.findIndex(e=>e.id===id);if(idx<0)continue;
  const time=(events[idx].time+events[idx+1].time)*.5;
  const controls=retargetControls(sampleFrames(packet.frames,time),events,time);
  await page.evaluate(v=>window.teacher.setControls(v),controls);await page.waitForTimeout(120);
  await page.locator('#scene').screenshot({path:out+'/'+name+'.png'});
 }
 await page.locator('#mouth-camera').click();await page.waitForTimeout(120);await page.locator('#scene').screenshot({path:out+'/mouth-closeup.png'});
 console.log(JSON.stringify({errors,diagnostics:await page.evaluate(()=>window.teacher.diagnostics)}));
 await browser.close();
})();
