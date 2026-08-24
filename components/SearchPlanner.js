'use client';

import { useState } from 'react';
import { ArrowRight, Search } from 'lucide-react';
import { treatments, destinations } from '@/lib/data';

export default function SearchPlanner() {
  const [treatment, setTreatment] = useState('knee-replacement');
  const [destination, setDestination] = useState('recommend');

  function handleSubmit(e) {
    e.preventDefault();
    const treatmentPart = treatment ? `/treatments/${treatment}` : '/treatments';
    window.location.href = destination === 'recommend' ? treatmentPart : `${treatmentPart}?destination=${destination}`;
  }

  return (
    <form className="planner-card" onSubmit={handleSubmit}>
      <div className="planner-grid">
        <label>
          <span>What treatment do you need?</span>
          <select value={treatment} onChange={e => setTreatment(e.target.value)}>
            {treatments.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
          </select>
        </label>
        <label>
          <span>Travelling from</span>
          <select defaultValue="United Kingdom">
            <option>United Kingdom</option>
            <option>United States</option>
            <option>UAE</option>
            <option>Saudi Arabia</option>
            <option>Kenya</option>
            <option>Nigeria</option>
            <option>Australia</option>
          </select>
        </label>
        <label>
          <span>Preferred destination</span>
          <select value={destination} onChange={e => setDestination(e.target.value)}>
            <option value="recommend">Recommend the best destination</option>
            {destinations.map(d => <option key={d.slug} value={d.slug}>{d.flag} {d.name}</option>)}
          </select>
        </label>
        <button className="button planner-button" type="submit"><Search size={18}/> Find options <ArrowRight size={17}/></button>
      </div>
    </form>
  );
}
