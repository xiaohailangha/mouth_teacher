const {chromium}=require('C:/Users/dyw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
(async()=>{
const b=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});const page=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{await page.goto('http://127.0.0.1:8787/');await page.waitForFunction(()=>window.teacher?.ready,null,{timeout:60000});const out='D:/AI语言训练/mouth_teacher/work/v3/screens';fs.mkdirSync(out,{recursive:true});
await page.locator('#camera').click();await page.locator('#greet').click();await page.waitForTimeout(1350);await page.screenshot({path:out+'/greeting.png'});
await page.locator('#oral-toggle').click();await page.locator('#oral-hold').click();
for(const name of ['tip','mid','root']){await page.locator(`[data-tongue="${name}"]`).click();await page.waitForTimeout(1950);await page.locator('#oral-hold').click();await page.waitForTimeout(150);await page.screenshot({path:out+'/'+name+'.png'});}
if((await page.locator('#oral-side').textContent()).includes('侧面'))await page.locator('#oral-side').click();await page.waitForTimeout(150);await page.screenshot({path:out+'/side.png'});
console.log(JSON.stringify({errors,status:await (await page.request.get('http://127.0.0.1:8787/api/status')).json()}));
}finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
