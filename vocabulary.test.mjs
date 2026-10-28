import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyVocabulary,normalizeVocabulary,activeTerms} from './vocabulary.mjs';
import {setupMessage} from './protocol.mjs';
test('personal vocabulary is opt-in and only selected group is transmitted',()=>{
 const c={enabled:true,active:1,groups:[{name:'one',terms:['unselected']},{name:'two',terms:['selected']}]};
 assert.deepEqual(setupMessage(activeTerms(c)).setup.inputAudioTranscription.customVocabulary,['selected']);
 assert.equal(setupMessage(activeTerms({...c,enabled:false})).setup.inputAudioTranscription.customVocabulary,undefined);
 assert.equal(setupMessage(activeTerms(c)).setup.inputAudioTranscription.mode,'VERBATIM');
 assert.deepEqual(activeTerms(emptyVocabulary()),[]);
});
test('vocabulary normalization removes blanks and case duplicates, rejects oversized and invalid inputs',()=>{
 const c={enabled:true,active:0,groups:[{name:' Test ',terms:[' A ','a','','B']}]};
 assert.deepEqual(normalizeVocabulary(c).groups,[{name:'Test',terms:['A','B']}]);
 assert.throws(()=>normalizeVocabulary({...c,active:-1}));
 assert.throws(()=>normalizeVocabulary({...c,groups:[{name:'Test',terms:Array.from({length:101},(_,i)=>String(i))}]}));
 assert.throws(()=>normalizeVocabulary({...c,groups:[{name:'Test',terms:['bad\nterm']}]}));
 assert.throws(()=>normalizeVocabulary({...c,groups:[{name:'Test',terms:['x'.repeat(101)]}]}));
});
