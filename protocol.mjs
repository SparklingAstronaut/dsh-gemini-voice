export const MODEL = 'gemini-3.5-transcribe-live';
// 模型名覆盖顺序：环境变量 GEMINI_VOICE_MODEL > ~/.dsh/gemini-voice/model.txt > 内置默认值。
// 只接受形如 gemini-xxx 的安全名字（去掉 models/ 前缀），非法值回落默认，避免拼出奇怪的请求。
export function resolveModel(env = {}, fileText = '') {
  const pick = (value) => {
    const name = String(value || '').replace(/^\uFEFF/, '').trim().replace(/^models\//, '');
    return /^[A-Za-z0-9][A-Za-z0-9._-]{2,99}$/.test(name) ? name : '';
  };
  const key = Object.keys(env).find(k => k.toUpperCase() === 'GEMINI_VOICE_MODEL');
  return pick(key ? env[key] : '') || pick(String(fileText || '').split(/\r?\n/)[0]) || MODEL;
}
export function setupMessage(terms=[], model=MODEL) {
  return {setup:{model:`models/${model}`,generationConfig:{responseModalities:['TEXT']},inputAudioTranscription:{languageCodes:['cmn-Hans-CN','en-US'],...(terms.length?{customVocabulary:terms}:{}),mode:'VERBATIM'},realtimeInputConfig:{automaticActivityDetection:{disabled:true}}}};
}
export function reduceTranscript(state, content) {
  let {final, interim} = state;
  if (content.interimInputTranscription) interim = content.interimInputTranscription.text || '';
  if (content.inputTranscription) { final += content.inputTranscription.text || ''; interim = ''; }
  return {final, interim};
}
export function appendDraft(draft, text) { return draft + (draft && text && !/\s$/.test(draft) ? '\n' : '') + text; }
