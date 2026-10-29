import React, {useEffect,useState} from 'react';
// DSH 官方界面组件：运行时从平台内置的组件表按需取用（不在 package.json 里声明依赖）。
// 取不到（DSH 以后改名/删除）时，页面退回自绘的简易界面，插件照常加载，不会拖垮设置弹窗。
let Primitives={};
try{Primitives=require('@deepseek-ai/dsh-client-ui-primitives')||{};}catch{Primitives={};}
const pick=(name)=>{const value=Primitives[name];return typeof value==='function'||(typeof value==='object'&&value!==null)?value:null;};
const MicIcon=pick('IconMicrophoneOutlineRegular');
const UI={Form:pick('SettingsForm'),Secret:pick('SettingsSecretField'),Value:pick('SettingsValueField'),Switch:pick('Switch'),Segmented:pick('SegmentedControl'),Button:pick('Button')};
const OFFICIAL=Object.values(UI).every(Boolean);
export const inject=['slots'];
// 设置导航里用麦克风图标替换默认齿轮（纯外观；DOM 结构变了最多多一个图标，不影响功能）
const NAV_CSS='[role="dialog"] nav button:has([data-gemini-voice-nav]) > svg{display:none}[data-gemini-voice-nav] svg{stroke:currentColor;stroke-width:1.4;stroke-linejoin:round;stroke-linecap:round}';
// 版式与 DSH 官方设置页一致（标题 18px、介绍 13px、小节标题 13px 粗体、字段之间 0.5px 分隔线、输入框同官方尺寸和配色）
const PAGE_CSS='.gv-page{max-width:760px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column}'
 +'.gv-heading{margin:0;font-size:18px;font-weight:600;line-height:1.4}'
 +'.gv-intro{color:var(--dsw-alias-label-tertiary);margin:6px 0 8px;font-size:13px;line-height:1.5}'
 +'.gv-section-title{color:var(--dsw-alias-label-primary);margin:16px 0 4px;font-size:13px;font-weight:600;line-height:1.5}'
 +'.gv-field{display:flex;flex-direction:column;gap:6px;padding:12px 0;border-top:.5px solid var(--dsw-alias-border-l2)}'
 +'.gv-field-head{display:flex;align-items:center;justify-content:space-between;gap:8px}'
 +'.gv-actions{display:inline-flex;gap:8px}'
 +'.gv-label{font-size:13px;line-height:1.5}'
 +'.gv-toggle-row{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;font-size:13px;line-height:1.5}'
 +'.gv-hint{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-tertiary)}'
 +'.gv-invalid{margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-state-danger-primary,#f66)}'
 +'.gv-input{box-sizing:border-box;height:34px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md);background:var(--dsw-alias-bg-layer-3);font:inherit;font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary)}'
 +'.gv-input:focus{outline:none;border-color:var(--dsw-alias-label-tertiary)}'
 +'.gv-textarea{height:auto;min-height:132px;padding:8px 12px;resize:vertical}'
 +'.gv-warning{margin:4px 0;font-size:12px;line-height:1.5;color:var(--dsw-alias-state-warning-primary,#f5a623)}'
 +'.gv-error{margin:8px 0 0;font-size:12px;line-height:1.5;color:var(--dsw-alias-state-danger-primary,#f66)}'
 +'.gv-notice{margin:8px 0 0;font-size:12px;line-height:1.5;color:var(--dsw-alias-state-success-primary,#4caf50)}';
export function apply(ctx){
  ctx.effect(()=>{const sheet=document.createElement('style');sheet.dataset.geminiVoice='true';sheet.textContent=(MicIcon?NAV_CSS:'')+PAGE_CSS;document.head.appendChild(sheet);return()=>sheet.remove();});
  ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:'gemini-voice',order:5,label:()=> MicIcon?<span data-gemini-voice-nav="" style={{display:'inline-flex',alignItems:'center',gap:8}}><MicIcon size={16}/><span>语音</span></span>:'语音'},OFFICIAL?VoiceSettings:FallbackVoiceSettings));
}

const KEY_PATTERN=/^[A-Za-z0-9._-]{20,256}$/;
const MAX_TERMS=100,MAX_GROUPS=10;
async function getJson(url){const r=await fetch(url);if(!r.ok)throw Error('HTTP '+r.status);return r.json();}
async function postJson(url,body){
  const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  let data={};try{data=await r.json();}catch{}
  if(!r.ok)throw Error(data.error||'保存失败');
  return data;
}

// 官方风格的语音设置页：整页一个表单，底部统一“保存”（与 DSH 官方设置页同款）
export function VoiceSettings(){
  const {Form,Secret,Value,Switch,Segmented,Button}=UI;
  const [config,setConfig]=useState(null);       // {configured, model, providerReady}
  const [loadError,setLoadError]=useState('');
  const [keyDraft,setKeyDraft]=useState('');
  const [vocab,setVocab]=useState(null);
  const [baseline,setBaseline]=useState('');
  const [saving,setSaving]=useState(false);
  const [failed,setFailed]=useState('');
  const [notice,setNotice]=useState('');
  useEffect(()=>{
    let live=true;
    getJson('/gemini-voice/config').then(c=>{if(live)setConfig(c);}).catch(()=>{if(live)setLoadError('无法读取语音配置，请关闭设置后重新打开。');});
    getJson('/gemini-voice/vocabulary').then(v=>{if(live){setVocab(v);setBaseline(JSON.stringify(v));}}).catch(()=>{if(live)setLoadError('无法读取个人词表。更新插件后请从「应用 → 退出」重启 DeepSeek。');});
    return()=>{live=false;};
  },[]);
  const keyDirty=keyDraft.trim()!=='';
  const keyInvalid=keyDirty&&!KEY_PATTERN.test(keyDraft.trim());
  const vocabDirty=vocab!==null&&JSON.stringify(vocab)!==baseline;
  const group=vocab?vocab.groups[vocab.active]:null;
  const termCount=group?group.terms.filter(t=>t.trim()).length:0;
  const groupNameEmpty=!!group&&!group.name.trim();
  const vocabInvalid=!!group&&(termCount>MAX_TERMS||groupNameEmpty);
  const edit=(change)=>{setNotice('');setFailed('');change();};
  const updateGroup=(patch)=>edit(()=>setVocab(v=>({...v,groups:v.groups.map((g,i)=>i===v.active?{...g,...patch}:g)})));
  async function save(){
    if(saving)return;
    setSaving(true);setFailed('');setNotice('');
    try{
      if(keyDirty){await postJson('/gemini-voice/config',{apiKey:keyDraft.trim()});setKeyDraft('');setConfig(c=>({...(c||{}),configured:true}));}
      if(vocabDirty){const saved=await postJson('/gemini-voice/vocabulary',vocab);setVocab(saved);setBaseline(JSON.stringify(saved));}
      setNotice('已保存，下次录音生效');
    }catch(e){setFailed(e.message||'保存失败');}
    finally{setSaving(false);}
  }
  function discard(){setKeyDraft('');setFailed('');if(baseline){try{setVocab(JSON.parse(baseline));}catch{}}}
  const state={available:config!==null||vocab!==null||!!loadError,writable:true,dirty:keyDirty||vocabDirty,invalid:keyInvalid||vocabInvalid,saving,failed:!!failed};
  const labels={unavailable:'正在读取配置…',readOnly:'当前设置为只读',saveFailed:failed||'保存失败',save:'保存',saving:'保存中…'};
  const keyHint=keyInvalid
    ?'这不像有效的 Gemini API Key（20–256 位字母、数字或 . _ -）。'
    :(config&&config.configured?'只在更换密钥时填写。':'在 Google AI Studio 创建 API Key 后填入。')+'录音会发送给 Google 转写，使用你的 Gemini API 额度。'+(config&&config.model?` 当前模型：${config.model}。`:'');
  return <section className="gv-page" aria-label="语音设置" data-gv-ui="official">
    <h2 className="gv-heading">语音</h2>
    <p className="gv-intro">用 Gemini 为 DeepSeek 的语音输入做逐字转写。API Key 和个人词表只保存在本机。</p>
    {loadError?<p className="gv-error" role="alert">{loadError}</p>:null}
    <Form labels={labels} state={state} onSave={save} onDiscard={discard}>
      <h3 className="gv-section-title">Gemini 转写</h3>
      {config&&config.providerReady===false?<p className="gv-warning" role="alert">DeepSeek 的语音输入功能当前没有启用，Gemini 转写暂时用不了；密钥和词表仍可在这里修改。</p>:null}
      <Secret id="gemini-voice-key" label="API Key" configured={!!(config&&config.configured)} stateLabel={config&&config.configured?'已配置':'未配置'} text={keyDraft} disabled={saving} hint={keyHint} onEdit={(text)=>edit(()=>setKeyDraft(text))}/>
      <h3 className="gv-section-title">个人词表</h3>
      {vocab&&group?<>
        <div className="gv-field">
          <label className="gv-toggle-row"><span>启用个人词表</span><Switch checked={!!vocab.enabled} label="启用个人词表" disabled={saving} onChange={(next)=>edit(()=>setVocab(v=>({...v,enabled:!!next})))}/></label>
          <p className="gv-hint">启用后，选中分组的词条会发给 Google 帮助识别专有名词；不会自动整理排版，也不会强制替换文字。</p>
        </div>
        <div className="gv-field">
          <div className="gv-field-head">
            <span className="gv-label">当前分组</span>
            <span className="gv-actions">
              <Button variant="outline" size="sm" disabled={saving||vocab.groups.length>=MAX_GROUPS} onClick={()=>edit(()=>setVocab(v=>({...v,active:v.groups.length,groups:[...v.groups,{name:'新词表',terms:[]}]})))}>新增分组</Button>
              <Button variant="outline" size="sm" disabled={saving||vocab.groups.length<=1} onClick={()=>edit(()=>setVocab(v=>({...v,active:0,groups:v.groups.filter((_,i)=>i!==v.active)})))}>移除分组</Button>
            </span>
          </div>
          {vocab.groups.length<=4
            ?<Segmented id="gemini-voice-group" label="当前分组" value={String(vocab.active)} disabled={saving} options={vocab.groups.map((g,i)=>({value:String(i),label:(g.name||'未命名').slice(0,12)}))} onChange={(next)=>edit(()=>setVocab(v=>({...v,active:Number(next)})))}/>
            :<select className="gv-input" aria-label="当前分组" value={vocab.active} disabled={saving} onChange={(e)=>{const next=Number(e.target.value);edit(()=>setVocab(v=>({...v,active:next})));}}>{vocab.groups.map((g,i)=><option key={i} value={i} style={{color:'#111',background:'#fff'}}>{g.name||'未命名分组'}</option>)}</select>}
        </div>
        <Value id="gemini-voice-group-name" label="分组名称" text={group.name} disabled={saving} invalid={groupNameEmpty} invalidLabel="分组名称不能为空" hint="最多 40 个字" onEdit={(text)=>updateGroup({name:text.slice(0,40)})}/>
        <div className="gv-field">
          <label className="gv-label" htmlFor="gemini-voice-terms">词条（每行一个）</label>
          <textarea id="gemini-voice-terms" className="gv-input gv-textarea" rows={6} value={group.terms.join('\n')} disabled={saving} onChange={(e)=>updateGroup({terms:e.target.value.split('\n')})}/>
          <p className={termCount>MAX_TERMS?'gv-invalid':'gv-hint'}>{termCount} / {MAX_TERMS} 个词条{termCount>MAX_TERMS?'，超出上限，请拆成多个分组':`；每组最多 ${MAX_TERMS} 个，最多 ${MAX_GROUPS} 组`}</p>
        </div>
      </>:<p className="gv-hint">正在读取个人词表…</p>}
    </Form>
    {notice?<p className="gv-notice" role="status">{notice}</p>:null}
  </section>;
}

// ---- 退路：DSH 官方组件不可用时的简易界面（原 0.3.3 版） ----
const style={border:'1px solid #8885',borderRadius:8,padding:'6px 9px',background:'transparent',color:'inherit',cursor:'pointer'};
export function FallbackVoiceSettings(){
  const [configured,setConfigured]=useState(null),[key,setKey]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[providerReady,setProviderReady]=useState(true),[model,setModel]=useState('');
  useEffect(()=>{let live=true;fetch('/gemini-voice/config').then(async r=>{if(!r.ok)throw Error();return r.json();}).then(c=>{if(live){setConfigured(c.configured);setProviderReady(c.providerReady!==false);setModel(c.model||'');}}).catch(()=>{if(live)setMessage('无法读取配置，请重新打开设置');});return()=>{live=false;};},[]);
  async function save(e){e.preventDefault();setBusy(true);setMessage('');try{const r=await fetch('/gemini-voice/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({apiKey:key})});const data=await r.json();if(!r.ok)throw Error(data.error||'保存失败');setKey('');setConfigured(true);setMessage('已保存');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  return <section aria-label="语音设置" data-gv-ui="fallback" style={{padding:'8px 0 24px'}}>
    <h2 style={{fontSize:18,fontWeight:600,margin:'0 0 20px'}}>语音</h2><div style={{fontWeight:600,marginBottom:8}}>Gemini API Key</div>
    <p style={{fontSize:13,opacity:.7,margin:'0 0 12px'}}>{configured===null?'正在读取配置…':configured?'API Key 已配置，可以直接使用麦克风。仅更换密钥时需要输入。':'尚未配置，请填写 Google AI Studio 的 API Key。'}</p>
    <form onSubmit={save} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <input aria-label="Gemini API Key" type="password" autoComplete="off" placeholder={configured?'输入新的 API Key 以更换':'输入 Gemini API Key'} value={key} onChange={e=>setKey(e.target.value)} style={{flex:'1 1 240px',minWidth:0,border:'1px solid #8885',borderRadius:8,padding:'8px 10px',background:'transparent',color:'inherit'}}/>
      <button style={{...style,opacity:(busy||!key.trim())?.5:1}} disabled={busy||!key.trim()} type="submit">{busy?'保存中…':'保存'}</button>
    </form>
    {message&&<p role="status" style={{fontSize:13}}>{message}</p>}
    {!providerReady&&<p role="alert" style={{fontSize:13,color:'#f5a623',margin:'10px 0 0'}}>DeepSeek 的语音输入功能当前没有启用，Gemini 转写暂时不可用；密钥和词表仍可在这里修改。</p>}
    <p style={{fontSize:12,opacity:.6,margin:'10px 0 0'}}>密钥保存在本机。录音发送至 Google 进行转写，使用 Gemini API 项目的额度。{model?` 当前模型：${model}。`:''}</p>
    <FallbackVocabulary/>
  </section>;
}
function FallbackVocabulary(){
  const [config,setConfig]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{let live=true;fetch('/gemini-voice/vocabulary').then(async r=>{if(!r.ok)throw Error();return r.json();}).then(c=>{if(live)setConfig(c);}).catch(()=>{if(live)setMessage('无法读取个人词表。更新插件后请从「应用 → 退出」重启。');});return()=>{live=false;};},[]);
  function updateGroup(change){setMessage('');setConfig(c=>({...c,groups:c.groups.map((g,i)=>i===c.active?{...g,...change}:g)}));}
  async function save(){setBusy(true);setMessage('');try{const r=await fetch('/gemini-voice/vocabulary',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(config)});const data=await r.json();if(!r.ok)throw Error(data.error||'保存失败');setConfig(data);setMessage('词表已保存，下次录音生效');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  const field={...style,cursor:'text',width:'100%',boxSizing:'border-box'};
  return <div style={{marginTop:20,borderTop:'1px solid #8883',paddingTop:16}}>
    <div style={{fontWeight:600}}>个人词表（可选）</div>
    <p style={{fontSize:12,opacity:.7}}>建议建立自己的专有名词表；每行一个词，每组最多 100 个词，最多 10 组。只使用选中的分组。词表辅助拼写，不开启自动整理或排版。</p>
    {config&&<fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
      <label style={{display:'block',marginBottom:12}}><input type="checkbox" checked={config.enabled} onChange={e=>{setMessage('');setConfig({...config,enabled:e.target.checked});}}/> 启用个人词表</label>
      <div style={{display:'flex',gap:8,marginBottom:10}}>
        <select aria-label="当前词表分组" value={config.active} onChange={e=>{setMessage('');setConfig({...config,active:Number(e.target.value)});}} style={{...style,flex:1}}>{config.groups.map((g,i)=><option key={i} value={i} style={{color:'#111',background:'#fff'}}>{g.name||'未命名分组'}</option>)}</select>
        <button type="button" style={style} disabled={config.groups.length>=10} onClick={()=>{setMessage('');setConfig({...config,active:config.groups.length,groups:[...config.groups,{name:'新词表',terms:[]}]});}}>新增分组</button>
        <button type="button" style={style} disabled={config.groups.length<=1} onClick={()=>{setMessage('');setConfig({...config,active:0,groups:config.groups.filter((_,i)=>i!==config.active)});}}>移除分组</button>
      </div>
      <input aria-label="词表分组名称" maxLength={40} value={config.groups[config.active].name} onChange={e=>updateGroup({name:e.target.value})} style={{...field,marginBottom:8}}/>
      <textarea aria-label="个人词条，每行一个" rows={6} value={config.groups[config.active].terms.join('\n')} onChange={e=>updateGroup({terms:e.target.value.split('\n')})} style={{...field,resize:'vertical'}}/>
      <div style={{display:'flex',alignItems:'center',gap:12,marginTop:8}}><button type="button" style={style} onClick={save}>{busy?'保存中…':'保存词表'}</button><span style={{fontSize:12,opacity:.7}}>{config.groups[config.active].terms.filter(t=>t.trim()).length} / 100 个词条</span></div>
    </fieldset>}
    {message&&<p role="status" style={{fontSize:13}}>{message}</p>}
    <p style={{fontSize:12,opacity:.6}}>词表保存在本机，不随插件发布。启用时，选中组的词条会发送给 Google 辅助识别。没有自动学习或强制文字替换；误识别增多时，可关闭词表后保存进行对比。</p>
  </div>;
}
