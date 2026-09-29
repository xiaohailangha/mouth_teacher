const {chromium}=require('C:/Users/dyw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
(async()=>{const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});const p=await b.newPage();
try{await p.goto('http://127.0.0.1:8787/');await p.waitForFunction(()=>window.teacher?.ready,null,{timeout:60000});await p.locator('#oral-toggle').click();await p.evaluate(()=>teacher.setControls({jawOpen:0}));await p.waitForTimeout(100);
const profiles=await p.evaluate(()=>teacher.diagnostics.oralReferences);fs.writeFileSync('D:/AI语言训练/mouth_teacher/work/v3/oral-reference.json',JSON.stringify(profiles));console.log(JSON.stringify(profiles.map(({sagittal,...rest})=>({...rest,sagittalPoints:sagittal.length}))));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
