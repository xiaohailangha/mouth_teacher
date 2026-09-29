import {randomBytes,randomInt,timingSafeEqual} from 'node:crypto';

// A launch-scoped family code protects paid synthesis on an explicitly enabled LAN.
// Azure credentials never leave the Windows process. This is for a trusted home LAN.
export function createFamilyAccess({enabled=false,now=Date.now}={}) {
 const code=String(randomInt(10000000,100000000)),sessions=new Map(),attempts=new Map();
 const ttl=12*60*60*1000;
 const prune=()=>{const t=now();for(const [k,v] of sessions)if(v<=t)sessions.delete(k);for(const [k,v] of attempts)if(v.until<=t)attempts.delete(k);};
 return {
  enabled,code,
  authorized(req){
   if(!enabled)return true;prune();
   const token=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('teacher_session='))?.slice(16);
   return Boolean(token&&sessions.get(token)>now());
  },
  pair(value,address){
   prune();const prior=attempts.get(address);
   if(prior?.count>=5)return {status:429,error:'尝试次数较多，请一分钟后再试。'};
   if(attempts.size>=256&&!prior)return {status:429,error:'请稍后再试。'};
   attempts.set(address,{count:(prior?.count||0)+1,until:prior?.until||now()+60000});
   const incoming=Buffer.from(String(value||'')),expected=Buffer.from(code);
   if(incoming.length!==expected.length||!timingSafeEqual(incoming,expected))return {status:401,error:'家庭连接码不正确，请查看 Windows 启动窗口。'};
   if(sessions.size>=16)return {status:429,error:'连接设备较多，请重启家庭服务后重新连接。'};
   attempts.delete(address);const token=randomBytes(32).toString('hex');sessions.set(token,now()+ttl);
   return {status:200,cookie:`teacher_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${ttl/1000}`};
  }
 };
}
