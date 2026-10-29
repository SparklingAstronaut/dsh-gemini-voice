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
