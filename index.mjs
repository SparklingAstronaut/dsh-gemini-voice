import { providerInfo, transcribeWave } from './provider.mjs';
import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { emptyVocabulary, normalizeVocabulary, activeTerms } from './vocabulary.mjs';
import { join } from 'node:path';
import { userInfo } from 'node:os';
import { configDirectory, environmentValue } from './storage.mjs';
import { MODEL } from './protocol.mjs';
export const inject = ['webServer','connection','speechToText'];
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
      if(req.method==='GET') return json(res,200,{configured:!!await getKey(),model:MODEL});
      if(req.method!=='POST'||req.headers['content-type']!=='application/json') return json(res,405,{});
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4096) return json(res,413,{});}
      const {apiKey} = JSON.parse(body);
      if(typeof apiKey!=='string'||! /^[A-Za-z0-9._-]{20,256}$/.test(apiKey.trim())) return json(res,400,{error:'请输入有效的 Gemini API Key'});
      await mkdir(configDir,{recursive:true});await writeFile(keyPath,apiKey.trim(),{mode:0o600});
      json(res,200,{configured:true});
    } catch {json(res,500,{error:req.method==='GET'?'无法读取本机语音配置，请检查文件访问权限':'无法保存本机配置'});}
  }}));
  let active=0;
  ctx.effect(()=>ctx.speechToText.register({info:providerInfo,transcribe:async(input,signal)=>{
    signal.throwIfAborted();if(active>=2)throw Error('正在转写，请稍后重试');active++;
    try{return await transcribeWave({...input,signal,key:await getKey(),terms:activeTerms(await readVocabulary())});}
    finally{active--;}
  }}));
}
