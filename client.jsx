import React, {useEffect,useState} from 'react';
import {IconMicrophoneOutlineRegular} from '@deepseek-ai/dsh-client-ui-primitives';
export const inject=['slots'];
export function apply(ctx){ctx.effect(()=>{const sheet=document.createElement('style');sheet.textContent='[role="dialog"] nav button:has([data-gemini-voice-nav]) > svg{display:none}';document.head.appendChild(sheet);return()=>sheet.remove();});ctx.slots.inject('settings.section',()=>ctx.slots.register({name:'settings.section',id:'gemini-voice',order:5,label:()=> <span data-gemini-voice-nav="" style={{display:'inline-flex',alignItems:'center',gap:8}}><IconMicrophoneOutlineRegular size={16}/><span>语音</span></span>},VoiceSettings));}
const style={border:'1px solid #8885',borderRadius:8,padding:'6px 9px',background:'transparent',color:'inherit',cursor:'pointer'};
function VoiceSettings(){
  const [configured,setConfigured]=useState(null),[key,setKey]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{let live=true;fetch('/gemini-voice/config').then(async r=>{if(!r.ok)throw Error();return r.json();}).then(c=>{if(live)setConfigured(c.configured);}).catch(()=>{if(live)setMessage('无法读取配置，请重新打开设置');});return()=>{live=false;};},[]);
  async function save(e){e.preventDefault();setBusy(true);setMessage('');try{const r=await fetch('/gemini-voice/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({apiKey:key})});const data=await r.json();if(!r.ok)throw Error(data.error||'保存失败');setKey('');setConfigured(true);setMessage('已保存');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  return <section aria-label="语音设置" style={{padding:'8px 0 24px'}}>
    <h2 style={{fontSize:18,fontWeight:600,margin:'0 0 20px'}}>语音</h2><div style={{fontWeight:600,marginBottom:8}}>Gemini API Key</div>
    <p style={{fontSize:13,opacity:.7,margin:'0 0 12px'}}>{configured===null?'正在读取配置…':configured?'API Key 已配置，可以直接使用麦克风。仅更换密钥时需要输入。':'尚未配置，请填写 Google AI Studio 的 API Key。'}</p>
    <form onSubmit={save} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <input aria-label="Gemini API Key" type="password" autoComplete="off" placeholder={configured?'输入新的 API Key 以更换':'输入 Gemini API Key'} value={key} onChange={e=>setKey(e.target.value)} style={{flex:'1 1 240px',minWidth:0,border:'1px solid #8885',borderRadius:8,padding:'8px 10px',background:'transparent',color:'inherit'}}/>
      <button style={{...style,opacity:(busy||!key.trim())?.5:1}} disabled={busy||!key.trim()} type="submit">{busy?'保存中…':'保存'}</button>
    </form>
    {message&&<p role="status" style={{fontSize:13}}>{message}</p>}
    <p style={{fontSize:12,opacity:.6,margin:'10px 0 0'}}>密钥保存在本机。录音发送至 Google 进行转写，使用 Gemini API 项目的额度。</p>
    <VocabularySettings/>
  </section>;
}
function VocabularySettings(){
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
