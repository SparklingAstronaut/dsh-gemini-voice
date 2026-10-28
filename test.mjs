import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reduceTranscript,appendDraft,setupMessage} from './protocol.mjs';
import {configDirectory,environmentValue} from './storage.mjs';
import {join} from 'node:path';

test('desktop launches and virtualized AppData use the same shared DSH directory',()=>{
 const home=join('C:','Users','example');
 const expected=join(home,'.dsh','gemini-voice');
 assert.equal(configDirectory('win32',{},home),expected);
 assert.equal(configDirectory('win32',{LocalAppData:join(home,'AppData','Local')},home),expected);
 assert.equal(configDirectory('win32',{LOCALAPPDATA:join(home,'AppData','Local')},home),expected);
 assert.equal(configDirectory('win32',{LOCALAPPDATA:join(home,'AppData','Local','Packages','launcher','LocalCache','Local')},home),expected);
});
test('blank environment key does not shadow a saved key',()=>{
 assert.equal(environmentValue({GEMINI_API_KEY:'   '},'GEMINI_API_KEY'),'');
 assert.equal(environmentValue({Gemini_Api_Key:' value '},'GEMINI_API_KEY'),'value');
});
test('interim revisions do not duplicate final text',()=>{
 let s={final:'',interim:''};
 s=reduceTranscript(s,{interimInputTranscription:{text:'你好'}});
 s=reduceTranscript(s,{interimInputTranscription:{text:'你好世界'}});
 s=reduceTranscript(s,{inputTranscription:{text:'你好，世界。'}});
 s=reduceTranscript(s,{interimInputTranscription:{text:'第二句'}});
 assert.deepEqual(s,{final:'你好，世界。',interim:'第二句'});
 s=reduceTranscript(s,{inputTranscription:{text:'第二句话。'}});
 assert.equal(s.final,'你好，世界。第二句话。');assert.equal(s.interim,'');
});
test('existing draft is preserved',()=>{assert.equal(appendDraft('已有草稿','语音'),'已有草稿\n语音');assert.equal(appendDraft('','语音'),'语音');});
test('only the dedicated transcription model with manual boundaries is used',()=>{const s=setupMessage().setup;assert.equal(s.model,'models/gemini-3.5-transcribe-live');assert.equal(s.realtimeInputConfig.automaticActivityDetection.disabled,true);assert.deepEqual(s.generationConfig.responseModalities,['TEXT']);});
