import { useState } from 'react';
import LocationPicker from '../../components/LocationPicker.jsx';

export default function PropertyForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    address: initial?.address || '',
    display_name: initial?.display_name || '',
    image_url: initial?.image_url || '',
    latitude: initial?.latitude ?? null,
    longitude: initial?.longitude ?? null,
  });
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  function handlePick({ lat, lon, address }) {
    setForm((current) => ({
      ...current,
      latitude: lat,
      longitude: lon,
      address: address || current.address,
      display_name: current.display_name || (address ? address.split(',')[0] : ''),
    }));
  }

  async function save() {
    if (!form.address.trim()) return alert('Choose/search a property address first.');
    if (form.latitude == null || form.longitude == null) return alert('Place the property pin on the map.');
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  }

  return (
    <div>
      <div className="form-intro">
        <strong>Building information</strong>
        <span>Search for the property on the map. Coordinates are captured automatically and are not entered manually.</span>
      </div>

      <div className="grid-2">
        <div className="field"><label>Display name</label><input value={form.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder="e.g. 300 Howard" /></div>
        <div className="field"><label>Building photo URL <em>optional</em></label><input value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" /></div>
      </div>
      <div className="field"><label>Address</label><input value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Filled when you choose a map search result" /></div>
      <div className="field"><label>Property location</label><LocationPicker value={{ lat: form.latitude, lon: form.longitude, address: form.address }} onChange={handlePick} /></div>

      <div className="form-actions">
        <button className="btn secondary" type="button" onClick={onCancel}>Cancel</button>
        <button className="btn" type="button" onClick={save} disabled={saving || form.latitude == null}>{saving ? 'Saving…' : 'Save property'}</button>
      </div>
    </div>
  );
}
