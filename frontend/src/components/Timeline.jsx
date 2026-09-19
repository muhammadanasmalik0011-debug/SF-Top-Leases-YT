import { useMemo, useState } from 'react';
import { Cell, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { date, psf, sf } from '../lib/format.js';

const DAY = 24 * 60 * 60 * 1000;

function TimelineTooltip({ active, payload, metric }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload.raw;
  return (
    <div className="timeline-tooltip">
      <strong>{row.tenant || 'Lease comp'}</strong>
      <span>{row.properties?.display_name || row.properties?.address}</span>
      <span>{metric === 'rent' ? psf(row.yr1_rent_psf) : sf(row.sf)} · {date(row.signed_date)}</span>
    </div>
  );
}

function monthlyTicks(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  const start = new Date(min);
  start.setDate(1);
  start.setHours(12, 0, 0, 0);
  const end = new Date(max);
  end.setDate(1);
  end.setHours(12, 0, 0, 0);
  const ticks = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    ticks.push(cursor.getTime());
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return [...new Set(ticks)];
}

export default function Timeline({ leases, activeLeaseId, onSelectLease, variant = 'default' }) {
  const [metric, setMetric] = useState('rent');

  const points = useMemo(() => leases
    .filter((lease) => lease.signed_date)
    .map((lease) => ({
      x: new Date(`${lease.signed_date}T12:00:00`).getTime(),
      y: metric === 'rent' ? Number(lease.yr1_rent_psf) : Number(lease.sf),
      z: Number(lease.sf) || 45000,
      raw: lease,
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)), [leases, metric]);

  const dateValues = points.map((point) => point.x);
  const minDate = dateValues.length ? Math.min(...dateValues) : NaN;
  const maxDate = dateValues.length ? Math.max(...dateValues) : NaN;
  const ticks = useMemo(() => monthlyTicks(minDate, maxDate), [minDate, maxDate]);

  const start = Number.isFinite(minDate) ? new Date(minDate) : null;
  const end = Number.isFinite(maxDate) ? new Date(maxDate) : null;
  const rangeLabel = start && end
    ? `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
    : 'No dated leases';

  return (
    <section className={`timeline-card ${variant === 'fullscreen' ? 'fullscreen-timeline' : ''}`}>
      <div className="timeline-head">
        <div>
          <span className="eyebrow">Lease timeline</span>
          <div className="timeline-title-row">
            <h2>{rangeLabel}</h2>
            <span>Circle size represents deal size</span>
          </div>
        </div>
        <div className="segmented" role="group" aria-label="Timeline metric">
          <button className={metric === 'rent' ? 'active' : ''} onClick={() => setMetric('rent')}>Rent</button>
          <button className={metric === 'area' ? 'active' : ''} onClick={() => setMetric('area')}>Leased area</button>
        </div>
      </div>

      <div className="timeline-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 24, bottom: 12, left: 0 }}>
            <XAxis
              type="number"
              dataKey="x"
              domain={Number.isFinite(minDate) ? [minDate - (7 * DAY), maxDate + (7 * DAY)] : ['auto', 'auto']}
              ticks={ticks}
              scale="time"
              tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
              tick={{ fill: '#738093', fontSize: 10 }}
              axisLine={{ stroke: '#dfe4ea' }}
              tickLine={false}
              minTickGap={28}
            />
            <YAxis
              type="number"
              dataKey="y"
              width={52}
              tickFormatter={(value) => metric === 'rent' ? `$${Math.round(value)}` : `${Math.round(value / 1000)}k`}
              tick={{ fill: '#738093', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <ZAxis type="number" dataKey="z" range={[48, 310]} />
            <Tooltip cursor={{ stroke: '#c7ced8', strokeDasharray: '3 3' }} content={<TimelineTooltip metric={metric} />} />
            <Scatter
              data={points}
              fill="#72b7ff"
              onClick={(entry) => {
                const id = entry?.payload?.raw?.id ?? entry?.raw?.id;
                if (id != null) onSelectLease?.(id);
              }}
              style={{ cursor: 'pointer' }}
            >
              {points.map((point) => (
                <Cell
                  key={`lease-${point.raw.id}`}
                  fill={point.raw.id === activeLeaseId ? '#0a4f91' : '#62adf4'}
                  fillOpacity={point.raw.id === activeLeaseId ? 1 : 0.82}
                  stroke={point.raw.id === activeLeaseId ? '#ffffff' : '#2f78b5'}
                  strokeWidth={point.raw.id === activeLeaseId ? 3 : 1}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      {variant !== 'fullscreen' && <div className="timeline-foot">Select a point to locate that lease on the map and in the comp list.</div>}
    </section>
  );
}
