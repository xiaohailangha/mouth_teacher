const {chromium}=require('C:/Users/dyw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});
 const page=await browser.newPage(),out='D:/AI语言训练/mouth_teacher/work/v2/screens',report=[];
 try{
 for(const [name,width,height] of [['desktop',1440,960],['ipad-landscape',1024,768],['ipad-portrait',768,1024]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:8787/');await page.waitForFunction(()=>window.teacher?.ready,null,{timeout:60000});
  await page.waitForTimeout(100);const geometry=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,stopBottom:document.querySelector('#stop').getBoundingClientRect().bottom,height:innerHeight}));
  assert(!geometry.overflow);assert(geometry.stopBottom<=geometry.height,`${name}: stop below fold`);report.push({name,...geometry});
  await page.screenshot({path:out+'/'+name+'.png',fullPage:true});
 }
 await page.setViewportSize({width:1440,height:960});await page.goto('http://127.0.0.1:8844/');
 await page.waitForFunction(()=>document.querySelector('iframe'),null,{timeout:60000});
 const teacher=page.frames().find(f=>f.url().startsWith('http://127.0.0.1:8787'));
 assert(teacher,'Flutter must embed live runtime');await teacher.waitForFunction(()=>window.teacher?.ready,null,{timeout:60000});
 await page.screenshot({path:out+'/flutter-web.png',fullPage:true});report.push({name:'flutter-web',liveCharacter:true});
 fs.writeFileSync('D:/AI语言训练/mouth_teacher/work/v2/layout-acceptance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
