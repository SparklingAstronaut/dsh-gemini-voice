import {readFileSync} from 'node:fs';
import {parseWave, MAX_AUDIO_SECONDS} from './provider.mjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {resolveModel, setupMessage, MODEL} from './protocol.mjs';
import {parseVocabularyText} from './vocabulary.mjs';
import {transcribeWave, describeReason} from './provider.mjs';
import * as plugin from './index.mjs';

function wave(){const b=Buffer.alloc(364);b.write('RIFF');b.writeUInt32LE(356,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(320,40);return b;}

test('speechToText is optional: routes register even when the voice service is missing',()=>{
 assert.deepEqual(plugin.inject,['webServer','connection']);
 const routes=[];const injected=[];
 const ctx={
  effect(fn){fn();},
  get(){return undefined;},
  inject(deps,cb){injected.push({deps,cb});},
  connection:{requestRejection(){return undefined;}},
  webServer:{register(route){routes.push(route.path);return()=>{};}},
 };
 plugin.apply(ctx);
 assert.deepEqual(routes.sort(),['/gemini-voice/config','/gemini-voice/vocabulary']);
 assert.equal(injected.length,1);
 assert.deepEqual(injected[0].deps,['speechToText']);
 // 服务出现后才注册语音提供者
 const providers=[];
 injected[0].cb({effect(fn){fn();},speechToText:{register(p){providers.push(p.info.id);return()=>{};}}});
 assert.deepEqual(providers,['gemini-cloud']);
});

test('vocabulary file with a UTF-8 BOM still parses',()=>{
 const text='\uFEFF'+JSON.stringify({enabled:true,active:0,groups:[{name:'g',terms:['DeepSeek']}]});
 assert.deepEqual(parseVocabularyText(text).groups[0].terms,['DeepSeek']);
});

test('model can be overridden without code changes, and junk falls back to the default',()=>{
 assert.equal(resolveModel({},''),MODEL);
 assert.equal(resolveModel({},'\uFEFFgemini-next-transcribe\r\n'),'gemini-next-transcribe');
 assert.equal(resolveModel({},'models/gemini-next-transcribe'),'gemini-next-transcribe');
 assert.equal(resolveModel({GEMINI_VOICE_MODEL:'env-model-1'},'file-model-1'),'env-model-1');
 assert.equal(resolveModel({},'bad name with spaces'),MODEL);
 assert.equal(setupMessage([],'custom-model').setup.model,'models/custom-model');
});

test('handshake failures report the HTTP status and never leak the key',async()=>{
 const key='AIzaSECRET-test-key-1234567890';
 class Socket extends EventEmitter{readyState=0;constructor(){super();queueMicrotask(()=>this.emit('unexpected-response',{},{statusCode:404,resume(){}}));}terminate(){}}
 await assert.rejects(transcribeWave({audio:wave(),key,signal:new AbortController().signal},Socket),(e)=>{
  assert.match(e.message,/HTTP 404/);assert.match(e.message,/model\.txt/);assert.ok(!e.message.includes(key));return true;});
});

test('server close reasons are surfaced with the key redacted',async()=>{
 const key='AIzaSECRET-test-key-1234567890';
 class Socket extends EventEmitter{readyState=1;constructor(){super();queueMicrotask(()=>this.emit('close',1008,Buffer.from(`model not found for key=${key}`)));}terminate(){}}
 await assert.rejects(transcribeWave({audio:wave(),key,signal:new AbortController().signal},Socket),(e)=>{
  assert.match(e.message,/1008/);assert.match(e.message,/model not found/);assert.ok(!e.message.includes(key));return true;});
 assert.equal(describeReason(`a ${encodeURIComponent('k/y+')} b`,'k/y+'),'a *** b');
});

test('custom model is sent in the setup message',async()=>{
 const messages=[];
 class Socket extends EventEmitter{readyState=1;constructor(){super();queueMicrotask(()=>this.emit('open'));}send(raw,cb){const m=JSON.parse(raw);messages.push(m);cb();if(m.setup)queueMicrotask(()=>this.emit('message',JSON.stringify({setupComplete:{}})));if(m.realtimeInput?.activityEnd)queueMicrotask(()=>this.emit('message',JSON.stringify({serverContent:{inputTranscription:{text:'ok'},turnComplete:true}})));}terminate(){}}
 const result=await transcribeWave({audio:wave(),key:'test-only',model:'custom-model',signal:new AbortController().signal},Socket);
 assert.equal(messages[0].setup.model,'models/custom-model');
 assert.equal(result.text,'ok');
});

// ---- 0.3.3：录音格式容错 + 补丁携带默认识别 ----
function makeWave({rate=16000,samples=160,extraChunk=null,dataSize=null}={}){
 const fmt=Buffer.alloc(24);fmt.write('fmt ');fmt.writeUInt32LE(16,4);fmt.writeUInt16LE(1,8);fmt.writeUInt16LE(1,10);fmt.writeUInt32LE(rate,12);fmt.writeUInt32LE(rate*2,16);fmt.writeUInt16LE(2,20);fmt.writeUInt16LE(16,22);
 const pcm=Buffer.alloc(samples*2);
 const dataHead=Buffer.alloc(8);dataHead.write('data');dataHead.writeUInt32LE(dataSize??pcm.length,4);
 const parts=[fmt];if(extraChunk)parts.push(extraChunk);parts.push(dataHead,pcm);
 const body=Buffer.concat(parts);const head=Buffer.alloc(12);head.write('RIFF');head.writeUInt32LE(body.length+4,4);head.write('WAVE',8);
 return Buffer.concat([head,body]);
}
test('WAV with an extra LIST chunk (non-44-byte header) is accepted',()=>{
 const list=Buffer.alloc(16);list.write('LIST');list.writeUInt32LE(8,4);list.write('INFOtest',8);
 const {pcm,rate}=parseWave(makeWave({extraChunk:list}));
 assert.equal(pcm.length,320);assert.equal(rate,16000);
});
test('other sample rates are accepted and passed to Gemini as-is',async()=>{
 assert.equal(parseWave(makeWave({rate:48000,samples:480})).rate,48000);
 const messages=[];
 class Socket extends EventEmitter{readyState=1;constructor(){super();queueMicrotask(()=>this.emit('open'));}send(raw,cb){const m=JSON.parse(raw);messages.push(m);cb();if(m.setup)queueMicrotask(()=>this.emit('message',JSON.stringify({setupComplete:{}})));if(m.realtimeInput?.activityEnd)queueMicrotask(()=>this.emit('message',JSON.stringify({serverContent:{inputTranscription:{text:'ok'},turnComplete:true}})));}terminate(){}}
 const result=await transcribeWave({audio:makeWave({rate:48000,samples:4800}),key:'test-only',signal:new AbortController().signal},Socket);
 const audio=messages.find(m=>m.realtimeInput?.audio);
 assert.equal(audio.realtimeInput.audio.mimeType,'audio/pcm;rate=48000');
 assert.equal(result.audioSeconds,0.1);
});
test('streamed WAV with an unfilled data length still parses; junk and over-long audio are rejected',()=>{
 assert.equal(parseWave(makeWave({dataSize:0xFFFFFFFF})).pcm.length,320);
 assert.throws(()=>parseWave(Buffer.from('not a wave file at all')));
 const stereo=makeWave();stereo.writeUInt16LE(2,22);assert.throws(()=>parseWave(stereo));
 const tooLong=makeWave({rate:8000,samples:8000*MAX_AUDIO_SECONDS+2});assert.throws(()=>parseWave(tooLong));
});
test('the Gemini default provider is carried by the plugin patch, so DSH falls back to SenseVoice if the plugin is skipped',()=>{
 const patch=readFileSync(new URL('./cordis.patch.yml',import.meta.url),'utf8');
 assert.match(patch,/- id: speech-to-text\n\s+name: '@deepseek-ai\/dsh-experimental-speech-to-text'\n\s+config:\n\s+defaultProvider: gemini-cloud/);
 assert.match(patch,/- insert:\n\s+- id: gemini-voice\n\s+name: dsh-gemini-voice/);
});
test('package declares a lenient DSH range (no forced shutdown on the next minor release)',()=>{
 const pkg=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8'));
 assert.equal(pkg.engines.dsh,'>=0.2.1-rc.3 <1.0.0-0');
 assert.ok(pkg.files.includes('cordis.patch.yml'));
});