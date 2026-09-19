import { useEffect, useMemo, useState } from 'react';
import { date, months, psf, sf } from '../lib/format.js';

const buildingTitle = (property = {}) => property.address?.split(',')[0] || property.display_name || 'Property';

function Initials({ text }) {
  const letters = String(text || 'P').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  return <div className="comp-placeholder">{letters}</div>;
}

export function LeaseDetails({ lease }) {
  if (!lease) return (
    <div className="empty-detail">
      <span className="empty-icon">⌖</span>
      <div>
        <strong>Select a lease comp</strong>
        <p>Choose a card, timeline point, or map pin to inspect the deal.</p>
      </div>
    </div>
  );

  const property = lease.properties || {};
  const details = [
    ['Leased area', sf(lease.sf)],
    ['Rate /SF/Yr', psf(lease.yr1_rent_psf)],
    ['Term', months(lease.term_months)],
    ['Escalation', lease.escalation_pct == null ? '—' : `${lease.escalation_pct}%`],
    ['TI / SF', lease.ti_psf == null ? '—' : `$${Number(lease.ti_psf).toFixed(2)}`],
    ['Free rent', months(lease.free_rent_months)],
    ['Executed', date(lease.signed_date)],
    ['Deal type', lease.deal_type || '—'],
    ['Lease type', lease.lease_type || '—'],
    ['Floors', lease.floors || '—'],
  ];

  return (
    <article className="selected-comp">
      <div className="selected-summary">
        <div className="selected-thumb">
          {property.image_url ? <img src={property.image_url} alt="" /> : <Initials text={property.display_name || property.address} />}
        </div>
        <div className="selected-copy">
          <span className="eyebrow">Selected comp</span>
          <h2>{buildingTitle(property)}</h2>
          <p>{lease.tenant || 'Tenant not provided'}</p>
          <span className="selected-address">{property.address}</span>
        </div>
      </div>

      <div className="selected-kpis">
        <span><small>Area</small><strong>{sf(lease.sf)}</strong></span>
        <span><small>Rent</small><strong>{psf(lease.yr1_rent_psf)}</strong></span>
      </div>

      <details className="detail-dropdown">
        <summary><span>Lease details</span><span className="chevron">⌄</span></summary>
        <div className="detail-grid">
          {details.map(([label, value]) => (
            <div key={label} className="detail-cell">
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </details>

      {lease.notes && (
        <details className="detail-dropdown notes-dropdown">
          <summary><span>Notes</span><span className="chevron">⌄</span></summary>
          <p>{lease.notes}</p>
        </details>
      )}
    </article>
  );
}

export default function CompList({ leases, activeLeaseId, onSelect }) {
  const [sort, setSort] = useState('newest');

  const sorted = useMemo(() => [...leases].sort((a, b) => {
    if (sort === 'largest') return (Number(b.sf) || 0) - (Number(a.sf) || 0);
    if (sort === 'rent') return (Number(b.yr1_rent_psf) || 0) - (Number(a.yr1_rent_psf) || 0);
    return String(b.signed_date || '').localeCompare(String(a.signed_date || ''));
  }), [leases, sort]);

  useEffect(() => {
    if (activeLeaseId == null) return;
    const node = document.querySelector(`[data-lease-id="${activeLeaseId}"]`);
    node?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeLeaseId]);

  return (
    <div className="comp-list">
      <div className="comp-list-head">
        <div>
          <span className="eyebrow">Comparables</span>
          <h2>Lease comps</h2>
        </div>
        <label className="sort-select">
          <span className="sr-only">Sort lease comps</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Newest</option>
            <option value="largest">Largest area</option>
            <option value="rent">Highest rent</option>
          </select>
        </label>
      </div>

      <div className="comp-scroll">
        {sorted.map((lease) => {
          const property = lease.properties || {};
          return (
            <button
              type="button"
              key={lease.id}
              data-lease-id={lease.id}
              className={`comp-card ${activeLeaseId === lease.id ? 'active' : ''}`}
              onClick={() => onSelect?.(lease.id)}
            >
              <span className="comp-thumb">
                {property.image_url ? <img src={property.image_url} alt="" /> : <Initials text={property.display_name || property.address} />}
              </span>
              <span className="comp-copy">
                <strong>{buildingTitle(property)}</strong>
                <span>{lease.tenant || 'Tenant not provided'}</span>
                <span className="comp-meta">{sf(lease.sf)} · {psf(lease.yr1_rent_psf)}</span>
              </span>
              <span className="comp-arrow" aria-hidden="true">›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
