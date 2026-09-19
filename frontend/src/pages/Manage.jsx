import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import Modal from '../components/Modal.jsx';
import { date, money, psf, sf } from '../lib/format.js';
import LeaseForm from './forms/LeaseForm.jsx';
import PropertyForm from './forms/PropertyForm.jsx';
import TransactionForm from './forms/TransactionForm.jsx';

const TABS = [
  ['leases', 'Leases'],
  ['properties', 'Properties'],
  ['transactions', 'Sales'],
];

export default function Manage() {
  const [tab, setTab] = useState('leases');
  const [properties, setProperties] = useState([]);
  const [leases, setLeases] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const [propertyRows, leaseRows, transactionRows] = await Promise.all([
      api.listProperties(), api.listLeases(), api.listTransactions(),
    ]);
    setProperties(propertyRows);
    setLeases(leaseRows);
    setTransactions(transactionRows);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);

  const q = query.trim().toLowerCase();
  const visibleProperties = useMemo(() => !q ? properties : properties.filter((p) => `${p.display_name} ${p.address}`.toLowerCase().includes(q)), [properties, q]);
  const visibleLeases = useMemo(() => !q ? leases : leases.filter((l) => `${l.tenant} ${l.properties?.display_name} ${l.properties?.address} ${l.deal_type}`.toLowerCase().includes(q)), [leases, q]);
  const visibleTransactions = useMemo(() => !q ? transactions : transactions.filter((t) => `${t.name} ${t.properties?.display_name} ${t.properties?.address} ${t.buyer} ${t.seller}`.toLowerCase().includes(q)), [transactions, q]);

  async function saveProperty(form) {
    modal?.initial ? await api.updateProperty(modal.initial.id, form) : await api.createProperty(form);
    setModal(null); await refresh();
  }
  async function saveLease(form) {
    modal?.initial ? await api.updateLease(modal.initial.id, form) : await api.createLease(form);
    setModal(null); await refresh();
  }
  async function saveTransaction(form) {
    modal?.initial ? await api.updateTransaction(modal.initial.id, form) : await api.createTransaction(form);
    setModal(null); await refresh();
  }

  async function remove(type, id) {
    const message = type === 'property'
      ? 'Delete this property? Its linked leases and sales will also be deleted.'
      : `Delete this ${type}?`;
    if (!confirm(message)) return;
    if (type === 'property') await api.deleteProperty(id);
    if (type === 'lease') await api.deleteLease(id);
    if (type === 'transaction') await api.deleteTransaction(id);
    await refresh();
  }

  function openCreate() {
    setModal({ type: tab === 'transactions' ? 'transaction' : tab.slice(0, -1) });
  }

  const counts = { leases: leases.length, properties: properties.length, transactions: transactions.length };

  return (
    <div className="manage-page">
      <div className="manage-heading">
        <div>
          <span className="eyebrow">Property Manager</span>
          <h1>Manage portfolio data</h1>
          <p>Create buildings, attach lease and sale comps, and set locations directly on the map.</p>
        </div>
        <button className="btn primary-large" onClick={openCreate}>+ Add {tab === 'transactions' ? 'sale' : tab.slice(0, -1)}</button>
      </div>

      <div className="manage-toolbar">
        <div className="tab-strip">
          {TABS.map(([key, label]) => (
            <button key={key} className={tab === key ? 'active' : ''} onClick={() => { setTab(key); setQuery(''); }}>
              {label}<span>{counts[key]}</span>
            </button>
          ))}
        </div>
        <div className="table-search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Search ${tab}…`} /></div>
      </div>

      {error && <div className="inline-error">{error}</div>}
      {loading ? <div className="page-state"><span className="spinner" />Loading data…</div> : (
        <div className="table-shell">
          {tab === 'properties' && (
            <table>
              <thead><tr><th>Property</th><th>Address</th><th>Map location</th><th>Image</th><th></th></tr></thead>
              <tbody>{visibleProperties.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.display_name || 'Unnamed property'}</strong></td>
                  <td>{p.address}</td>
                  <td><span className={`location-chip ${p.latitude != null ? 'mapped' : ''}`}>{p.latitude != null ? '● Mapped' : '○ Not set'}</span></td>
                  <td className="muted-cell">{p.image_url ? 'Available' : '—'}</td>
                  <td className="row-actions"><button onClick={() => setModal({ type: 'property', initial: p })}>Edit</button><button className="danger-link" onClick={() => remove('property', p.id)}>Delete</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}

          {tab === 'leases' && (
            <table>
              <thead><tr><th>Tenant</th><th>Building</th><th>Area</th><th>Rent</th><th>Executed</th><th>Deal</th><th></th></tr></thead>
              <tbody>{visibleLeases.map((l) => (
                <tr key={l.id}>
                  <td><strong>{l.tenant || '—'}</strong></td>
                  <td>{l.properties?.display_name || l.properties?.address || '—'}</td>
                  <td>{sf(l.sf)}</td><td>{psf(l.yr1_rent_psf)}</td><td>{date(l.signed_date)}</td>
                  <td><span className="soft-chip">{l.deal_type || l.lease_type || '—'}</span></td>
                  <td className="row-actions"><button onClick={() => setModal({ type: 'lease', initial: l })}>Edit</button><button className="danger-link" onClick={() => remove('lease', l.id)}>Delete</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}

          {tab === 'transactions' && (
            <table>
              <thead><tr><th>Property</th><th>Status</th><th>Size</th><th>Price range</th><th>Buyer</th><th>As of</th><th></th></tr></thead>
              <tbody>{visibleTransactions.map((t) => (
                <tr key={t.id}>
                  <td><strong>{t.properties?.display_name || t.properties?.address || t.name || '—'}</strong></td>
                  <td><span className="soft-chip">{t.status === 'closed' ? 'Closed' : 'Active'}{t.sub_status ? ` · ${t.sub_status}` : ''}</span></td>
                  <td>{sf(t.sf)}</td>
                  <td>{t.price_low != null || t.price_high != null ? `${money(t.price_low)} – ${money(t.price_high)}` : '—'}</td>
                  <td>{t.buyer || '—'}</td><td>{date(t.as_of_date)}</td>
                  <td className="row-actions"><button onClick={() => setModal({ type: 'transaction', initial: t })}>Edit</button><button className="danger-link" onClick={() => remove('transaction', t.id)}>Delete</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}

      {modal?.type === 'property' && (
        <Modal wide title={modal.initial ? 'Edit property' : 'Add property'} onClose={() => setModal(null)}>
          <PropertyForm initial={modal.initial} onSubmit={saveProperty} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.type === 'lease' && (
        <Modal title={modal.initial ? 'Edit lease' : 'Add lease'} onClose={() => setModal(null)}>
          {properties.length ? <LeaseForm initial={modal.initial} properties={properties} onSubmit={saveLease} onCancel={() => setModal(null)} /> : <p className="muted-cell">Add a property first.</p>}
        </Modal>
      )}
      {modal?.type === 'transaction' && (
        <Modal title={modal.initial ? 'Edit sale transaction' : 'Add sale transaction'} onClose={() => setModal(null)}>
          {properties.length ? <TransactionForm initial={modal.initial} properties={properties} onSubmit={saveTransaction} onCancel={() => setModal(null)} /> : <p className="muted-cell">Add a property first.</p>}
        </Modal>
      )}
    </div>
  );
}
