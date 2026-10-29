export const emptyVocabulary = () => ({enabled:false,active:0,groups:[{name:'个人词表',terms:[]}]});
export function normalizeVocabulary(value) {
  if (!value || typeof value.enabled !== 'boolean' || !Array.isArray(value.groups) || value.groups.length < 1 || value.groups.length > 10) throw Error('需要 1–10 个词表分组');
  if (!Number.isInteger(value.active) || !value.groups[value.active]) throw Error('请选择有效的词表分组');
  const groups=value.groups.map(group=>{
    if(typeof group.name!=='string'||!group.name.trim()||group.name.trim().length>40||!Array.isArray(group.terms))throw Error('分组名称需为 1–40 字');
    const seen=new Set(),terms=[];
    for(const term of group.terms){
      if(typeof term!=='string'||term.trim().length>100||/[\x00-\x1f]/.test(term))throw Error('每个词条最多 100 字，不能包含换行或控制字符');
      const clean=term.trim(),id=clean.toLowerCase();
      if(clean&&!seen.has(id)){seen.add(id);terms.push(clean);}
    }
    if(terms.length>100)throw Error('每组最多 100 个词条，请按用途分组');
    return {name:group.name.trim(),terms};
  });
  return {enabled:value.enabled,active:value.active,groups};
}
// 从文件文本解析词表：容忍 UTF-8 BOM（记事本 / Windows PowerShell 5.1 写出的文件常带 BOM）
export function parseVocabularyText(text) {
  return normalizeVocabulary(JSON.parse(String(text).replace(/^\uFEFF/, '')));
}
export function activeTerms(value) {
  const config=normalizeVocabulary(value);
  return config.enabled ? config.groups[config.active].terms : [];
}
