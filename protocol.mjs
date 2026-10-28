export const MODEL = 'gemini-3.5-transcribe-live';
export function setupMessage() {
  return {setup:{model:`models/${MODEL}`,generationConfig:{responseModalities:['TEXT']},inputAudioTranscription:{languageCodes:['cmn-Hans-CN','en-US'],customVocabulary:['DeepSeek Harness','Codex','Handy','Gemini','GitHub','API'],mode:'SMART'},realtimeInputConfig:{automaticActivityDetection:{disabled:true}}}};
}
export function reduceTranscript(state, content) {
  let {final, interim} = state;
  if (content.interimInputTranscription) interim = content.interimInputTranscription.text || '';
  if (content.inputTranscription) { final += content.inputTranscription.text || ''; interim = ''; }
  return {final, interim};
}
export function appendDraft(draft, text) { return draft + (draft && text && !/\s$/.test(draft) ? '\n' : '') + text; }
