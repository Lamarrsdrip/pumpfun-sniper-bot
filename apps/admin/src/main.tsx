import { FormEvent, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, AlertTriangle, Banknote, Bell, Bot, CheckCircle2, KeyRound, LoaderCircle, Mail, ShieldCheck, Users } from 'lucide-react';
import './styles.css';

type Overview = {
  users: { total: number; active: number; restricted: number; pendingKyc: number };
  money: { depositsPendingNgn: string; withdrawalsPendingNgn: string; revenueTodayNgn: string };
  operations: { openRiskCases: number; pendingApprovals: number; activeIncidents: number };
  providers: Record<string, { configured: boolean; status: string }>;
  features: Record<string, boolean>;
};

type Notice = { tone: 'success' | 'warning'; text: string };

const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8790';
const navItems = ['Overview', 'Users & KYC', 'Deposits', 'Withdrawals', 'Trades', 'Runner AI', 'Auto Sniper', 'Copy trading', 'Social safety', 'Campaigns', 'Providers & API keys', 'Fees & limits', 'Audit log', 'Incidents'];

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined && init.body !== null;
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'The action could not be completed.');
  return body as T;
}

function App() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [selected, setSelected] = useState('Overview');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const [busy, setBusy] = useState('');

  const load = async () => {
    try {
      setOverview(await request<Overview>('/v1/admin/overview'));
      setNotice(null);
    } catch {
      setNotice({ tone: 'warning', text: 'Admin API unavailable. Start the API service and check VITE_API_URL.' });
    }
  };

  useEffect(() => { void load(); }, []);

  const testProvider = async (key: string) => {
    setBusy(`provider-${key}`);
    try {
      const result = await request<{ status: string }>(`/v1/admin/providers/${key}/test`, { method: 'POST' });
      setNotice({ tone: result.status === 'CONFIGURED' ? 'success' : 'warning', text: `${key}: ${result.status.toLowerCase()}.` });
    } catch (error) {
      setNotice({ tone: 'warning', text: error instanceof Error ? error.message : 'Provider test failed.' });
    } finally {
      setBusy('');
    }
  };

  const requestEmergencyPause = async () => {
    setBusy('emergency');
    try {
      const result = await request<{ status: string }>('/v1/admin/emergency/trading/pause', { method: 'POST' });
      setNotice({ tone: 'warning', text: `Trading pause request created: ${result.status}. A second approval is required.` });
    } catch (error) {
      setNotice({ tone: 'warning', text: error instanceof Error ? error.message : 'Emergency request failed.' });
    } finally {
      setBusy('');
    }
  };

  return (
    <main>
      <aside>
        <div className="brand"><span>NM</span><div><strong>NairaMeme</strong><small>Control plane</small></div></div>
        {navItems.map((item) => <button className={selected === item ? 'active' : ''} onClick={() => setSelected(item)} key={item}>{item}</button>)}
      </aside>
      <section className="content">
        <header>
          <div><h1>{selected}</h1><p>Financial controls, provider health, risk and growth systems.</p></div>
          <button className="danger" onClick={requestEmergencyPause} disabled={busy === 'emergency'}>
            {busy === 'emergency' ? <LoaderCircle className="spin" /> : <AlertTriangle />} Request trading pause
          </button>
        </header>
        {notice && <div className={notice.tone === 'success' ? 'notice success' : 'notice warning'}>{notice.tone === 'success' ? <CheckCircle2 /> : <AlertTriangle />}<span>{notice.text}</span></div>}
        {selected === 'Overview' ? (
          <OverviewWorkspace overview={overview} onProviderTest={testProvider} busy={busy} onCreateCampaign={() => { setCampaignOpen(true); setSelected('Campaigns'); }} />
        ) : selected === 'Campaigns' ? (
          <CampaignWorkspace open={campaignOpen} setOpen={setCampaignOpen} setNotice={setNotice} setBusy={setBusy} busy={busy} />
        ) : selected === 'Providers & API keys' ? (
          <ProviderWorkspace overview={overview} onProviderTest={testProvider} busy={busy} />
        ) : (
          <ModuleWorkspace name={selected} overview={overview} />
        )}
      </section>
    </main>
  );
}

function OverviewWorkspace({ overview, onProviderTest, busy, onCreateCampaign }: { overview: Overview | null; onProviderTest: (key: string) => void; busy: string; onCreateCampaign: () => void }) {
  return <>
    <div className="metrics">
      <Metric icon={<Users />} label="Active users" value={overview?.users.active ?? 0} />
      <Metric icon={<Banknote />} label="Pending deposits" value={`₦${overview?.money.depositsPendingNgn ?? '0.00'}`} />
      <Metric icon={<ShieldCheck />} label="Risk cases" value={overview?.operations.openRiskCases ?? 0} />
      <Metric icon={<Activity />} label="Incidents" value={overview?.operations.activeIncidents ?? 0} />
    </div>
    <div className="grid">
      <ProviderCard overview={overview} onProviderTest={onProviderTest} busy={busy} />
      <article>
        <div className="head"><div><h2>Platform switches</h2><p>Sensitive features remain closed until their release gates pass.</p></div><AlertTriangle /></div>
        <div className="providers">{Object.entries(overview?.features || {}).map(([key, enabled]) => <div className="provider" key={key}><strong>{key}</strong><span className={enabled ? 'ok' : 'off'}>{enabled ? 'Enabled' : 'Disabled'}</span></div>)}</div>
      </article>
      <article>
        <div className="head"><div><h2>Campaign center</h2><p>Email, push and in-app broadcasts with consent segmentation.</p></div><Mail /></div>
        <div className="empty"><Bell /><strong>No campaign selected</strong><p>Create a draft, verify the provider, request approval, then schedule delivery.</p><button onClick={onCreateCampaign}>Create campaign</button></div>
      </article>
      <article>
        <div className="head"><div><h2>Trading systems</h2><p>Runner AI, Auto Sniper and copy-trading supervision.</p></div><Bot /></div>
        <div className="empty"><Activity /><strong>No verified live execution provider</strong><p>Real-money actions remain disabled until execution, compliance and custody gates pass.</p></div>
      </article>
    </div>
  </>;
}

function ProviderWorkspace({ overview, onProviderTest, busy }: { overview: Overview | null; onProviderTest: (key: string) => void; busy: string }) {
  return <div className="single-grid">
    <ProviderCard overview={overview} onProviderTest={onProviderTest} busy={busy} />
    <article>
      <div className="head"><div><h2>Credential storage</h2><p>API secrets must never be saved in this browser.</p></div><KeyRound /></div>
      <div className="policy">
        <strong>Server-side secret manager required</strong>
        <p>Set <code>SECRET_MANAGER_PROVIDER</code> and enable an audited adapter before credential entry is allowed. The API deliberately rejects secrets until then.</p>
      </div>
    </article>
  </div>;
}

function ProviderCard({ overview, onProviderTest, busy }: { overview: Overview | null; onProviderTest: (key: string) => void; busy: string }) {
  return <article>
    <div className="head"><div><h2>Provider and API control</h2><p>Statuses come from backend environment checks.</p></div><KeyRound /></div>
    <div className="providers">{Object.entries(overview?.providers || {}).map(([key, state]) =>
      <div className="provider" key={key}>
        <div><strong>{key}</strong><small>{state.status}</small></div>
        <div className="provider-actions"><span className={state.configured ? 'ok' : 'off'}>{state.configured ? 'Configured' : 'Required'}</span><button className="small-button" onClick={() => onProviderTest(key)} disabled={busy === `provider-${key}`}>{busy === `provider-${key}` ? 'Testing' : 'Test'}</button></div>
      </div>)}</div>
  </article>;
}

function CampaignWorkspace({ open, setOpen, setNotice, setBusy, busy }: { open: boolean; setOpen: (open: boolean) => void; setNotice: (notice: Notice) => void; setBusy: (value: string) => void; busy: string }) {
  const [form, setForm] = useState({ name: '', subject: '', body: '', channel: 'EMAIL' });
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('campaign');
    try {
      const result = await request<{ status: string }>('/v1/admin/campaigns', {
        method: 'POST',
        body: JSON.stringify({ ...form, segment: { marketingConsentRequired: true } })
      });
      setNotice({ tone: 'success', text: `Campaign draft created: ${result.status}.` });
      setOpen(false);
      setForm({ name: '', subject: '', body: '', channel: 'EMAIL' });
    } catch (error) {
      setNotice({ tone: 'warning', text: error instanceof Error ? error.message : 'Campaign draft failed.' });
    } finally {
      setBusy('');
    }
  };

  return <div className="single-grid">
    <article>
      <div className="head"><div><h2>Broadcast campaigns</h2><p>Marketing consent filtering and second-admin approval are mandatory.</p></div><Mail /></div>
      {!open ? <div className="empty"><Bell /><strong>No draft open</strong><p>Create a controlled message for opted-in recipients.</p><button onClick={() => setOpen(true)}>Create campaign</button></div> :
        <form onSubmit={submit}>
          <label>Campaign name<input required minLength={3} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Channel<select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}><option>EMAIL</option><option>PUSH</option><option>IN_APP</option></select></label>
          <label>Subject<input maxLength={160} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
          <label>Message<textarea required rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
          <div className="form-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>Cancel</button><button type="submit" disabled={busy === 'campaign'}>{busy === 'campaign' ? 'Checking provider...' : 'Create approval draft'}</button></div>
        </form>}
    </article>
  </div>;
}

function ModuleWorkspace({ name, overview }: { name: string; overview: Overview | null }) {
  const readiness = name === 'Deposits' || name === 'Withdrawals' ? overview?.providers.payments?.configured : name === 'Trades' || name === 'Auto Sniper' || name === 'Copy trading' ? overview?.providers.trading?.configured : false;
  return <div className="single-grid"><article><div className="head"><div><h2>{name}</h2><p>This module is represented in the production data model and release controls.</p></div><ShieldCheck /></div><div className="empty"><Activity /><strong>{readiness ? 'Provider configured; audited workflow pending' : 'Release gate not ready'}</strong><p>No operation will be simulated. Configure the required provider, authentication, approvals and audit storage before enabling this module.</p></div></article></div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return <div className="metric">{icon}<div><small>{label}</small><strong>{value}</strong></div></div>;
}

createRoot(document.getElementById('root')!).render(<App />);
