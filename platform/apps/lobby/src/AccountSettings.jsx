import React,{useEffect,useState}from'react';import{X,Key,Mail,Shield,Clock,Monitor,XCircle,Download,Trash2,AlertTriangle,Link2,Unlink}from'lucide-react';import{api,apiBase}from'./api';import{track}from'./analytics';import'./account-settings.css';

export function AccountSettings({onClose}){
  const[tab,setTab]=useState('security');
  return <div className="modal accountModal" role="dialog" aria-modal="true"><div className="accountCard settingsCard"><button className="close" onClick={onClose} aria-label="Close"><X/></button><h2>Account Settings</h2><div className="settingsTabs"><button className={tab==='security'?'active':''} onClick={()=>setTab('security')}><Key/>Security</button><button className={tab==='devices'?'active':''} onClick={()=>setTab('devices')}><Monitor/>Devices</button><button className={tab==='privacy'?'active':''} onClick={()=>setTab('privacy')}><Shield/>Privacy</button><button className={tab==='danger'?'active':''} onClick={()=>setTab('danger')}><AlertTriangle/>Danger Zone</button></div>{tab==='security'&&<SecurityTab/>}{tab==='devices'&&<DevicesTab/>}{tab==='privacy'&&<PrivacyTab/>}{tab==='danger'&&<DangerTab/>}</div></div>}

function SecurityTab(){
  const[mode,setMode]=useState('change'),[msg,setMsg]=useState(''),[msgType,setMsgType]=useState('');
  const[curPwd,setCurPwd]=useState(''),[newPwd,setNewPwd]=useState(''),[confirmPwd,setConfirmPwd]=useState('');
  const[email,setEmail]=useState(''),[newEmail,setNewEmail]=useState('');
  const[hasPassword,setHasPassword]=useState(true); // OAuth-only accounts SET a first password
  useEffect(()=>{api.linkedAccounts().then(d=>setHasPassword(d.hasPassword)).catch(()=>{})},[]);

  const sendMsg=(text,type)=>{setMsg(text);setMsgType(type);setTimeout(()=>setMsg(''),4000)};

  const handleChangePwd=async()=>{
    if(newPwd.length<10)return sendMsg('Password must be at least 10 characters','error');
    if(newPwd!==confirmPwd)return sendMsg('Passwords do not match','error');
    try{await api.changePassword(hasPassword?{currentPassword:curPwd,newPassword:newPwd}:{newPassword:newPwd});sendMsg(hasPassword?'Password changed successfully':'Password set successfully','success');setCurPwd('');setNewPwd('');setConfirmPwd('');setHasPassword(true)}
    catch(e){sendMsg(e.message==='invalid_current_password'?'Current password is incorrect':'Password change failed','error')}
  };
  
  const handleResetPwd=async()=>{
    if(!email||!email.includes('@'))return sendMsg('Enter a valid email','error');
    try{await api.requestPasswordReset({email});sendMsg('Reset link sent. Check your inbox (demo: no real email sent)','success')}
    catch(e){sendMsg('Reset request failed','error')}
  };
  
  const handleVerifyEmail=async()=>{
    if(!newEmail||!newEmail.includes('@'))return sendMsg('Enter a valid email','error');
    try{await api.requestEmailVerify({email:newEmail});sendMsg('Verification link sent. Check your inbox (demo: no real email sent)','success')}
    catch(e){sendMsg(e.message==='email_exists'?'That email is already in use':'Verification request failed','error')}
  };
  
  return <div className="secTab"><h3>Security</h3>
    <div className="secSection"><h4>{hasPassword?'Change Password':'Set Password'}</h4>
      {!hasPassword&&<p className="secHint">Your account uses social login. Set a password to also sign in with email.</p>}
      {hasPassword&&<input placeholder="Current password" type="password" value={curPwd} onChange={e=>setCurPwd(e.target.value)}/>}<input placeholder="New password (min 10 chars)" type="password" value={newPwd} onChange={e=>setNewPwd(e.target.value)}/><input placeholder="Confirm new password" type="password" value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)}/>
      <button className="join" onClick={handleChangePwd}>{hasPassword?'Update Password':'Set Password'}</button></div>
    <div className="secSection"><h4>Reset Password</h4><p className="secHint">Receive a password reset link via email</p><input placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)}/><button className="join" onClick={handleResetPwd}>Send Reset Link</button></div>
    <div className="secSection"><h4>Verify Email</h4><p className="secHint">Update and verify your email address</p><input placeholder="New email" value={newEmail} onChange={e=>setNewEmail(e.target.value)}/><button className="join" onClick={handleVerifyEmail}>Send Verification</button></div>
    <LinkedAccounts/>
    {msg&&<p className={`secMsg ${msgType}`}>{msg}</p>}</div>}

// Social-login connections. Renders only when providers are configured. Lets the
// player link a new provider (redirect with intent=link) or unlink one — the API
// blocks unlinking the last remaining login method.
function LinkedAccounts(){
  const[data,setData]=useState(null),[msg,setMsg]=useState('');
  const load=()=>api.linkedAccounts().then(setData).catch(()=>setData(null));
  useEffect(()=>{load()},[]);
  if(!data||!data.available||data.available.length===0)return null;
  const linkedIds=new Set(data.linked.map(l=>l.provider));
  const label=id=>id.charAt(0).toUpperCase()+id.slice(1);
  const unlink=async(p)=>{try{await api.unlinkAccount(p);setMsg('');await load()}catch(e){setMsg(e.message==='last_login_method'?'Set a password before unlinking your only login method':'Unlink failed')}};
  const link=(p)=>{window.location.href=`${apiBase}/auth/oauth/${encodeURIComponent(p)}/start?intent=link`};
  return <div className="secSection"><h4>Linked accounts</h4><p className="secHint">Connect a social login for faster sign-in.</p>
    {data.linked.map(l=><div key={l.provider} className="linkRow"><span><Link2 size={15}/> <b>{label(l.provider)}</b>{l.email&&<small>{l.email}</small>}</span><button className="textBtn" onClick={()=>unlink(l.provider)}><Unlink size={14}/> Unlink</button></div>)}
    {data.available.filter(p=>!linkedIds.has(p)).map(p=><div key={p} className="linkRow"><span><Link2 size={15}/> {label(p)}</span><button className="textBtn" onClick={()=>link(p)}>Link</button></div>)}
    {msg&&<p className="secMsg error">{msg}</p>}</div>;
}

function DevicesTab(){
  const[devices,setDevices]=useState([]),[loading,setLoading]=useState(true),[msg,setMsg]=useState('');
  
  useEffect(()=>{let live=true;api.devices().then(d=>{if(live){setDevices(d.devices||[]);setLoading(false)}}).catch(()=>{if(live)setLoading(false)});return()=>{live=false}},[]);
  
  const handleRevoke=async(id)=>{
    try{await api.revokeDevice(id);setDevices(prev=>prev.filter(d=>d.session_id!==id));setMsg('Device revoked')}
    catch(e){setMsg('Failed to revoke device')}
  };
  
  const handleRevokeOthers=async()=>{
    try{await api.revokeOthers();setDevices([]);setMsg('All other devices revoked')}
    catch(e){setMsg('Failed to revoke devices')}
  };
  
  return <div className="secTab"><h3>Active Devices</h3>
    {msg&&<p className="secMsg success">{msg}</p>}
    {loading?<p>Loading...</p>:<>{devices.length?devices.map(d=><div key={d.session_id} className="deviceItem"><div><b>{d.device_name}</b><small>{d.ip||'Unknown IP'}</small><small>Active {new Date(d.last_active).toLocaleString()}</small></div><button className="textBtn" onClick={()=>handleRevoke(d.session_id)}>Revoke</button></div>):<p className="emptyHint">No other active devices</p>}</>}
    {devices.length>1&&<button className="join" onClick={handleRevokeOthers}>Revoke All Others</button>}</div>}

function PrivacyTab(){
  const[msg,setMsg]=useState('');
  useEffect(()=>{api.exportStatus().then(s=>{if(s.status==='pending')setMsg('Export request pending. Check your email when ready.')}).catch(()=>{})},[]);
  
  const handleExport=async()=>{
    try{await api.requestExport();setMsg('Export request submitted. You will receive an email when ready.')}
    catch(e){setMsg('Export request failed')}
  };
  
  return <div className="secTab"><h3>Privacy</h3>
    <div className="secSection"><h4>Download Your Data</h4><p className="secHint">Request a copy of your account data including profile, wallet history, favorites, and game rounds.</p><button className="join" onClick={handleExport}>Request Data Export</button></div>
    {msg&&<p className="secMsg success">{msg}</p>}</div>}

function DangerTab(){
  const[confirm,setConfirm]=useState(''),[pwd,setPwd]=useState(''),[msg,setMsg]=useState('');

  const handleDelete=async()=>{
    if(confirm!=='DELETE MY ACCOUNT')return setMsg('Type exactly as shown');
    if(!pwd)return setMsg('Enter your password to confirm');
    try{await api.deleteAccount(pwd);window.location.href='/';}
    catch(e){setMsg(e.message==='invalid_password'?'Password is incorrect':'Account deletion failed')}
  };

  return <div className="secTab dangerTab"><h3>Danger Zone</h3>
    <div className="secSection dangerSection"><h4>Delete Account</h4><p className="secHint">Removes your profile and sign-in access. Anonymised gameplay records are retained. This action cannot be undone.</p>
      <input type="password" placeholder="Current password" value={pwd} onChange={e=>setPwd(e.target.value)}/>
      <input placeholder="Type DELETE MY ACCOUNT to confirm" value={confirm} onChange={e=>setConfirm(e.target.value)}/>
      <button className="join danger" onClick={handleDelete} disabled={confirm!=='DELETE MY ACCOUNT'||!pwd}>Delete My Account</button></div>
    {msg&&<p className="secMsg error">{msg}</p>}</div>}