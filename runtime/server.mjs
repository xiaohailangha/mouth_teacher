import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {networkInterfaces} from 'node:os';
import {synthesize,speechConfigStatus} from './speech.mjs';
import {synthesizeA2f,a2fConfigStatus} from './a2f.mjs';
import {createFamilyAccess} from './family-access.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const publicDir=path.join(root,'public');
const port=Number(process.env.PORT || 8787);
const family=createFamilyAccess({enabled:process.env.TEACHER_LAN==='1'});
const host=family.enabled?(process.env.TEACHER_BIND_HOST||'0.0.0.0'):'127.0.0.1';
const addresses=Object.values(networkInterfaces()).flat().filter(a=>a.family==='IPv4'&&!a.internal).map(a=>a.address);
const own=new Set(['localhost','127.0.0.1',...(family.enabled?addresses:[])].map(h=>`http://${h}:${port}`));
// LAN mode is opt-in and requires a family session before paid synthesis.
const allowedOrigins=new Set((process.env.ALLOWED_ORIGINS || 'http://localhost:8844,http://127.0.0.1:8844').split(','));
let active=0;
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const server=http.createServer(async(req,res)=>{
 try {
  const origin=req.headers.origin;
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  if(!own.has(`http://${req.headers.host}`)){json(res,403,{error:'服务地址未允许'});return;}
  if(origin && !own.has(origin) && !allowedOrigins.has(origin)){json(res,403,{error:'来源未允许'});return;}
  if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
  res.setHeader('Vary','Origin');
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','GET,POST');res.writeHead(204);res.end();return;}
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/status'){const authorized=family.authorized(req);json(res,200,authorized?{...speechConfigStatus(),a2f:a2fConfigStatus(),familyMode:family.enabled,pairingRequired:false}:{application:'mouth-teacher',version:2,configured:false,familyMode:true,pairingRequired:true});return;}
  if(url.pathname==='/api/pair'&&req.method==='POST'&&family.enabled){
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>256){json(res,413,{error:'连接码格式错误'});return;}}
   let data;try{data=JSON.parse(raw);}catch{json(res,400,{error:'连接码格式错误'});return;}
   const result=family.pair(data.code,req.socket.remoteAddress);if(result.cookie)res.setHeader('Set-Cookie',result.cookie);
   json(res,result.status,result.error?{error:result.error}:{paired:true});return;
  }
  if(url.pathname==='/api/speech' && req.method==='POST'){
   if(!family.authorized(req)){json(res,401,{error:'请先输入家庭连接码。',pairingRequired:true});return;}
   if(active>=2){json(res,429,{error:'正在合成，请稍后重试'});return;}
   let raw=''; for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>12000){json(res,413,{error:'输入过长'});return;}}
   let body;try{body=JSON.parse(raw);}catch{json(res,400,{error:'请求格式错误'});return;}
   if(typeof body.text!=='string' || !body.text.trim() || body.text.length>1000){json(res,400,{error:'请输入 1–1000 字'});return;}
   if(body.provider && !['azure','a2f3d'].includes(body.provider)){json(res,400,{error:'语音服务无效'});return;}
   const abort=new AbortController();res.on('close',()=>{if(!res.writableEnded)abort.abort();});
   active++;try{const result=body.provider==='azure'?await synthesize(body.text.trim(),abort.signal,{articulation:body.articulation===true,voiceProfile:body.voiceProfile,readings:body.readings,pace:body.pace}):await synthesizeA2f(body.text.trim(),abort.signal,{pace:body.pace});if(!res.destroyed)json(res,200,result);}finally{active--;}
   return;
  }
  if(req.method!=='GET'){json(res,405,{error:'Method not allowed'});return;}
  const pathname=decodeURIComponent(url.pathname);
  const vendor=pathname.startsWith('/vendor/');
  const base=vendor?path.join(root,'node_modules/three'):publicDir;
  const relative=vendor?pathname.slice('/vendor/'.length):(pathname==='/'?'index.html':pathname.slice(1));
  const target=path.resolve(base,relative);
  if(!target.startsWith(base+path.sep)){json(res,403,{error:'Forbidden'});return;}
  const data=await readFile(target);
  const extension=path.extname(target);
  const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.wav':'audio/wav'}[extension] || 'application/octet-stream';
  const range=extension==='.wav'?/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||''):null;
  if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;
   if(start>=data.length||end<start){res.writeHead(416,{'Content-Range':`bytes */${data.length}`});res.end();return;}
   res.writeHead(206,{'Content-Type':mime,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'no-cache'});res.end(data.subarray(start,end+1));return;}
  res.writeHead(200,{'Content-Type':mime,'Content-Length':data.length,'Accept-Ranges':extension==='.wav'?'bytes':'none','Cache-Control':'no-cache'});res.end(data);
 }catch(error){if(!res.destroyed)json(res,error.code==='ENOENT'?404:error.status||500,{error:error.code==='ENOENT'?'Not found':error.message});}
});
server.listen(port,host,()=>{
 console.log(`Tiger teacher: http://127.0.0.1:${port} (Azure configured: ${speechConfigStatus().configured})`);
 if(family.enabled){console.log(`Family connection code: ${family.code}`);for(const address of addresses)console.log(`Home LAN: http://${address}:${port}/`);console.log('Trusted home Wi-Fi only. No router port forwarding. Keep this window open.');}
});

