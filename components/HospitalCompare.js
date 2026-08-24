'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, GitCompareArrows, MapPin, Star, Trash2 } from 'lucide-react';
import { hospitals } from '@/lib/data';

const STORAGE_KEY = 'careatlas-compare-hospitals';

function readStored() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
  } catch {
    return [];
  }
}

export default function HospitalCompare() {
  const [selectedSlugs, setSelectedSlugs] = useState([]);

  useEffect(() => {
    setSelectedSlugs(readStored());

    const sync = () => setSelectedSlugs(readStored());
    window.addEventListener('careatlas:compare-change', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('careatlas:compare-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const selected = useMemo(
    () => selectedSlugs.map(slug => hospitals.find(h => h.slug === slug)).filter(Boolean),
    [selectedSlugs]
  );

  function toggle(slug) {
    const exists = selectedSlugs.includes(slug);
    let next = exists ? selectedSlugs.filter(item => item !== slug) : [...selectedSlugs, slug].slice(0, 3);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSelectedSlugs(next);
  }

  function clearAll() {
    window.localStorage.removeItem(STORAGE_KEY);
    setSelectedSlugs([]);
  }

  return (
    <>
      <section className="compact-hero compare-hero">
        <div className="container narrow">
          <span className="eyebrow"><GitCompareArrows size={15}/> HOSPITAL COMPARISON</span>
          <h1>Compare the details that matter before you enquire.</h1>
          <p>Select up to three CareAtlas demonstration providers. In production, this will compare verified quotes, clinical teams and international-patient services.</p>
        </div>
      </section>

      <section className="section compare-section">
        <div className="container">
          <div className="compare-picker-shell">
            <div className="compare-picker-heading">
              <div>
                <span className="mini-label">SELECT PROVIDERS</span>
                <h2>{selected.length}/3 hospitals selected</h2>
              </div>
              {selected.length > 0 && <button className="clear-button" type="button" onClick={clearAll}><Trash2 size={15}/> Clear</button>}
            </div>
            <div className="compare-picker-grid">
              {hospitals.map(hospital => {
                const active = selectedSlugs.includes(hospital.slug);
                const disabled = !active && selectedSlugs.length >= 3;
                return (
                  <button
                    key={hospital.slug}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggle(hospital.slug)}
                    className={`compare-picker-card ${active ? 'active' : ''}`}
                  >
                    <span className="compare-check">{active ? <Check size={15}/> : '+'}</span>
                    <strong>{hospital.name}</strong>
                    <small><MapPin size={12}/> {hospital.city}, {hospital.country}</small>
                  </button>
                );
              })}
            </div>
          </div>

          {selected.length === 0 ? (
            <div className="compare-empty">
              <GitCompareArrows size={31}/>
              <h2>Choose hospitals above to start comparing.</h2>
              <p>You can also add hospitals from any hospital card across CareAtlas.</p>
              <Link className="button" href="/hospitals">Browse hospitals <ArrowRight size={16}/></Link>
            </div>
          ) : (
            <div className="comparison-table-wrap">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Comparison</th>
                    {selected.map(h => <th key={h.slug}><Link href={`/hospitals/${h.slug}`}>{h.name}</Link></th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th>Location</th>
                    {selected.map(h => <td key={h.slug}>{h.flag} {h.city}, {h.country}</td>)}
                  </tr>
                  <tr>
                    <th>Demo rating</th>
                    {selected.map(h => <td key={h.slug}><span className="comparison-rating"><Star size={14} fill="currentColor"/> {h.rating}</span></td>)}
                  </tr>
                  <tr>
                    <th>Indicative starting price</th>
                    {selected.map(h => <td key={h.slug}><strong>{h.price}</strong></td>)}
                  </tr>
                  <tr>
                    <th>Typical response</th>
                    {selected.map(h => <td key={h.slug}>{h.response}</td>)}
                  </tr>
                  <tr>
                    <th>Key specialties</th>
                    {selected.map(h => <td key={h.slug}>{h.specialties.slice(0, 3).join(' · ')}</td>)}
                  </tr>
                  <tr>
                    <th>International services</th>
                    {selected.map(h => <td key={h.slug}><ul>{h.services.slice(0, 4).map(s => <li key={s}><Check size={13}/> {s}</li>)}</ul></td>)}
                  </tr>
                  <tr>
                    <th>Accreditation information</th>
                    {selected.map(h => <td key={h.slug}>{h.accreditations.join(' · ')}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {selected.length > 0 && (
            <div className="compare-cta">
              <div>
                <span className="eyebrow">NEXT STEP</span>
                <h2>Request structured treatment options.</h2>
                <p>Your selected hospitals stay saved in this browser for the prototype.</p>
              </div>
              <Link className="button" href="/get-treatment-plan">Start my case <ArrowRight size={17}/></Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
