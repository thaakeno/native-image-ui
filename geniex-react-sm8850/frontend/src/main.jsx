import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const native = () => window.Native;

function Icon({ name, size = 20 }) {
  const p = {
    down: <path d="m6 9 6 6 6-6"/>, image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-4.2-4.2a2 2 0 0 0-2.8 0L6 19"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>, stop:<rect x="6" y="6" width="12" height="12" rx="2"/>,
    settings:<><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/><circle cx="12" cy="12" r="4"/></>,
    bolt:<path d="m13 2-9 12h7l-1 8 9-12h-7Z"/>, chip:<><rect x="5" y="5" width="14" height="14" rx="3"/><path d="M9 9h6v6H9zM9 1v4M15 1v4M9 19v4M15 19v4M19 9h4M19 15h4M1 9h4M1 15h4"/></>,
    close:<><path d="M18 6 6 18"/><path d="m6 6 12 12"/></>, trash:<><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></>,
    download:<><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/></>, check:<path d="m20 6-11 11-5-5"/>,
    spark:<><path d="m12 3-1.7 4.3L6 9l4.3 1.7L12 15l1.7-4.3L18 9l-4.3-1.7Z"/><path d="m5 15-.8 2.2L2 18l2.2.8L5 21l.8-2.2L8 18l-2.2-.8Z"/></>
  }[name];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p}</svg>;
}

function formatMs(v) { if (v == null || !Number.isFinite(Number(v))) return '—'; const n=Number(v); return n < 1000 ? `${Math.round(n)} ms` : `${(n/1000).toFixed(2)} s`; }
function formatRate(v) { if (v == null || !Number.isFinite(Number(v))) return '—'; return `${Number(v).toFixed(1)} tok/s`; }

function App() {
  const [models,setModels]=useState([]);
  const [activeId,setActiveId]=useState('qwen3-vl-4b-npu');
  const [loadedId,setLoadedId]=useState('');
  const [device,setDevice]=useState({model:'POCO F8 Ultra',chipset:'SM8850',hexagon:'v81'});
  const [status,setStatus]=useState({kind:'idle',text:'Initializing GenieX…'});
  const [download,setDownload]=useState({});
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState('');
  const [image,setImage]=useState(null);
  const [generating,setGenerating]=useState(false);
  const [metrics,setMetrics]=useState(null);
  const [modelSheet,setModelSheet]=useState(false);
  const [settingsSheet,setSettingsSheet]=useState(false);
  const [fastVision,setFastVision]=useState(true);
  const [maxTokens,setMaxTokens]=useState(256);
  const scroller=useRef(null);
  const textarea=useRef(null);

  const active=useMemo(()=>models.find(m=>m.id===activeId) || models[0], [models,activeId]);
  const loaded=useMemo(()=>models.find(m=>m.id===loadedId), [models,loadedId]);

  useEffect(()=>{ native()?.bootstrap?.(); },[]);
  useEffect(()=>{ scroller.current?.scrollTo({top:scroller.current.scrollHeight,behavior:generating?'auto':'smooth'}); },[messages,generating,image]);

  useEffect(()=>{
    window.__GENIEX_EVENT = raw => {
      let e; try { e = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return; }
      if (e.type==='bootstrap') {
        setModels(e.models || []); setDevice(e.device || device); setStatus({kind:'ready',text:e.message || 'Ready'});
        if (e.defaultModel) setActiveId(e.defaultModel);
        if (e.loadedModel) setLoadedId(e.loadedModel);
      } else if (e.type==='modelState') {
        if (e.modelId) setModels(ms=>ms.map(m=>m.id===e.modelId?{...m,installed:!!e.installed}:m));
        if (e.loaded) setLoadedId(e.modelId || '');
        setStatus({kind:e.state||'ready',text:e.message||''});
      } else if (e.type==='download') {
        setDownload(d=>({...d,[e.modelId]:e}));
        if (e.done) setModels(ms=>ms.map(m=>m.id===e.modelId?{...m,installed:true}:m));
      } else if (e.type==='image') {
        setImage({preview:e.preview,name:e.name||'image',width:e.width,height:e.height});
      } else if (e.type==='generationStart') {
        setGenerating(true); setMetrics(null);
        setMessages(ms=>[...ms,{role:'assistant',text:'',streaming:true,id:`a-${Date.now()}`}]);
      } else if (e.type==='token') {
        setMessages(ms=>{
          if (!ms.length) return ms;
          const copy=ms.slice(); const last=copy[copy.length-1];
          if (last.role==='assistant') copy[copy.length-1]={...last,text:last.text+(e.text||'')};
          return copy;
        });
      } else if (e.type==='generationDone') {
        setGenerating(false); setMetrics(e.profile||null);
        setMessages(ms=>ms.map((m,i)=>i===ms.length-1&&m.role==='assistant'?{...m,streaming:false}:m));
      } else if (e.type==='cleared') {
        setMessages([]); setMetrics(null); setImage(null);
      } else if (e.type==='error') {
        setGenerating(false); setStatus({kind:'error',text:e.message||'Something went wrong'});
        setMessages(ms=>{ const c=ms.slice(); if(c.at(-1)?.role==='assistant' && !c.at(-1)?.text) c.pop(); return c; });
      }
    };
    return ()=>{ delete window.__GENIEX_EVENT; };
  },[]);

  function pickImage(){ native()?.pickImage?.(); }
  function clearImage(){ setImage(null); native()?.clearImage?.(); }
  function ensureAndLoad(id){ setActiveId(id); const m=models.find(x=>x.id===id); if(!m) return; if(m.installed) native()?.loadModel?.(id); else native()?.downloadModel?.(id); setModelSheet(false); }
  function send(){
    if(generating) return;
    const text=input.trim() || (image ? 'Describe this image in detail.' : '');
    if(!text) return;
    if(!loadedId){ setModelSheet(true); return; }
    const img=image;
    setMessages(ms=>[...ms,{role:'user',text,image:img?.preview||null,id:`u-${Date.now()}`}]);
    setInput(''); setImage(null);
    native()?.send?.(text,!!img,fastVision,maxTokens);
    if(textarea.current) textarea.current.style.height='24px';
  }
  function onInput(e){ setInput(e.target.value); e.target.style.height='24px'; e.target.style.height=`${Math.min(132,e.target.scrollHeight)}px`; }
  function onKey(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } }

  const empty=messages.length===0;
  return <div className="app">
    <header className="topbar">
      <div className="brand"><div className="brandMark"><Icon name="spark" size={18}/></div><div><div className="brandTitle">GenieX Vision</div><div className="brandSub">on-device · {device.chipset || 'SM8850'}</div></div></div>
      <button className="modelButton" onClick={()=>setModelSheet(true)}>
        <span className="modelButtonText">{loaded?.shortName || active?.shortName || 'Choose model'}</span>
        <span className={`dot ${loadedId?'live':''}`}/><Icon name="down" size={16}/>
      </button>
      <button className="iconButton" onClick={()=>setSettingsSheet(true)} aria-label="Settings"><Icon name="settings"/></button>
    </header>

    <main className="chat" ref={scroller}>
      {empty && <section className="hero">
        <div className="heroGlow"/>
        <div className="heroIcon"><Icon name="bolt" size={28}/></div>
        <h1>Vision, directly on your NPU.</h1>
        <p>Built around your POCO F8 Ultra. Qwen3-VL-4B runs through QAIRT on the Snapdragon 8 Elite Gen 5 Hexagon NPU.</p>
        <div className="hardwareRow"><span><Icon name="chip" size={15}/> SM8850</span><span>Hexagon v81</span><span>W4A16</span><span>512² vision</span></div>
        {loadedId ? <button className="readyCard"><span className="readyPulse"/><div><b>{loaded?.name || 'Model loaded'}</b><small>NPU session is warm and ready</small></div><Icon name="check" size={18}/></button> :
          <button className="primaryCard" onClick={()=>ensureAndLoad('qwen3-vl-4b-npu')}><div className="primaryCardIcon"><Icon name="download"/></div><div><b>Get Qwen3-VL-4B NPU</b><small>Hardware-optimized QAIRT bundle for SM8850</small></div><span>Set up</span></button>}
        <div className="quickGrid">
          <button onClick={pickImage}><Icon name="image"/><b>Analyze image</b><small>Gallery or screenshot</small></button>
          <button onClick={()=>{setInput('What can you do on-device?'); textarea.current?.focus();}}><Icon name="bolt"/><b>Ask locally</b><small>No cloud required</small></button>
        </div>
      </section>}
      <div className="messageList">
        {messages.map(m=><div key={m.id} className={`messageRow ${m.role}`}>
          {m.role==='assistant' && <div className="assistantAvatar"><Icon name="spark" size={15}/></div>}
          <div className="messageBody">
            {m.image && <img className="messageImage" src={m.image} alt="Attachment"/>}
            <div className="messageText">{m.text || (m.streaming?<span className="thinking"><i/><i/><i/></span>:'')}</div>
          </div>
        </div>)}
      </div>
      {metrics && <div className="metricsBar">
        <span><small>vision</small>{formatMs(metrics.mediaMs)}</span><span><small>TTFT</small>{formatMs(metrics.ttftMs)}</span><span><small>prefill</small>{formatRate(metrics.prefillSpeed)}</span><span><small>decode</small>{formatRate(metrics.decodingSpeed)}</span>
      </div>}
      <div className="bottomSpacer"/>
    </main>

    <div className="composerWrap">
      {status.text && status.kind!=='ready' && <div className={`statusPill ${status.kind}`}><span className="statusSpinner"/>{status.text}</div>}
      {image && <div className="attachment"><img src={image.preview}/><div><b>{image.name}</b><small>{image.width}×{image.height} · prepared</small></div><button onClick={clearImage}><Icon name="close" size={17}/></button></div>}
      <div className="composer">
        <button className="attach" onClick={pickImage} disabled={generating}><Icon name="image"/></button>
        <textarea ref={textarea} rows="1" value={input} onInput={onInput} onKeyDown={onKey} placeholder={image?'Ask about this image…':'Message locally…'}/>
        {generating ? <button className="send stop" onClick={()=>native()?.stop?.()}><Icon name="stop" size={18}/></button> : <button className="send" onClick={send} disabled={!input.trim()&&!image}><Icon name="send" size={18}/></button>}
      </div>
      <div className="composerMeta"><span><i className="privacyDot"/>100% on-device</span><span>{loaded?.backend || 'GenieX'}{fastVision && image?' · Vision Turbo':''}</span></div>
    </div>

    {modelSheet && <Sheet onClose={()=>setModelSheet(false)} title="Models" subtitle="Optimized first for your POCO F8 Ultra">
      <div className="sectionLabel">NPU optimized</div>
      {models.filter(m=>m.backend==='QAIRT').map(m=><ModelCard key={m.id} m={m} active={loadedId===m.id} progress={download[m.id]} onPick={()=>ensureAndLoad(m.id)}/>)}
      <div className="sectionLabel withTop">Community GGUF</div>
      {models.filter(m=>m.backend!=='QAIRT').map(m=><ModelCard key={m.id} m={m} active={loadedId===m.id} progress={download[m.id]} onPick={()=>ensureAndLoad(m.id)}/>)}
    </Sheet>}

    {settingsSheet && <Sheet onClose={()=>setSettingsSheet(false)} title="Performance" subtitle={`${device.model || 'POCO F8 Ultra'} · ${device.chipset || 'SM8850'}`}>
      <div className="settingCard"><div><b>Vision Turbo</b><small>Reset KV state for a fresh image so old chat history doesn't slow image TTFT.</small></div><Switch value={fastVision} onChange={v=>{setFastVision(v); native()?.setFastVision?.(v);}}/></div>
      <div className="settingCard vertical"><div className="settingHeader"><div><b>Max output</b><small>Doesn't affect vision encoding; lower is snappier for short analyses.</small></div><strong>{maxTokens}</strong></div><input type="range" min="64" max="1024" step="64" value={maxTokens} onChange={e=>setMaxTokens(Number(e.target.value))}/></div>
      <div className="infoCard"><span><Icon name="chip" size={18}/></span><div><b>SM8850 fast path</b><small>QAIRT · Hexagon NPU · W4A16 · model stays resident between turns. GGUF fallback uses GenieX hybrid HTP + CPU scheduling.</small></div></div>
      <button className="dangerRow" onClick={()=>{native()?.clearChat?.();setSettingsSheet(false)}}><Icon name="trash" size={18}/>Clear conversation</button>
    </Sheet>}
  </div>;
}

function ModelCard({m,active,progress,onPick}){
  const pct=progress?.percent ?? 0; const downloading=progress && !progress.done && !progress.error;
  return <button className={`modelCard ${active?'active':''}`} onClick={onPick} disabled={downloading}>
    <div className="modelIcon">{m.backend==='QAIRT'?<Icon name="bolt"/>:<Icon name="chip"/>}</div>
    <div className="modelInfo"><div className="modelName"><b>{m.name}</b>{m.recommended&&<em>Best</em>}</div><small>{m.description}</small><div className="tags"><span>{m.backend}</span><span>{m.quant}</span>{m.params&&<span>{m.params}</span>}</div>{downloading&&<div className="progress"><i style={{width:`${pct}%`}}/></div>}</div>
    <div className="modelAction">{active?<span className="activeCheck"><Icon name="check" size={16}/></span>:downloading?<strong>{pct}%</strong>:<span>{m.installed?'Load':'Get'}</span>}</div>
  </button>;
}
function Switch({value,onChange}){ return <button className={`switch ${value?'on':''}`} onClick={()=>onChange(!value)}><i/></button>; }
function Sheet({title,subtitle,onClose,children}){ return <div className="sheetBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="sheet"><div className="sheetHandle"/><header><div><h2>{title}</h2><p>{subtitle}</p></div><button onClick={onClose}><Icon name="close"/></button></header><div className="sheetContent">{children}</div></section></div>; }

createRoot(document.getElementById('root')).render(<App/>);
