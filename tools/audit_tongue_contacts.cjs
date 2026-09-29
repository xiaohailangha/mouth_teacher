const {chromium}=require('C:/Users/dyw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});const p=await b.newPage({viewport:{width:1440,height:1000}}),report=[];
try{await p.goto('http://127.0.0.1:8787/');await p.waitForFunction(()=>window.teacher?.ready,null,{timeout:60000});await p.locator('#oral-toggle').click();
for(const jaw of [0,.3,.75])for(const pose of ['neutral','tongueTipUp','tongueMidUp','tongueRootUp']){
 await p.evaluate(({jaw,pose})=>teacher.setControls({jawOpen:jaw,...(pose==='neutral'?{}:{[pose]:1})}),{jaw,pose});await p.waitForTimeout(80);
 const points=await p.evaluate(()=>teacher.diagnostics.oral);report.push({jaw,pose,points});
}
fs.writeFileSync('D:/AI语言训练/mouth_teacher/work/v3/contact-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
