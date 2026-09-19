import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import CompList, { LeaseDetails } from '../components/CompList.jsx';
import MapView from '../components/MapView.jsx';
import StatsPanel from '../components/StatsPanel.jsx';
import Timeline from '../components/Timeline.jsx';
import FullscreenInsights from '../components/FullscreenInsights.jsx';

function DashboardSkeleton() {
  return (
    <div className="dashboard-page dashboard-loading" aria-label="Loading dashboard">
      <div className="workspace-grid">
        <aside className="stats-rail skeleton-panel"><div className="skeleton-stack"><i /><i /><i /><i /></div></aside>
        <section className="map-stage">
          <div className="map-card skeleton-map"><span className="skeleton-map-label">Preparing property map…</span></div>
          <div className="timeline-card skeleton-panel"><div className="skeleton-stack horizontal"><i /><i /><i /></div></div>
        </section>
        <aside className="comps-rail skeleton-panel"><div className="skeleton-stack"><i /><i /><i /><i /><i /></div></aside>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [leases, setLeases] = useState([]);
  const [activeLeaseId, setActiveLeaseId] = useState(null);
  const [locationOverrides, setLocationOverrides] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    api.listLeases()
      .then((rows) => {
        if (!live) return;
        setLeases(rows);
      })
      .catch((err) => live && setError(err.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, []);

  const activeLease = useMemo(
    () => leases.find((lease) => lease.id === activeLeaseId) || null,
    [leases, activeLeaseId],
  );
  const focusPropertyId = activeLease?.property_id ?? null;

  // One Cesium entity per building. Lease records remain independent in the comp list.
  const properties = useMemo(() => {
    const unique = new Map();
    for (const lease of leases) {
      const property = lease.properties;
      if (!property) continue;
      const override = locationOverrides[property.id];
      unique.set(property.id, override ? { ...property, ...override } : property);
    }
    return [...unique.values()];
  }, [leases, locationOverrides]);

  const selectLease = useCallback((leaseId) => setActiveLeaseId(leaseId), []);
  const clearSelection = useCallback(() => setActiveLeaseId(null), []);

  const selectProperty = useCallback((propertyId) => {
    const preferred = leases.find((lease) => lease.property_id === propertyId);
    if (preferred) setActiveLeaseId(preferred.id);
  }, [leases]);

  // Missing coordinates are resolved by MapView with the Cesium/Google geocoder.
  // Keep the UI responsive immediately, then persist the result for future sessions.
  const handleResolvedLocation = useCallback((property, coords) => {
    if (!property?.id || coords?.lat == null || coords?.lon == null) return;

    setLocationOverrides((current) => ({
      ...current,
      [property.id]: { latitude: coords.lat, longitude: coords.lon },
    }));

    api.updateProperty(property.id, {
      address: property.address,
      display_name: property.display_name,
      latitude: coords.lat,
      longitude: coords.lon,
      image_url: property.image_url,
    }).catch((err) => {
      // The map can still use the resolved coordinate for this session.
      console.warn(`Could not persist map location for property ${property.id}:`, err.message);
    });
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return <div className="page-state error-state"><strong>Could not load dashboard data</strong><small>{error}</small></div>;
  }

  return (
    <div className="dashboard-page">
      <div className="workspace-grid">
        <aside className="stats-rail">
          <StatsPanel leases={leases} />
        </aside>

        <section className="map-stage">
          <MapView
            properties={properties}
            focusId={focusPropertyId}
            activeLease={activeLease}
            onSelectProperty={selectProperty}
            onClearSelection={clearSelection}
            onResolvedLocation={handleResolvedLocation}
            fullscreenContent={(
              <FullscreenInsights
                leases={leases}
                activeLeaseId={activeLeaseId}
                onSelectLease={selectLease}
              />
            )}
          />
          <Timeline
            leases={leases}
            activeLeaseId={activeLeaseId}
            onSelectLease={selectLease}
          />
        </section>

        <aside className="comps-rail">
          <LeaseDetails lease={activeLease} />
          <CompList leases={leases} activeLeaseId={activeLeaseId} onSelect={selectLease} />
        </aside>
      </div>
    </div>
  );
}
