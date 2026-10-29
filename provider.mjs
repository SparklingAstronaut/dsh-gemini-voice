import {WebSocket} from 'ws';
import {setupMessage,reduceTranscript,MODEL} from './protocol.mjs';
export const providerInfo={id:'gemini-cloud',name:'Gemini（逐字转写 + 个人词表）',location:'cloud',languages:['auto','zh','en','yue','ja','ko']};
// 录音解析：按 RIFF 块逐个找 fmt / data，不要求固定 44 字节文件头（官方录音器以后加 LIST 等块也能用）；
// 接受 8–48 kHz 单声道 16-bit PCM，最长 10 分钟；采样率原样告诉 Gemini。
export const MAX_AUDIO_SECONDS=600;
const WAVE_ERROR='需要 16-bit 单声道 PCM WAV 录音（8–48 kHz，最长 10 分钟）';
export function parseWave(audio){
 const b=Buffer.from(audio);
 if(b.length<12||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE')throw Error(WAVE_ERROR);
 let fmt=null,data=null,offset=12;
 while(offset+8<=b.length){
  const id=b.toString('ascii',offset,offset+4);let size=b.readUInt32LE(offset+4);const start=offset+8;
  if(id==='data'&&(size===0xFFFFFFFF||start+size>b.length))size=b.length-start; // 流式写入的录音可能没回填长度
  if(start+size>b.length)throw Error(WAVE_ERROR);
  if(id==='fmt '&&size>=16)fmt={format:b.readUInt16LE(start),channels:b.readUInt16LE(start+2),rate:b.readUInt32LE(start+4),byteRate:b.readUInt32LE(start+8),align:b.readUInt16LE(start+12),bits:b.readUInt16LE(start+14)};
  else if(id==='data'){data=b.subarray(start,start+size);break;}
  offset=start+size+(size%2);
 }
 if(!fmt||!data||fmt.format!==1||fmt.channels!==1||fmt.bits!==16||fmt.align!==2||fmt.rate<8000||fmt.rate>48000||fmt.byteRate!==fmt.rate*2||data.length%2||data.length>fmt.rate*2*MAX_AUDIO_SECONDS)throw Error(WAVE_ERROR);
 return {pcm:data,rate:fmt.rate};
}
export function pcmFromWave(audio){return parseWave(audio).pcm;}
// 把服务端给的原因带进报错（便于区分模型下线 / 密钥无效 / 额度用完），同时确保密钥不会出现在报错里
export function describeReason(reason,key){
 let text=String(reason??'').replace(/\s+/g,' ').trim().slice(0,200);
 if(key){text=text.split(key).join('***');const encoded=encodeURIComponent(key);if(encoded!==key)text=text.split(encoded).join('***');}
 return text;
}
export function transcribeWave({audio,language='auto',key,terms=[],model=MODEL,signal},Socket=WebSocket){
 signal.throwIfAborted();
 const {pcm,rate}=parseWave(audio),started=performance.now(),seconds=pcm.length/(rate*2);
 if(!key)throw Error('请到设置 → 语音配置 API Key');
 if(!providerInfo.languages.includes(language))throw Error('不支持的识别语言');
 return new Promise((resolve,reject)=>{
  let ws,done=false,ending=false,uploading=false,state={final:'',interim:''};
  const timer=setTimeout(()=>finish(Error('Gemini 转写超时，请重试')),60000+Math.ceil(seconds*1000)); // 录音越长，留的时间越多
  const finish=(error)=>{if(done)return;done=true;clearTimeout(timer);signal.removeEventListener('abort',abort);ws?.terminate();if(error)reject(error);else resolve({text:state.final,audioSeconds:seconds,inferenceSeconds:(performance.now()-started)/1000});};
  const abort=()=>finish(Error('语音转写已取消'));
  signal.addEventListener('abort',abort,{once:true});
  if(signal.aborted){abort();return;}
  try{ws=new Socket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key='+encodeURIComponent(key),{handshakeTimeout:15000,maxPayload:1024*1024});}catch{finish(Error('无法建立 Gemini 连接'));return;}
  const send=value=>new Promise((ok,fail)=>{if(done||ws.readyState!==WebSocket.OPEN){fail(Error('语音连接已关闭'));return;}ws.send(JSON.stringify(value),e=>e?fail(Error('无法上传录音')):ok());});
  ws.on('unexpected-response',(_request,response)=>{
   const code=response?.statusCode;
   try{response?.resume?.();}catch{}
   const hint=code===400||code===404?'模型名可能已失效（可在 ~/.dsh/gemini-voice/model.txt 换模型）':code===401||code===403?'API Key 无效或没有该模型权限':code===429?'额度或频率超限':'请检查网络和代理';
   finish(Error(`Gemini 握手失败（HTTP ${code??'?'}）：${hint}`));
  });
  ws.on('error',()=>finish(Error('无法连接 Gemini，请检查网络、代理和 API Key')));
  ws.on('close',(code,reason)=>{if(done)return;const detail=describeReason(reason,key);finish(Error(`Gemini 连接中断（${code??'?'}${detail?' '+detail:''}），请检查模型名、权限和额度`));});
  ws.on('open',()=>{
   const setup=setupMessage(terms,model);
   const codes={auto:[],zh:['cmn-Hans-CN'],en:['en-US'],yue:['yue-Hant-HK'],ja:['ja-JP'],ko:['ko-KR']};
   setup.setup.inputAudioTranscription.languageCodes=codes[language];
   void send(setup).catch(e=>finish(e));
  });
  ws.on('message',raw=>{
   if(done)return;
   let message;try{message=JSON.parse(raw.toString());}catch{finish(Error('Gemini 返回无效数据'));return;}
   if(message.error){const detail=describeReason(message.error.message??message.error.status??'',key);finish(Error(`Gemini 拒绝请求${detail?'（'+detail+'）':''}，请检查 API Key、模型权限和额度`));return;}
   if(message.setupComplete&&!uploading){
    uploading=true;
    void(async()=>{
     await send({realtimeInput:{activityStart:{}}});
     for(let i=0;i<pcm.length;i+=rate){signal.throwIfAborted();await send({realtimeInput:{audio:{data:pcm.subarray(i,i+rate).toString('base64'),mimeType:`audio/pcm;rate=${rate}`}}});} // 每块 0.5 秒
     ending=true;await send({realtimeInput:{activityEnd:{}}});
    })().catch(()=>finish(Error(signal.aborted?'语音转写已取消':'无法上传录音')));
   }
   if(message.serverContent){state=reduceTranscript(state,message.serverContent);if(ending&&(message.serverContent.turnComplete||message.serverContent.generationComplete))finish();}
  });
 });
}
