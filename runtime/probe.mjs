// Run only after local secure configuration. This checks the actual backend result.
const response=await fetch('http://127.0.0.1:8787/api/speech',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:process.argv.slice(2).join(' ')||'爸爸抱宝宝。小鱼游过弯弯的小河，我们一起慢慢说。'})});
const packet=await response.json();
if(!response.ok){console.error(packet.error);process.exitCode=1;}
else console.log(JSON.stringify({source:packet.source,voice:packet.voice,region:packet.region,frames:packet.frames.length,channels:packet.frames[0].values.length,firstFrameSeconds:packet.frames[0].time,lastFrameSeconds:packet.frames.at(-1).time,audioBytes:Buffer.from(packet.audioBase64,'base64').length,visemeEvents:packet.visemes.length},null,2));
