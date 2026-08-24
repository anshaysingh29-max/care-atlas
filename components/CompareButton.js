'use client';

import { useEffect, useState } from 'react';
import { Check, GitCompareArrows, Plus } from 'lucide-react';

const STORAGE_KEY = 'careatlas-compare-hospitals';

function readSelected() {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export default function CompareButton({ hospitalSlug, compact = false }) {
  const [selected, setSelected] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    setSelected(readSelected().includes(hospitalSlug));
  }, [hospitalSlug]);

  function toggle(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const current = readSelected();
    const isSelected = current.includes(hospitalSlug);
    let next;

    if (isSelected) {
      next = current.filter(slug => slug !== hospitalSlug);
      setLimitReached(false);
    } else {
      if (current.length >= 3) {
        setLimitReached(true);
        return;
      }
      next = [...current, hospitalSlug];
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSelected(!isSelected);
    window.dispatchEvent(new CustomEvent('careatlas:compare-change', { detail: next }));
  }

  return (
    <button
      type="button"
      className={`compare-toggle ${selected ? 'is-selected' : ''} ${compact ? 'compact' : ''}`}
      onClick={toggle}
      title={limitReached ? 'You can compare up to 3 hospitals' : selected ? 'Remove from comparison' : 'Add to comparison'}
      aria-pressed={selected}
    >
      {selected ? <Check size={15}/> : compact ? <Plus size={15}/> : <GitCompareArrows size={15}/>}
      <span>{limitReached ? 'Maximum 3' : selected ? 'Added' : compact ? 'Compare' : 'Add to compare'}</span>
    </button>
  );
}
