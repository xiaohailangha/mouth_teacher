const profiles={gentle:{rate:'-15%',pause:260},extraSlow:{rate:'-25%',pause:400},easy:{rate:'-8%',pause:140},normal:{rate:'0%',pause:0}};
export function resolveSpeechPace(value='gentle'){
 if(typeof value!=='string'||!Object.hasOwn(profiles,value))throw Object.assign(Error('请选择列表中的朗读节奏'),{status:400});
 return {id:value,...profiles[value]};
}
export function paceContent(content,pace){return '<prosody rate="'+pace.rate+'">'+content+'</prosody>';}
// Pause at written phrase boundaries; keep words and syllables connected.
// Escape each text fragment before adding controlled markup, never rewrite XML.
export function naturalContent(text,escape,pace){
 const pieces=text.split(/([，、；：。！？,;:!?])/u);
 return pieces.map((part,i)=>escape(part)+(pace.pause&&i%2===1&&pieces.slice(i+1).join('').trim()?'<break time="'+pace.pause+'ms"/>':'')).join('');
}
