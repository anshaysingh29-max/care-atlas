'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Globe2,
  Languages,
  Loader2,
  MapPin,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { destinations, treatments } from '@/lib/data';
import { getMarketplaceSpecialties, getPublishedHospitals } from '@/lib/firebase/marketplace';
import { saveNavigatorShortlist } from '@/lib/firebase/careNavigator';
import {
  BUDGET_BANDS,
  MATCH_ALGORITHM_VERSION,
  MATCH_PRIORITIES,
  MATCHING_DISCLOSURE,
  buildHospitalMatches,
  suggestCareTargets,
  treatmentsForSpecialty
} from '@/lib/ai/matching';

const languageOptions = ['English', 'Arabic', 'French', 'Spanish', 'Russian', 'Hindi', 'Turkish', 'Thai'];

function destinationSlugForHospital(hospital) {
  const term = String(hospital?.country || '').toLowerCase();
  if (term.includes('united arab emirates') || term.includes('uae')) return 'uae';
  if (term.includes('india')) return 'india';
  if (term.includes('turkey') || term.includes('turkiye')) return 'turkey';
  if (term.includes('thailand')) return 'thailand';
  return '';
}

function matchHref({ treatmentSlug, specialtyId, destinationIds, hospitalId }) {
  const params = new URLSearchParams();
  if (treatmentSlug) params.set('treatment', treatmentSlug);
  if (specialtyId) params.set('specialty', specialtyId);
  if (destinationIds?.length) params.set('destinations', destinationIds.join(','));
  if (hospitalId) params.set('hospital', hospitalId);
  params.set('source', 'care-navigator');
  params.set('matchVersion', MATCH_ALGORITHM_VERSION);
  return `/get-treatment-plan?${params.toString()}`;
}

function scoreTone(score) {
  if (score >= 85) return 'strong';
  if (score >= 70) return 'good';
  return 'possible';
}

export default function CareNavigatorClient({ mode = 'public' }) {
  const { user, patientProfile } = useAuth();
  const [specialties, setSpecialties] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [specialtyId, setSpecialtyId] = useState('');
  const [treatmentSlug, setTreatmentSlug] = useState('');
  const [destinationIds, setDestinationIds] = useState([]);
  const [preferredLanguages, setPreferredLanguages] = useState([]);
  const [priorityIds, setPriorityIds] = useState([]);
  const [budgetBandId, setBudgetBandId] = useState('not_sure');
  const [results, setResults] = useState([]);
  const [ranMatch, setRanMatch] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getMarketplaceSpecialties(), getPublishedHospitals()])
      .then(([specialtyRows, hospitalRows]) => {
        if (!active) return;
        setSpecialties(specialtyRows);
        setHospitals(hospitalRows);
      })
      .catch(() => {
        if (!active) return;
        setError('CareAtlas marketplace data could not be loaded. Please try again.');
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (mode !== 'patient' || preferredLanguages.length) return;
    const language = patientProfile?.preferredLanguage;
    if (language && languageOptions.includes(language)) setPreferredLanguages([language]);
  }, [mode, patientProfile, preferredLanguages.length]);

  const selectedSpecialty = useMemo(
    () => specialties.find(item => item.id === specialtyId) || null,
    [specialties, specialtyId]
  );

  const treatmentOptions = useMemo(
    () => treatmentsForSpecialty(selectedSpecialty, treatments),
    [selectedSpecialty]
  );

  const suggestions = useMemo(
    () => searchText.trim().length >= 2 ? suggestCareTargets(searchText, specialties, treatments) : [],
    [searchText, specialties]
  );

  const liveHospitalCount = useMemo(
    () => hospitals.filter(h => specialtyId && (h.specialtyIds || []).includes(specialtyId)).length,
    [hospitals, specialtyId]
  );

  function chooseSuggestion(item) {
    if (item.specialtyId) setSpecialtyId(item.specialtyId);
    if (item.treatmentSlug) setTreatmentSlug(item.treatmentSlug);
    else setTreatmentSlug('');
    setSearchText(item.name);
    setResults([]);
    setRanMatch(false);
    setSaved('');
  }

  function chooseSpecialty(id) {
    setSpecialtyId(id);
    setTreatmentSlug('');
    setResults([]);
    setRanMatch(false);
    setSaved('');
  }

  function toggle(list, setter, value) {
    setter(list.includes(value) ? list.filter(item => item !== value) : [...list, value]);
    setResults([]);
    setRanMatch(false);
    setSaved('');
  }

  function runMatch() {
    setError('');
    setSaved('');
    if (!selectedSpecialty) {
      setError('Choose a specialty before asking CareAtlas to match hospitals.');
      return;
    }
    const rows = buildHospitalMatches({
      hospitals,
      specialtyId,
      specialtyName: selectedSpecialty.name,
      destinationIds,
      preferredLanguages,
      priorityIds,
      budgetBandId
    });
    setResults(rows.slice(0, 5));
    setRanMatch(true);
  }

  async function saveShortlist() {
    if (!user || mode !== 'patient') return;
    setSaving(true);
    setError('');
    setSaved('');
    try {
      await saveNavigatorShortlist({ specialtyId, treatmentSlug, destinationIds, preferredLanguages, priorityIds, budgetBandId, matches: results });
      setSaved('Shortlist saved securely to your CareAtlas account. It is not shared with hospitals unless you later submit a case and CareAtlas assigns a provider under the normal consent workflow.');
    } catch (err) {
      setError(err?.message || 'Unable to save your shortlist.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <section className="phase8a-loading"><Loader2 className="phase8a-spin" size={24}/><strong>Loading CareAtlas matching data…</strong></section>;
  }

  return (
    <div className={`phase8a-navigator ${mode === 'patient' ? 'phase8a-navigator-embedded' : ''}`}>
      <section className="phase8a-ai-intro">
        <div>
          <span className="eyebrow"><Sparkles size={15}/> CAREATLAS AI · EXPLAINABLE MATCHING</span>
          <h2>{mode === 'patient' ? 'Find hospital options around your preferences.' : 'A clearer starting point for international care.'}</h2>
          <p>{MATCHING_DISCLOSURE.body}</p>
        </div>
        <div className="phase8a-policy-card">
          <ShieldCheck size={22}/>
          <div><strong>Commercially neutral ranking</strong><span>{MATCHING_DISCLOSURE.commercialNeutrality}</span></div>
        </div>
      </section>

      <div className="phase8a-navigator-grid">
        <section className="phase8a-conversation">
          <div className="phase8a-message phase8a-message-ai">
            <span><Bot size={18}/></span>
            <div><strong>CareAtlas AI</strong><p>Tell me the specialty or treatment you already know you are exploring. I can map that to approved CareAtlas providers, but I will not diagnose symptoms.</p></div>
          </div>

          <div className="phase8a-step-card">
            <div className="phase8a-step-heading"><span>1</span><div><strong>What kind of care are you exploring?</strong><small>Search the CareAtlas catalogue or choose a specialty.</small></div></div>
            <div className="phase8a-searchbox"><Search size={17}/><input value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="e.g. Cardiology or Knee Replacement"/></div>
            {suggestions.length > 0 && <div className="phase8a-suggestions">{suggestions.map(item=><button type="button" key={`${item.kind}-${item.id}`} onClick={()=>chooseSuggestion(item)}><span>{item.kind === 'treatment' ? <Stethoscope size={15}/> : <Sparkles size={15}/>}</span><div><strong>{item.name}</strong><small>{item.kind === 'treatment' ? 'Known treatment' : 'Specialty'}</small></div><ChevronRight size={15}/></button>)}</div>}
            {searchText.trim().length >= 2 && !suggestions.length && <p className="phase8a-no-diagnosis">No direct CareAtlas catalogue match. If you only have symptoms or are unsure of the specialty, request a human coordinator rather than relying on an automated diagnosis.</p>}
            <div className="phase8a-specialty-chips">{specialties.slice(0,18).map(item=><button type="button" className={specialtyId===item.id?'selected':''} key={item.id} onClick={()=>chooseSpecialty(item.id)}>{item.icon||'⚕️'} {item.name}</button>)}</div>
            {selectedSpecialty && <div className="phase8a-selected"><CheckCircle2 size={17}/><span><strong>{selectedSpecialty.name}</strong> selected · {liveHospitalCount} live published hospital{liveHospitalCount===1?'':'s'} currently mapped</span></div>}
          </div>

          {selectedSpecialty && <div className="phase8a-step-card">
            <div className="phase8a-step-heading"><span>2</span><div><strong>Do you already know the treatment?</strong><small>Optional. This helps carry context into the treatment-request form.</small></div></div>
            <select className="phase8a-select" value={treatmentSlug} onChange={e=>setTreatmentSlug(e.target.value)}>
              <option value="">Not sure / specialty consultation</option>
              {treatmentOptions.map(item=><option key={item.slug} value={item.slug}>{item.name}</option>)}
            </select>
            {!treatmentOptions.length && <p className="phase8a-helper">CareAtlas does not have a seeded procedure list for this specialty yet. The specialty itself can still be matched to approved hospitals.</p>}
          </div>}

          {selectedSpecialty && <div className="phase8a-step-card">
            <div className="phase8a-step-heading"><span>3</span><div><strong>Where would you consider travelling?</strong><small>Leave all unselected if destination is flexible.</small></div></div>
            <div className="phase8a-destination-grid">{destinations.map(item=><button type="button" key={item.slug} className={destinationIds.includes(item.slug)?'selected':''} onClick={()=>toggle(destinationIds,setDestinationIds,item.slug)}><span>{item.flag}</span><strong>{item.name}</strong><small>{item.costIndex}</small></button>)}</div>
          </div>}

          {selectedSpecialty && <div className="phase8a-step-card">
            <div className="phase8a-step-heading"><span>4</span><div><strong>What matters for the journey?</strong><small>These preferences affect the fit score only when the hospital has relevant published information.</small></div></div>
            <label className="phase8a-label"><Languages size={16}/> Preferred language</label>
            <div className="phase8a-pill-grid">{languageOptions.map(item=><button type="button" key={item} className={preferredLanguages.includes(item)?'selected':''} onClick={()=>toggle(preferredLanguages,setPreferredLanguages,item)}>{preferredLanguages.includes(item)&&<Check size={14}/>} {item}</button>)}</div>
            <label className="phase8a-label"><Globe2 size={16}/> Support priorities</label>
            <div className="phase8a-pill-grid">{MATCH_PRIORITIES.map(item=><button type="button" key={item.id} className={priorityIds.includes(item.id)?'selected':''} onClick={()=>toggle(priorityIds,setPriorityIds,item.id)}>{priorityIds.includes(item.id)&&<Check size={14}/>} {item.label}</button>)}</div>
            <label className="phase8a-label"><CircleDollarSign size={16}/> Treatment budget preference</label>
            <select className="phase8a-select" value={budgetBandId} onChange={e=>{setBudgetBandId(e.target.value);setResults([]);setRanMatch(false);setSaved('');}}>{BUDGET_BANDS.map(item=><option value={item.id} key={item.id}>{item.label}</option>)}</select>
            <p className="phase8a-helper">Budget is scored only when a provider-specific price is actually published. CareAtlas will not invent missing prices.</p>
          </div>}

          {selectedSpecialty && <button type="button" className="button phase8a-match-button" onClick={runMatch}><Sparkles size={17}/> Find CareAtlas matches</button>}
          {error && <div className="phase8a-alert phase8a-alert-error"><ShieldCheck size={17}/><span>{error}</span></div>}
          {saved && <div className="phase8a-alert phase8a-alert-success"><CheckCircle2 size={17}/><span>{saved}</span></div>}
        </section>

        <aside className="phase8a-results-panel">
          <div className="phase8a-results-head"><div><span className="eyebrow">MATCH RESULTS</span><h3>{ranMatch ? `${results.length} live option${results.length===1?'':'s'}` : 'Your shortlist will appear here'}</h3></div><span className="phase8a-version">8A · {MATCH_ALGORITHM_VERSION.split('-').slice(-1)[0]}</span></div>

          {!ranMatch && <div className="phase8a-empty-state"><Sparkles size={34}/><h4>Explainable, not opaque.</h4><p>Every match shows why it scored well and which information is missing. Only live, published CareAtlas hospital partners are eligible.</p></div>}

          {ranMatch && !results.length && <div className="phase8a-empty-state"><Building2 size={34}/><h4>No live published hospital currently matches this specialty.</h4><p>CareAtlas can still manually source options. Demo providers are deliberately excluded from AI recommendations.</p><Link href={matchHref({treatmentSlug,specialtyId,destinationIds})} className="button button-sm">Request human matching <ArrowRight size={15}/></Link></div>}

          {results.map((item,index)=>{
            const hospital=item.hospital;
            const destination=destinations.find(d=>d.slug===destinationSlugForHospital(hospital));
            return <article className="phase8a-match-card" key={item.hospitalId}>
              <div className="phase8a-match-top"><span className={`phase8a-score ${scoreTone(item.score)}`}><strong>{item.score}</strong><small>FIT</small></span><div><small>#{index+1} MATCH</small><h4>{hospital.name}</h4><p><MapPin size={14}/> {hospital.city}, {hospital.country} {destination?.flag||''}</p></div></div>
              <div className="phase8a-match-badges"><span><BadgeCheck size={14}/> Published partner</span><span><Stethoscope size={14}/> {selectedSpecialty?.name}</span></div>
              <div className="phase8a-reason-block"><strong>Why it matched</strong>{item.reasons.map(reason=><span key={reason}><CheckCircle2 size={14}/>{reason}</span>)}</div>
              {item.gaps.length>0&&<div className="phase8a-gap-block"><strong>Still to confirm</strong>{item.gaps.map(gap=><span key={gap}>• {gap}</span>)}</div>}
              <div className="phase8a-match-actions"><Link href={`/hospitals/profile?id=${item.hospitalId}`} className="button button-ghost button-sm">View hospital</Link><Link href={matchHref({treatmentSlug,specialtyId,destinationIds,hospitalId:item.hospitalId})} className="button button-sm">Request plan <ArrowRight size={14}/></Link></div>
            </article>;
          })}

          {ranMatch && results.length>0 && <div className="phase8a-results-footer">
            <p><ShieldCheck size={15}/> Fit scores compare your selected preferences against available marketplace data. They are not medical outcome predictions or clinical rankings.</p>
            {mode==='patient' ? <button type="button" className="button full-button" disabled={saving} onClick={saveShortlist}>{saving?<Loader2 className="phase8a-spin" size={16}/>:<Save size={16}/>} {saving?'Saving…':'Save this shortlist'}</button> : <Link className="button full-button" href="/login">Sign in to save shortlist <ArrowRight size={15}/></Link>}
          </div>}
        </aside>
      </div>
    </div>
  );
}
