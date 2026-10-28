import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {pcmFromWave,transcribeWave} from './provider.mjs';
function wave(){const b=Buffer.alloc(364);b.write('RIFF');b.writeUInt32LE(356,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(320,40);return b;}
test('official recorder WAV is validated before opening a connection',()=>{assert.equal(pcmFromWave(wave()).length,320);const bad=wave();bad.writeUInt32LE(48000,24);assert.throws(()=>pcmFromWave(bad));assert.throws(()=>pcmFromWave(Buffer.alloc(0)));});
test('provider uses Live endpoint, verbatim mode, selected vocabulary and official result contract',async()=>{
 const messages=[];let closed=false;
 class Socket extends EventEmitter{readyState=1;constructor(url){super();assert.match(url,/GenerativeService.BidiGenerateContent/);queueMicrotask(()=>this.emit('open'));}send(raw,cb){const m=JSON.parse(raw);messages.push(m);cb();if(m.setup)queueMicrotask(()=>this.emit('message',JSON.stringify({setupComplete:{}})));if(m.realtimeInput?.activityEnd)queueMicrotask(()=>this.emit('message',JSON.stringify({serverContent:{inputTranscription:{text:'example'},generationComplete:true}})));}terminate(){closed=true;}}
 const result=await transcribeWave({audio:wave(),key:'test-only',terms:['example'],signal:new AbortController().signal},Socket);
 assert.equal(messages[0].setup.model,'models/gemini-3.5-transcribe-live');assert.equal(messages[0].setup.inputAudioTranscription.mode,'VERBATIM');assert.deepEqual(messages[0].setup.inputAudioTranscription.customVocabulary,['example']);assert.equal(result.text,'example');assert.equal(result.audioSeconds,.01);assert.equal(closed,true);
});
test('cancellation closes an in-flight cloud request',async()=>{let closed=false;class Socket extends EventEmitter{terminate(){closed=true;}}const abort=new AbortController();const pending=transcribeWave({audio:wave(),key:'test-only',signal:abort.signal},Socket);abort.abort();await assert.rejects(pending,/取消/);assert.equal(closed,true);});
