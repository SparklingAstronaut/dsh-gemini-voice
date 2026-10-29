import { providerInfo, transcribeWave } from './provider.mjs';
import { readFile, writeFile, mkdir, rename, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { emptyVocabulary, parseVocabularyText, normalizeVocabulary, activeTerms } from './vocabulary.mjs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { configDirectory, environmentValue } from './storage.mjs';
import { resolveModel } from './protocol.mjs';
// speechToText 来自实验性语音包，不放进必需依赖：语音包关闭/改名时，设置页（密钥、词表）照常可用，
// 语音提供者在服务出现后再通过 ctx.inject 注册（DSH 官方插件同样用这种写法处理可选服务）。
export const inject = ['webServer','connection'];
const configDir = configDirectory(process.platform, process.env, homedir());
const keyPath = join(configDir, 'api-key.txt');
const vocabularyPath = join(configDir, 'vocabulary.json');
const modelPath = join(configDir, 'model.txt');
async function readVocabulary(){
  try{return parseVocabularyText(await readFile(vocabularyPath,'utf8'));}
  catch(e){if(e.code==='ENOENT')return emptyVocabulary();throw e;}
}
// 先写临时文件再改名：断电/崩溃时不会留下半截文件
async function writeAtomic(path, text){
  await mkdir(configDir,{recursive:true});
  const temporary=path+'.'+randomUUID()+'.tmp';
  try{await writeFile(temporary,text,{mode:0o600,flag:'wx'});await rename(temporary,path);}
  finally{await unlink(temporary).catch(()=>{});}
}
// Migrate the previous location when it is visible to this launcher. The
// destination always stays outside AppData virtualization; never overwrite it.
try {
  await readFile(keyPath);
} catch(e) {
  if(e.code==='ENOENT') {
    try {
      const legacyBase=environmentValue(process.env,'LOCALAPPDATA') || join(homedir(),'AppData','Local');
      const legacy=await readFile(join(legacyBase,'DeepSeekHarnessGeminiVoice','api-key.txt'),'utf8').catch(()=> '');
      if(legacy.trim()){await mkdir(configDir,{recursive:true});await writeFile(keyPath,legacy.trim(),{mode:0o600,flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});}
    } catch { /* 迁移失败不影响插件加载 */ }
  }
}
const getKey = async () => environmentValue(process.env, 'GEMINI_API_KEY') || (await readFile(keyPath,'utf8').catch(e=>{if(e.code==='ENOENT')return '';throw e;})).replace(/^\uFEFF/,'').trim();
// 模型名可覆盖：环境变量 GEMINI_VOICE_MODEL 或 ~/.dsh/gemini-voice/model.txt；都没有时用内置默认值。
// Google 下线/改名模型时，只需改这个文件，不用改代码。
const getModel = async () => resolveModel(process.env, await readFile(modelPath,'utf8').catch(()=>''));
const json = (res, code, body) => {res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body));};
export function apply(ctx) {
  // Retain Harness authentication and reject cross-origin requests even on loopback.
  function rejection(req) {
    const auth = ctx.connection.requestRejection(req);
    if (auth !== undefined) return auth;
    if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return 403;
    if (req.headers.origin) {
      try { if (new URL(req.headers.origin).host !== req.headers.host) return 403; }
      catch { return 403; } // 例如 Origin: null，按跨源拒绝，而不是抛错变成 500
    }
  }
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/gemini-voice/vocabulary',handler:async(req,res)=>{
    try{
      const denied=rejection(req);if(denied!==undefined)return json(res,denied,{});
      if(req.method==='GET')return json(res,200,await readVocabulary());
      if(req.method!=='POST'||req.headers['content-type']!=='application/json')return json(res,405,{});
      let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>450000)return json(res,413,{});}
      let config;try{config=normalizeVocabulary(JSON.parse(body));}catch(e){return json(res,400,{error:e instanceof SyntaxError?'词表格式无效':e.message});}
      await writeAtomic(vocabularyPath,JSON.stringify(config,null,2));
      return json(res,200,config);
    }catch{return json(res,500,{error:'无法读写本机词表，请检查文件权限和格式'});}
  }}));
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/gemini-voice/config',handler:async(req,res)=>{
    try {
      const denied = rejection(req); if(denied!==undefined) return json(res,denied,{});
      if(req.method==='GET') return json(res,200,{configured:!!await getKey(),model:await getModel(),providerReady:!!ctx.get?.('speechToText')});
      if(req.method!=='POST'||req.headers['content-type']!=='application/json') return json(res,405,{});
      let body='';for await(const chunk of req){body+=chunk;if(body.length>4096) return json(res,413,{});}
      let apiKey;try{({apiKey}=JSON.parse(body));}catch{return json(res,400,{error:'请求格式无效'});}
      if(typeof apiKey!=='string'||! /^[A-Za-z0-9._-]{20,256}$/.test(apiKey.trim())) return json(res,400,{error:'请输入有效的 Gemini API Key'});
      await writeAtomic(keyPath,apiKey.trim());
      json(res,200,{configured:true});
    } catch {json(res,500,{error:req.method==='GET'?'无法读取本机语音配置，请检查文件访问权限':'无法保存本机配置'});}
  }}));
  let active=0;
  ctx.inject(['speechToText'],(voiceCtx)=>{
    voiceCtx.effect(()=>voiceCtx.speechToText.register({info:providerInfo,transcribe:async(input,signal)=>{
      signal.throwIfAborted();if(active>=2)throw Error('正在转写，请稍后重试');active++;
      try{
        // 词表读不出来（损坏/被其他程序改坏）时只是不用词表，不让每次转写都失败
        const terms=await readVocabulary().then(activeTerms).catch(()=>[]);
        return await transcribeWave({...input,signal,key:await getKey(),model:await getModel(),terms});
      }
      finally{active--;}
    }}));
  });
}
