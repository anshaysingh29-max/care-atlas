'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, ShieldCheck, UserCog } from 'lucide-react';

export default function AdminAuthForm(){
  const router = useRouter();
  const [showPassword,setShowPassword]=useState(false);
  const [form,setForm]=useState({email:'',password:''});
  const [submitted,setSubmitted]=useState(false);

  function submit(e){
    e.preventDefault();
    if(typeof window!=='undefined') window.sessionStorage.setItem('careatlas-demo-admin',JSON.stringify({email:form.email,role:'operations_admin'}));
    setForm(prev=>({...prev,password:''}));
    setSubmitted(true);
  }

  if(submitted) return <div className="auth-success admin-auth-success"><span className="auth-success-icon"><UserCog size={28}/></span><span className="eyebrow">OPERATIONS ACCESS READY</span><h2>CareAtlas demo workspace is ready.</h2><p>This static preview stores no real staff password and contains fictional case data only.</p><button className="button full-button" type="button" onClick={()=>router.push('/admin')}>Open operations console <ArrowRight size={17}/></button></div>;

  return <form className="auth-form" onSubmit={submit}>
    <div className="auth-form-heading"><span className="eyebrow"><UserCog size={15}/> OPERATIONS SIGN IN</span><h1>Run the medical travel network.</h1><p>Coordinate patients, hospitals, treatment plans and marketplace content from one workspace.</p></div>
    <div className="prototype-banner"><ShieldCheck size={17}/><div><strong>Static prototype mode</strong><span>Use demo credentials only. Nothing is transmitted to a server.</span></div></div>
    <label className="field-label"><span>CareAtlas work email</span><input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="ops@careatlas.example"/></label>
    <label className="field-label"><span>Password</span><div className="password-field"><input required minLength={6} type={showPassword?'text':'password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Temporary demo password"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
    <button className="button full-button auth-submit" type="submit">Continue to operations <ArrowRight size={17}/></button>
    <p className="auth-switch">Hospital partner? <a href="/hospital-login">Open hospital sign in</a></p>
  </form>;
}
