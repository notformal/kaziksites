import React,{useEffect,useState}from'react';import{X,Clock,Shield,AlertTriangle,CheckCircle,Info}from'lucide-react';import{api}from'./api';import'./responsible-play.css';

export function ResponsiblePlay({onClose}){
  const[data,setData]=useState(null),[loading,setLoading]=useState(true),[msg,setMsg]=useState(''),[msgType,setMsgType]=useState('');
  const[dailyLossLimit,setDailyLossLimit]=useState('');
  const[dailyWagerLimit,setDailyWagerLimit]=useState('');
  const[coolingOff,setCoolingOff]=useState('');
  const[selfExclude,setSelfExclude]=useState('');
  
  useEffect(()=>{let live=true;api.responsiblePlay().then(d=>{if(live){setData(d);setDailyLossLimit(d.dailyLossLimit??'');setDailyWagerLimit(d.dailyWagerLimit??'');setCoolingOff('');setSelfExclude('');setLoading(false)}}).catch(()=>setLoading(false));return()=>{live=false}},[]);
  
  const sendMsg=(text,type)=>{setMsg(text);setMsgType(type);setTimeout(()=>setMsg(''),4000)};
  
  const handleSave=async()=>{
    setLoading(true);
    try{
      await api.updateResponsiblePlay({
        dailyLossLimit:dailyLossLimit?parseInt(dailyLossLimit):null,
        dailyWagerLimit:dailyWagerLimit?parseInt(dailyWagerLimit):null,
        coolingOffHours:coolingOff?parseInt(coolingOff):null,
        selfExclusionHours:selfExclude?parseInt(selfExclude):null,
      });
      sendMsg('Settings saved successfully','success');
      const updated=await api.responsiblePlay();
      setData(updated);
      setCoolingOff('');setSelfExclude('');
    }catch(e){sendMsg('Failed to save settings','error')}
    finally{setLoading(false)}
  };
  
  return <div className="modal accountModal" role="dialog" aria-modal="true"><div className="accountCard respCard"><button className="close" onClick={onClose} aria-label="Close"><X/></button><Shield className="respIcon"/><small>RESPONSIBLE PLAY</small><h2>Play Responsibly</h2>
    <p className="respDesc">Set limits to control your virtual credit gaming. These limits are enforced server-side and cannot be bypassed.</p>
    {msg&&<p className={`respMsg ${msgType}`}>{msg}</p>}
    {loading&&!data?<p>Loading...</p>:data&&<><div className="respSection"><h4>Daily Loss Limit</h4><p className="respHint">Maximum net loss allowed per day. Set to 0 or leave empty to disable.</p><div className="respRow"><input type="number" min="0" placeholder="No limit" value={dailyLossLimit} onChange={e=>setDailyLossLimit(e.target.value)}/><span>credits</span></div></div>
    <div className="respSection"><h4>Daily Wager Limit</h4><p className="respHint">Maximum total amount you can bet per day. Set to 0 or leave empty to disable.</p><div className="respRow"><input type="number" min="0" placeholder="No limit" value={dailyWagerLimit} onChange={e=>setDailyWagerLimit(e.target.value)}/><span>credits</span></div></div>
    <div className="respSection"><h4>Cooling-Off Period</h4><p className="respHint">Temporarily pause all gameplay. You can set this even if currently excluded.</p><div className="respRow"><select value={coolingOff} onChange={e=>setCoolingOff(e.target.value)}><option value="">Disable</option><option value="1">1 hour</option><option value="6">6 hours</option><option value="24">24 hours</option><option value="168">1 week</option><option value="720">1 month</option></select><span>hours</span></div></div>
    <div className="respSection"><h4>Self-Exclusion</h4><p className="respHint">Longer break from all gameplay. Cannot be unset during the period.</p><div className="respRow"><select value={selfExclude} onChange={e=>setSelfExclude(e.target.value)}><option value="">Disable</option><option value="168">1 week</option><option value="720">1 month</option><option value="2160">3 months</option><option value="4320">6 months</option><option value="15768">1 year</option></select><span>hours</span></div></div>
    {data.coolingOffUntil&&new Date(data.coolingOffUntil)>new Date()&&<div className="respAlert cooling"><Clock/><span>You are in a cooling-off period until {new Date(data.coolingOffUntil).toLocaleString()}. No gameplay allowed.</span></div>}
    {data.selfExcludedUntil&&new Date(data.selfExcludedUntil)>new Date()&&<div className="respAlert excluded"><AlertTriangle/><span>You are self-excluded until {new Date(data.selfExcludedUntil).toLocaleString()}. No gameplay allowed.</span></div>}
    <button className="join wide" onClick={handleSave} disabled={loading}>{loading?'SAVING...':'SAVE LIMITS'}</button></>}</div></div>};

export function ResponsibleCheckBanner({onCheck}){
  const[status,setStatus]=useState(null),[loading,setLoading]=useState(true);
  useEffect(()=>{let live=true;setLoading(true);api.responsiblePlayCheck().then(s=>{if(live){setStatus(s);setLoading(false);onCheck?.(s)}}).catch(()=>{if(live){setStatus({allowed:true});setLoading(false)}});return()=>{live=false}},[onCheck]);
  if(loading||!status||status.allowed)return null;
  return <div className="respBanner" role="alert"><AlertTriangle/><div><b>Gameplay Restricted</b><small>{status.reason==='cooling_off'?'Cooling-off period active until '+new Date(status.coolingOffUntil).toLocaleString():status.reason==='self_excluded'?'Self-exclusion active until '+new Date(status.selfExcludedUntil).toLocaleString():status.reason==='daily_loss_limit'?'Daily loss limit reached. Limit: '+status.limit.toLocaleString()+' credits, current loss: '+status.currentLoss.toLocaleString()+' credits':status.reason==='daily_wager_limit'?'Daily wager limit reached. Limit: '+status.limit.toLocaleString()+' credits, current wager: '+status.currentWager.toLocaleString()+' credits':'Gameplay temporarily restricted'}</small></div><button onClick={()=>onCheck?.(status)}>OK</button></div>}