import { WebSocket, WebSocketServer } from 'ws';
import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { emptyVocabulary, normalizeVocabulary, activeTerms } from './vocabulary.mjs';
import { join } from 'node:path';
import { userInfo } from 'node:os';
import { configDirectory, environmentValue } from './storage.mjs';
import { setupMessage, reduceTranscript, MODEL } from './protocol.mjs';
export const inject = ['webServer','connection'];
const configDir = configDirectory(process.platform, process.env, userInfo().homedir);
const keyPath = join(configDir, 'api-key.txt');
const vocabularyPath = join(configDir, 'vocabulary.json');
async function readVocabulary(){
  try{return normalizeVocabulary(JSON.parse(await readFile(vocabularyPath,'utf8')));}
  catch(e){if(e.code==='ENOENT')return emptyVocabulary();throw e;}
}
// Migrate the previous location when it is visible to this launcher. The
// destination always stays outside AppData virtualization; never overwrite it.
try {
  await readFile(keyPath);
} catch(e) {
  if(e.code==='ENOENT') {
    const legacyBase=environmentValue(process.env,'LOCALAPPDATA') || join(userInfo().homedir,'AppData','Local');
    const legacy=await readFile(join(legacyBase,'DeepSeekHarnessGeminiVoice','api-key.txt'),'utf8').catch(()=> '');
    if(legacy.trim()){await mkdir(configDir,{recursive:true});await writeFile(keyPath,legacy.trim(),{mode:0o600,flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});}
  }
}
const getKey = async () => environmentValue(process.env, 'GEMINI_API_KEY') || (await readFile(keyPath,'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;})).trim();
const json = (res, code, body) => {res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body));};
export function apply(ctx) {
  // Retain Harness authentication and reject cross-origin requests even on loopback.
  function rejection(req) {
    const auth = ctx.connection.requestRejection(req);
    if (auth !== undefined) return auth;
    if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return 403;
    if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) return 403;
  }
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/gemini-voice/vocabulary',handler:async(req,res)=>{
    try{
      const denied=rejection(req);if(denied!==undefined)return json(res,denied,{});
      if(req.method==='GET')return json(res,200,await readVocabulary());
      if(req.method!=='POST'||req.headers['content-type']!=='application/json')return json(res,405,{});
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>450000)return json(res,413,{});}
      let config;try{config=normalizeVocabulary(JSON.parse(body));}catch(e){return json(res,400,{error:e instanceof SyntaxError?'词表格式无效':e.message});}
      await mkdir(configDir,{recursive:true});const temporary=vocabularyPath+'.'+randomUUID()+'.tmp';
      try{await writeFile(temporary,JSON.stringify(config,null,2),{mode:0o600,flag:'wx'});await rename(temporary,vocabularyPath);}finally{await unlink(temporary).catch(()=>{});}
      return json(res,200,config);
    }catch{return json(res,500,{error:'无法读写本机词表，请检查文件权限和格式'});}
  }}));
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/gemini-voice/config',handler:async(req,res)=>{
    try {
      const denied = rejection(req); if(denied!==undefined) return json(res,denied,{});
      if(req.method==='GET') return json(res,200,{configured:!!await getKey(),model:MODEL,websocketUrl:`${req.socket.encrypted?'wss':'ws'}://${req.headers.host}/gemini-voice/live`});
      if(req.method!=='POST'||req.headers['content-type']!=='application/json') return json(res,405,{});
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4096) return json(res,413,{});}
      const {apiKey} = JSON.parse(body);
      if(typeof apiKey!=='string'||! /^[A-Za-z0-9._-]{20,256}$/.test(apiKey.trim())) return json(res,400,{error:'请输入有效的 Gemini API Key'});
      await mkdir(configDir,{recursive:true});await writeFile(keyPath,apiKey.trim(),{mode:0o600});
      json(res,200,{configured:true});
    } catch {json(res,500,{error:req.method==='GET'?'无法读取本机语音配置，请检查文件访问权限':'无法保存本机配置'});}
  }}));
  const wss = new WebSocketServer({noServer:true,maxPayload:32768});
  ctx.effect(()=>()=>{for(const c of wss.clients)c.close();wss.close();});
  ctx.effect(()=>ctx.webServer.registerUpgrade({path:'/gemini-voice/live',handler:(req,socket,head)=>{
    let denied;try{denied=rejection(req);}catch{denied=403;}
    if(denied!==undefined){socket.end(`HTTP/1.1 ${denied} Forbidden\r\n\r\n`);return;}
    if(wss.clients.size>=2){socket.end('HTTP/1.1 429 Too Many Requests\r\n\r\n');return;}
    wss.handleUpgrade(req,socket,head,client=>void connect(client));
  }}));
}
async function connect(client) {
  let upstream, ready=false, ending=false, done=false, state={final:'',interim:''};
  let setupTimer, stopTimer, durationTimer;
  const send = value => {if(client.readyState===WebSocket.OPEN)client.send(JSON.stringify(value));};
  const clean = () => {clearTimeout(setupTimer);clearTimeout(stopTimer);clearTimeout(durationTimer);upstream?.close();};
  const fail = message => {if(done)return;done=true;send({error:message,final:state.final,interim:state.interim});clean();client.close();};
  const finish = () => {if(done)return;done=true;send({done:true,...state});clean();client.close();};
  client.on('close',()=>{done=true;clean();});client.on('error',()=>{done=true;clean();});
  try {
    const key=await getKey();if(!key)return fail('请先设置 Gemini API Key');if(done)return;
    const terms=activeTerms(await readVocabulary());if(done)return;
    upstream=new WebSocket('wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key='+encodeURIComponent(key),{handshakeTimeout:15000,maxPayload:1024*1024});
    setupTimer=setTimeout(()=>fail('连接 Gemini 超时，请检查网络或 API Key'),20000);
    upstream.on('open',()=>upstream.send(JSON.stringify(setupMessage(terms))));
    upstream.on('message',data=>{
      try{
        const msg=JSON.parse(data.toString());
        if(msg.error)return fail('Gemini 拒绝请求，请检查模型权限、免费额度和 API Key');
        if(msg.setupComplete){clearTimeout(setupTimer);ready=true;upstream.send(JSON.stringify({realtimeInput:{activityStart:{}}}));send({ready:true});durationTimer=setTimeout(()=>fail('单段录音接近 10 分钟上限，请另起一段'),570000);}
        if(msg.serverContent){state=reduceTranscript(state,msg.serverContent);send(state);if(ending&&(msg.serverContent.turnComplete||msg.serverContent.generationComplete))finish();}
      }catch{fail('Gemini 返回了无法解析的数据');}
    });
    upstream.on('error',()=>fail('无法连接 Gemini，请检查网络、代理和 API Key'));
    upstream.on('close',(code)=>{if(!done)fail(`Gemini 连接关闭（${code}），请检查权限和额度`);});
    client.on('message',(data,binary)=>{
      if(done)return;
      if(!ready)return fail('连接尚未就绪');
      if(binary){if(ending||data.length%2||data.length>16384)return fail('音频格式错误');if(upstream.bufferedAmount>320000)return fail('网络过慢，已停止录音');upstream.send(JSON.stringify({realtimeInput:{audio:{data:data.toString('base64'),mimeType:'audio/pcm;rate=16000'}}}));}
      else {let message;try{message=JSON.parse(data.toString());}catch{return fail('控制消息错误');}if(message.stop&&!ending){ending=true;clearTimeout(durationTimer);upstream.send(JSON.stringify({realtimeInput:{activityEnd:{}}}));stopTimer=setTimeout(()=>fail('最终转写等待超时；已保留可用文字'),15000);}else if(message.cancel){done=true;clean();client.close();}}
    });
  }catch{fail('无法启动语音服务');}
}
