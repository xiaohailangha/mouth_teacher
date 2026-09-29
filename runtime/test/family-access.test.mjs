import test from 'node:test';
import assert from 'node:assert/strict';
import {createFamilyAccess} from '../family-access.mjs';
const request=cookie=>({headers:{cookie}});
test('LAN synthesis requires a valid session; two clients remain independent',()=>{
 const family=createFamilyAccess({enabled:true});assert.equal(family.authorized(request()),false);
 assert.equal(family.pair('wrong','device1').status,401);
 const a=family.pair(family.code,'device1'),b=family.pair(family.code,'device2');
 assert.equal(a.status,200);assert.notEqual(a.cookie,b.cookie);
 assert(family.authorized(request(a.cookie)));assert(family.authorized(request(b.cookie)));
 assert(!family.authorized(request('teacher_session=forged')));
 assert(a.cookie.includes('HttpOnly; SameSite=Strict; Path=/api'));
});
test('family code attempts are limited and sessions expire or reset on restart',()=>{
 let time=0;const family=createFamilyAccess({enabled:true,now:()=>time});
 for(let i=0;i<5;i++)assert.equal(family.pair('wrong','device').status,401);
 assert.equal(family.pair(family.code,'device').status,429);
 time=60001;const session=family.pair(family.code,'device');assert.equal(session.status,200);
 assert(!createFamilyAccess({enabled:true}).authorized(request(session.cookie)));
 time+=12*60*60*1000;assert(!family.authorized(request(session.cookie)));
});
test('default loopback mode does not require pairing',()=>{
 assert(createFamilyAccess().authorized(request()));
});
