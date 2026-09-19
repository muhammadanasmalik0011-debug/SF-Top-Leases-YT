const BASE = import.meta.env.VITE_API_BASE_URL || '';

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

const json = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  listProperties: (located = false) => req(`/properties${located ? '?located=true' : ''}`),
  createProperty: (body) => req('/properties', json('POST', body)),
  updateProperty: (id, body) => req(`/properties/${id}`, json('PUT', body)),
  deleteProperty: (id) => req(`/properties/${id}`, { method: 'DELETE' }),

  listLeases: () => req('/leases'),
  createLease: (body) => req('/leases', json('POST', body)),
  updateLease: (id, body) => req(`/leases/${id}`, json('PUT', body)),
  deleteLease: (id) => req(`/leases/${id}`, { method: 'DELETE' }),

  listTransactions: () => req('/transactions'),
  createTransaction: (body) => req('/transactions', json('POST', body)),
  updateTransaction: (id, body) => req(`/transactions/${id}`, json('PUT', body)),
  deleteTransaction: (id) => req(`/transactions/${id}`, { method: 'DELETE' }),

  leaseSummary: () => req('/stats/lease-summary'),
  leasingByMonth: () => req('/stats/leasing-by-month'),
  termBuckets: () => req('/stats/term-buckets'),
};
