import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { psf, sf } from '../lib/format.js';

function histogram(values, bins = 7, money = false) {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const step = (max - min) / bins || 1;

  return Array.from({ length: bins }, (_, index) => {
    const start = min + index * step;
    const end = index === bins - 1 ? max : min + (index + 1) * step;
    const count = nums.filter((value) => value >= start && (index === bins - 1 ? value <= end : value < end)).length;
    const label = money
      ? `$${Math.round(start)}–$${Math.round(end)}`
      : `${Math.round(start / 1000)}k–${Math.round(end / 1000)}k`;
    return { label, count };
  });
}

function median(values) {
  const nums = values.map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!nums.length) return null;
  const midpoint = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[midpoint] : (nums[midpoint - 1] + nums[midpoint]) / 2;
}

function weightedAverage(rows) {
  const clean = rows
    .map((row) => ({ rent: Number(row.yr1_rent_psf), sf: Number(row.sf) }))
    .filter((row) => Number.isFinite(row.rent) && Number.isFinite(row.sf) && row.sf > 0);
  const weight = clean.reduce((sum, row) => sum + row.sf, 0);
  return weight ? clean.reduce((sum, row) => sum + row.rent * row.sf, 0) / weight : null;
}

function MetricSection({ title, data, barClass, children, defaultOpen = true }) {
  return (
    <details className="stats-accordion" open={defaultOpen}>
      <summary>
        <span>
          <span className="eyebrow">Market stats</span>
          <strong>{title}</strong>
        </span>
        <span className="chevron" aria-hidden="true">⌄</span>
      </summary>
      <div className="stats-accordion-body">
        <div className="mini-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 2, left: 2, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fill: '#7a8494', fontSize: 8 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <Tooltip
                cursor={{ fill: 'rgba(15,23,42,.035)' }}
                contentStyle={{ background: '#ffffff', border: '1px solid #dfe4ea', borderRadius: 8, fontSize: 11, boxShadow: '0 8px 28px rgba(15,23,42,.12)' }}
              />
              <Bar className={barClass} dataKey="count" fill="currentColor" radius={[3, 3, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="metric-list">{children}</div>
      </div>
    </details>
  );
}

function Row({ label, value }) {
  return <div className="metric-row"><span>{label}</span><strong>{value}</strong></div>;
}

function FullscreenHistogram({ data }) {
  return (
    <div className="fullscreen-histogram">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="label" tick={{ fill: '#5f6670', fontSize: 8 }} axisLine={{ stroke: '#d9d8d4' }} tickLine={false} interval={0} />
          <Tooltip
            cursor={{ fill: 'rgba(31,35,38,.03)' }}
            contentStyle={{ background: '#fff', border: '1px solid #dedbd4', borderRadius: 8, fontSize: 10 }}
          />
          <Bar dataKey="count" fill="#393a3b" radius={[3, 3, 0, 0]} maxBarSize={44}>
            <LabelList dataKey="count" position="top" fill="#333638" fontSize={9} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function FullscreenStats({ leases }) {
  const rents = leases.map((lease) => lease.yr1_rent_psf).filter((value) => value != null);
  const areas = leases.map((lease) => lease.sf).filter((value) => value != null);
  const safeMax = (values) => values.length ? Math.max(...values.map(Number)) : null;
  const safeMin = (values) => values.length ? Math.min(...values.map(Number)) : null;

  return (
    <div className="fullscreen-stats-card">
      <div className="fullscreen-stats-title"><span className="lease-dot" /> Lease comps</div>

      <section className="fullscreen-stat-section">
        <div className="fullscreen-stat-label">Rent</div>
        <div className="fullscreen-kpi-grid">
          <div><span>Highest</span><strong>{psf(safeMax(rents))}</strong></div>
          <div className="warm"><span>Wtd. average</span><strong>{psf(weightedAverage(leases))}</strong></div>
          <div><span>Median</span><strong>{psf(median(rents))}</strong></div>
          <div><span>Lowest</span><strong>{psf(safeMin(rents))}</strong></div>
        </div>
        <FullscreenHistogram data={histogram(rents, 7, true)} />
      </section>

      <section className="fullscreen-stat-section">
        <div className="fullscreen-stat-label">Leased area</div>
        <div className="fullscreen-kpi-grid">
          <div><span>Largest</span><strong>{sf(safeMax(areas))}</strong></div>
          <div className="warm"><span>Median</span><strong>{sf(median(areas))}</strong></div>
          <div><span>Smallest</span><strong>{sf(safeMin(areas))}</strong></div>
          <div><span>Total SF</span><strong>{sf(areas.reduce((sum, value) => sum + Number(value), 0))}</strong></div>
        </div>
        <FullscreenHistogram data={histogram(areas, 7)} />
      </section>
    </div>
  );
}

export default function StatsPanel({ leases, variant = 'rail' }) {
  if (variant === 'fullscreen') return <FullscreenStats leases={leases} />;

  const rents = leases.map((lease) => lease.yr1_rent_psf).filter((value) => value != null);
  const areas = leases.map((lease) => lease.sf).filter((value) => value != null);
  const safeMax = (values) => values.length ? Math.max(...values.map(Number)) : null;
  const safeMin = (values) => values.length ? Math.min(...values.map(Number)) : null;

  return (
    <div className="stats-stack">
      <div className="rail-heading">
        <span className="eyebrow">Overview</span>
        <h2>Market stats</h2>
        <p>Use the dropdowns to keep only the insight you need visible.</p>
      </div>

      <MetricSection title="Rent" data={histogram(rents, 7, true)} barClass="rent-bars">
        <Row label="Highest" value={psf(safeMax(rents))} />
        <Row label="Wtd. average" value={psf(weightedAverage(leases))} />
        <Row label="Median" value={psf(median(rents))} />
        <Row label="Lowest" value={psf(safeMin(rents))} />
      </MetricSection>

      <MetricSection title="Leased area" data={histogram(areas, 6)} barClass="area-bars">
        <Row label="Largest" value={sf(safeMax(areas))} />
        <Row label="Median" value={sf(median(areas))} />
        <Row label="Smallest" value={sf(safeMin(areas))} />
        <Row label="Total SF" value={sf(areas.reduce((sum, value) => sum + Number(value), 0))} />
      </MetricSection>
    </div>
  );
}
