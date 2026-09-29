const {chromium}=require('C:/Users/dyw/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const {spawn}=require('child_process'),assert=require('assert/strict'),fs=require('fs'),path=require('path');
const projectDir=path.resolve(__dirname,'..');
(async()=>{
 const child=spawn(process.execPath,['server.mjs'],{cwd:path.join(projectDir,'runtime'),env:{...process.env,PORT:'8878',TEACHER_LAN:'1',TEACHER_BIND_HOST:'127.0.0.1',AZURE_SPEECH_KEY:''},windowsHide:true});
 let browser;try{
 const code=await new Promise((resolve,reject)=>{let output='';const timeout=setTimeout(()=>reject(Error('Pairing test server startup timeout')),10000);child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/Family connection code: (\d{8})/);if(match){clearTimeout(timeout);resolve(match[1]);}});child.on('error',reject);});
 const base='http://127.0.0.1:8878';assert.equal((await fetch(base+'/api/speech',{method:'POST'})).status,401);
 assert.equal((await fetch(base+'/api/status',{headers:{Origin:'https://untrusted.example'}})).status,403);
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--use-angle=d3d11']});
 const context=await browser.newContext(),page=await context.newPage();await page.goto(base);await page.locator('#pair-dialog').waitFor({state:'visible'});
 await page.locator('#pair-code').fill('00000000');await page.locator('#pair-form button').click();await page.getByText('家庭连接码不正确，请查看 Windows 启动窗口。').waitFor();
 await page.locator('#pair-code').fill(code);await page.locator('#pair-form button').click();await page.locator('#pair-dialog').waitFor({state:'hidden'});
 assert.equal((await (await page.request.get(base+'/api/status')).json()).pairingRequired,false);
 assert.equal((await page.request.post(base+'/api/speech',{data:{text:''}})).status(),400);
 await page.reload();await page.waitForFunction(()=>window.teacher?.ready);assert.equal(await page.locator('#pair-dialog').isVisible(),false);
 const second=await browser.newContext();assert.equal((await (await second.request.get(base+'/api/status')).json()).pairingRequired,true);
 const cookies=await context.cookies();assert(cookies.some(c=>c.name==='teacher_session'&&c.httpOnly&&c.sameSite==='Strict'));
 const report={unauthorizedSynthesisBlocked:true,foreignOriginBlocked:true,wrongCodeRejected:true,pairingUiSuccess:true,sessionRetainedOnReload:true,otherClientRequiresOwnSession:true,paidAzureCalls:0,scope:'Loopback test of LAN mode; Windows firewall and real iPad not tested'};
 const outputDir=path.join(projectDir,'work','v2');fs.mkdirSync(outputDir,{recursive:true});
 fs.writeFileSync(path.join(outputDir,'family-pairing-acceptance.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{if(browser)await browser.close();child.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
