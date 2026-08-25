'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, MessageCircle, ShieldCheck } from 'lucide-react';
import PartnerShell from '@/components/PartnerShell';
import { buildPartnerReferralUrl, getPartnerProfile } from '@/lib/firebase/partners';

const presets = [
  ['general', 'General'],
  ['whatsapp', 'WhatsApp'],
  ['community', 'Community'],
  ['orthopedics', 'Orthopedics'],
  ['cardiac', 'Cardiac']
];

export default function PartnerMarketingClient() {
  const [profile,setProfile]=useState(null);
  const [campaign,setCampaign]=useState('general');
  const [customCampaign,setCustomCampaign]=useState('');
  const [copied,setCopied]=useState(false);

  useEffect(()=>{getPartnerProfile().then(setProfile);},[]);
  const effectiveCampaign = customCampaign.trim() || campaign;
  const url = useMemo(()=>buildPartnerReferralUrl(profile?.referralCode,effectiveCampaign),[profile?.referralCode,effectiveCampaign]);

  async function copy(){
    if(!url)return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(()=>setCopied(false),1500);
  }

  const msg=`Explore international treatment options with CareAtlas. I may receive compensation if a successful referral generates eligible CareAtlas revenue. ${url}`;

  return <PartnerShell title="Marketing tools" subtitle="Create campaign-tagged referral links and WhatsApp introductions without making medical promises.">
    <div className="phase7a-marketing-grid">
      <section className="portal-card">
        <Link2 size={22}/>
        <span className="eyebrow">TRACKED LINK</span>
        <h2>{profile?.referralCode||'Loading…'}</h2>
        <div className="phase7b-campaign-pills">{presets.map(([key,label])=><button type="button" key={key} className={campaign===key&&!customCampaign?'active':''} onClick={()=>{setCampaign(key);setCustomCampaign('')}}>{label}</button>)}</div>
        <label className="field-label phase7b-campaign-input"><span>Or custom campaign tag</span><input value={customCampaign} onChange={e=>setCustomCampaign(e.target.value)} placeholder="e.g. kenya-september"/></label>
        <div className="phase7a-share-line"><code>{url||'Generating link…'}</code><button type="button" onClick={copy} disabled={profile?.status!=='approved'}><Copy size={15}/>{copied?'Copied':'Copy'}</button></div>
        {profile?.status==='approved'&&url?<a className="button button-sm phase7a-whatsapp" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(msg)}`}><MessageCircle size={16}/> Share on WhatsApp</a>:<p className="phase7a-muted">Your link activates after CareAtlas approves the partner application.</p>}
        <p className="phase7b-campaign-note">Campaign tags are stored with attributed cases so you can compare which outreach actually converts. They do not change commission rates.</p>
      </section>
      <section className="portal-card phase7a-marketing-rules">
        <ShieldCheck size={22}/>
        <span className="eyebrow">SAFE PROMOTION</span>
        <h2>What you can say.</h2>
        <p>Introduce CareAtlas as a medical-travel coordination marketplace. Do not promise cures, guaranteed outcomes, doctor superiority or undisclosed discounts.</p>
        <p>Partners may receive compensation for successful introductions. Compensation must not change clinical recommendations or hospital ranking.</p>
      </section>
    </div>
  </PartnerShell>;
}
