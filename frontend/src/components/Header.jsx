export default function Header({ view, setView }) {
  return (
    <header className="topbar">
      <button className="brand fieldset-brand" onClick={() => setView('dashboard')} aria-label="Open market dashboard">
        <span className="brand-mark fieldset-mark">B3</span>
        <span className="brand-copy">
          <strong>SF Top Leases YTD</strong>
          <small>cc@redcarltd.com</small>
        </span>
      </button>

      <nav className="topnav" aria-label="Primary navigation">
        <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
          Market
        </button>
        <button className={view === 'manage' ? 'active' : ''} onClick={() => setView('manage')}>
          Property Manager
        </button>
      </nav>
    </header>
  );
}
