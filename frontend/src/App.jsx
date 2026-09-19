import { useState } from 'react';
import Header from './components/Header.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Manage from './pages/Manage.jsx';

export default function App() {
  const [view, setView] = useState('dashboard');

  return (
    <div className="app-shell">
      <Header view={view} setView={setView} />
      <main className="app-main">
        {view === 'dashboard' ? <Dashboard /> : <Manage />}
      </main>
    </div>
  );
}
