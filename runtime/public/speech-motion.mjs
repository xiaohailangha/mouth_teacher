// Speech beats come from observed word boundaries. Short pauses between every
// teaching syllable must not cause an arm movement for every character.
export function speechMotion(words,time){
 let lastBeat=-Infinity,beat=-Infinity;
 for(let i=0;i<words.length;i++){
  const word=words[i],previous=words[i-1];
  if(word.time>time)break;
  const phraseStart=!previous||word.time-(previous.time+previous.duration)>.24||/[。！？!?；;]$/.test(previous.text);
  if(phraseStart&&word.time-lastBeat>=2.8){lastBeat=word.time;beat=word.time;}
 }
 const elapsed=time-beat;
 if(elapsed<0||elapsed>1.6)return {gesturePresent:0,headSpeechNod:0};
 const envelope=Math.sin(Math.PI*elapsed/1.6)**2;
 return {gesturePresent:.32*envelope,headSpeechNod:.022*Math.sin(2*Math.PI*elapsed/1.6)*envelope};
}
