import React, {useEffect,useRef,useState} from 'react';
import {appendDraft} from './protocol.mjs';
export const inject=['slots'];
export function apply(ctx){ctx.slots.inject('conversation.input.right',()=>ctx.slots.register({name:'conversation.input.right',id:'gemini-voice',order:10},VoiceSlot));ctx.slots.inject('settings.general.item',()=>ctx.slots.register({name:'settings.general.item',id:'gemini-voice-settings',order:80},VoiceSettings));}
function VoiceSlot(props){return <VoiceButton key={props.sessionId} {...props}/>;}
const style={border:'1px solid #8885',borderRadius:8,padding:'6px 9px',background:'transparent',color:'inherit',cursor:'pointer'};
const iconButton={border:0,background:'transparent',color:'inherit',cursor:'pointer',display:'inline-flex',alignItems:'center',justifyContent:'center',width:26,height:26,padding:5,borderRadius:'50%'};
function Microphone(){return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M6 11v1a6 6 0 0 0 12 0v-1M12 18v3M9 21h6"/></svg>;}
function VoiceButton({useInput,inputActions}){
  const input=useInput(s=>s);
  const [status,setStatus]=useState('idle'),[error,setError]=useState(''),[preview,setPreview]=useState('');
  const session=useRef(null),latest=useRef({input,inputActions});latest.current={input,inputActions};
  const [levels,setLevels]=useState([0,0,0,0,0]);
  function meter(samples){const next=[];for(let b=0;b<5;b++){let sum=0;const from=Math.floor(b*samples.length/5),to=Math.floor((b+1)*samples.length/5);for(let i=from;i<to;i++)sum+=samples[i]*samples[i];const rms=Math.sqrt(sum/(to-from));next.push(Math.min(1,Math.max(0,(Math.sqrt(rms)-0.025)*2.8)));}setLevels(next);}
  const active=!['idle','error'].includes(status);
  function release(s){if(!s)return;s.cancelled=true;clearTimeout(s.timer);s.stream?.getTracks().forEach(t=>t.stop());s.processor?.disconnect();s.source?.disconnect();s.audio?.close().catch(()=>{});s.ws?.close();if(session.current===s)session.current=null;}
  useEffect(()=>()=>release(session.current),[]);
  function insert(text){if(text)latest.current.inputActions.setDraft(appendDraft(latest.current.input.draft,text));}
  function stop(){const s=session.current;if(!s)return;if(status==='connecting'){release(s);setStatus('idle');return;}setStatus('finishing');s.processor?.disconnect();s.source?.disconnect();s.stream?.getTracks().forEach(t=>t.stop());s.audio?.close().catch(()=>{});if(s.ws?.readyState===1)s.ws.send(JSON.stringify({stop:true}));}
  async function start(){
    setError('');setPreview('');setLevels([0,0,0,0,0]);setStatus('connecting');const s={cancelled:false};session.current=s;
    try{
      const response=await fetch('/gemini-voice/config');const config=await response.json();if(!response.ok)throw Error('无法读取语音插件配置');if(!config.configured)throw Error('请到 设置 → 通用 → Gemini 语音输入 配置 API Key');
      if(s.cancelled)return;
      s.audio=new AudioContext({sampleRate:16000});await s.audio.resume();
      s.stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
      if(s.cancelled){release(s);return;}
      if(s.audio.sampleRate!==16000)throw Error('此音频设备不支持 16 kHz 录音');
      s.ws=new WebSocket(config.websocketUrl);
      s.ws.onmessage=event=>{
        if(s.cancelled)return;const msg=JSON.parse(event.data);
        if(msg.error){setError(msg.error);setPreview((msg.final||'')+(msg.interim||''));release(s);setStatus('error');return;}
        if(msg.ready){
          s.source=s.audio.createMediaStreamSource(s.stream);s.processor=s.audio.createScriptProcessor(2048,1,1);
          s.processor.onaudioprocess=e=>{if(s.cancelled||s.ws.readyState!==1)return;if(s.ws.bufferedAmount>320000){setError('网络过慢，录音已停止');release(s);setStatus('error');return;}const samples=e.inputBuffer.getChannelData(0);meter(samples);const pcm=new ArrayBuffer(samples.length*2),view=new DataView(pcm);for(let i=0;i<samples.length;i++)view.setInt16(i*2,Math.max(-1,Math.min(1,samples[i]))*(samples[i]<0?32768:32767),true);s.ws.send(pcm);};
          s.source.connect(s.processor);s.processor.connect(s.audio.destination);setStatus('recording');s.timer=setTimeout(()=>{setError('本段录音已接近 10 分钟，请另起一段');s.processor.disconnect();s.stream.getTracks().forEach(t=>t.stop());s.ws.send(JSON.stringify({stop:true}));setStatus('finishing');},560000);
        }
        if(msg.final!==undefined)setPreview(msg.final+(msg.interim||''));
        if(msg.done){insert(msg.final);setPreview('');release(s);setStatus('idle');}
      };
      s.ws.onerror=()=>{if(!s.cancelled){setError('语音连接失败');release(s);setStatus('error');}};
      s.ws.onclose=()=>{if(!s.cancelled){setError('语音连接中断，已保留预览文字');release(s);setStatus('error');}};
    }catch(e){if(!s.cancelled){setError(e.name==='NotAllowedError'?'请允许 DeepSeek Harness 使用麦克风':e.message);release(s);setStatus('error');}}
  }
  return <div style={{position:'relative',display:'flex',gap:4,alignItems:'center',marginRight:-6}}>
    <style>{`.dsh-voice-control:hover{background:rgba(128,128,128,.16)!important}.dsh-voice-control:focus-visible{outline:2px solid currentColor;outline-offset:2px}.dsh-voice-control:disabled{opacity:.45;cursor:default}@media(prefers-reduced-motion:reduce){.dsh-voice-bar{transition:none!important}}`}</style>
    {active?<div style={{display:'flex',alignItems:'center',gap:4,height:26,border:'1px solid #8885',borderRadius:16,padding:'0 3px 0 9px'}}>
      {status==='recording'?<span aria-hidden="true" style={{display:'flex',gap:3,alignItems:'center',height:20,width:27}}>{levels.map((level,i)=><span className="dsh-voice-bar" key={i} style={{display:'block',width:3,height:3+level*13,borderRadius:2,background:'currentColor',opacity:.48+level*.52,transition:'height 110ms ease-out, opacity 110ms ease-out'}}/>)}</span>:<span role="status" style={{fontSize:12,paddingRight:4,whiteSpace:'nowrap'}}>{status==='connecting'?'连接中…':'转写中…'}</span>}
      <button className="dsh-voice-control" style={{...iconButton,width:23,height:23}} type="button" aria-label={status==='connecting'?'取消连接':'停止 Gemini 语音输入'} title={status==='connecting'?'取消连接':'停止录音并填入文字'} disabled={status==='finishing'} onClick={stop}><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="10" height="10" rx="1.4"/></svg></button>
    </div>:<button className="dsh-voice-control" style={iconButton} type="button" aria-label="开始 Gemini 语音输入" title="语音输入" disabled={input.phase!=='plain'} onClick={start}><Microphone/></button>}
    {(error||(!active&&preview))&&<div style={{position:'absolute',bottom:40,right:0,width:330,maxHeight:280,overflow:'auto',padding:14,borderRadius:12,background:'var(--dsw-alias-bg-base, #202127)',color:'var(--dsw-alias-label-primary, #eee)',boxShadow:'0 4px 24px #0005',zIndex:1000}}>
      <strong>Gemini 实时语音输入</strong>
      {preview&&<p style={{whiteSpace:'pre-wrap'}}>{preview}</p>}
      {error&&<p role="alert" style={{color:'#ffb1a7'}}>{error}</p>}
      {!active&&preview&&<button style={style} onClick={()=>{insert(preview);setPreview('');setError('');setStatus('idle');}}>将保留的文字放入输入框</button>}
      {!active&&error&&<button style={style} onClick={()=>{setError('');setStatus('idle');}}>关闭提示</button>}
    </div>}
  </div>;
}
function VoiceSettings(){
  const [configured,setConfigured]=useState(null),[key,setKey]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
  useEffect(()=>{let live=true;fetch('/gemini-voice/config').then(async r=>{if(!r.ok)throw Error();return r.json();}).then(c=>{if(live)setConfigured(c.configured);}).catch(()=>{if(live)setMessage('无法读取配置，请重新打开设置');});return()=>{live=false;};},[]);
  async function save(e){e.preventDefault();setBusy(true);setMessage('');try{const r=await fetch('/gemini-voice/config',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({apiKey:key})});const data=await r.json();if(!r.ok)throw Error(data.error||'保存失败');setKey('');setConfigured(true);setMessage('已保存');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
  return <section aria-label="Gemini 语音输入" style={{padding:'20px 0',borderTop:'1px solid #8883'}}>
    <div style={{fontWeight:600,marginBottom:8}}>Gemini 语音输入</div>
    <p style={{fontSize:13,opacity:.7,margin:'0 0 12px'}}>{configured===null?'正在读取配置…':configured?'API Key 已配置，可以直接使用麦克风。仅更换密钥时需要输入。':'尚未配置，请填写 Google AI Studio 的 API Key。'}</p>
    <form onSubmit={save} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      <input aria-label="Gemini API Key" type="password" autoComplete="off" placeholder={configured?'输入新的 API Key 以更换':'输入 Gemini API Key'} value={key} onChange={e=>setKey(e.target.value)} style={{flex:'1 1 240px',minWidth:0,border:'1px solid #8885',borderRadius:8,padding:'8px 10px',background:'transparent',color:'inherit'}}/>
      <button style={{...style,opacity:(busy||!key.trim())?.5:1}} disabled={busy||!key.trim()} type="submit">{busy?'保存中…':'保存'}</button>
    </form>
    {message&&<p role="status" style={{fontSize:13}}>{message}</p>}
    <p style={{fontSize:12,opacity:.6,margin:'10px 0 0'}}>密钥保存在本机。录音发送至 Google 进行转写，使用 Gemini API 项目的额度。</p>
  </section>;
}
