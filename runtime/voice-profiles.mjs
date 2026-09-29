// Candidates that have returned audio and facial frames in this resource.
// Role names do not establish a perceived age; the family should compare audio.
const profiles=Object.freeze({
 'yunxi-boy':{voice:'zh-CN-YunxiNeural',role:'Boy',style:'cheerful'},
 'yunxi-chat':{voice:'zh-CN-YunxiNeural',role:'Boy',style:'chat'},
 'yunxi-neutral':{voice:'zh-CN-YunxiNeural',role:null,style:null},
 'yunxia':{voice:'zh-CN-YunxiaNeural',role:null,style:null},
 'yanye-boy':{voice:'zh-CN-YunyeNeural',role:'Boy',style:'cheerful'},
});
export function resolveVoiceProfile(id,configured){
 if(id===undefined||id==='default')return configured;
 if(typeof id!=='string'||!Object.hasOwn(profiles,id))throw Object.assign(Error('请选择列表中的声音'),{status:400});
 return {...configured,...profiles[id]};
}
