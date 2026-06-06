import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, AlertTriangle, Banknote, Bot, CheckCircle2, ChevronRight, KeyRound, Search, ShieldCheck, Users, WalletCards } from 'lucide-react';
import './styles.css';

type Overview = { mode: 'DEMO' | 'LIVE'; users: { total: number; active: number; restricted: number; pendingKyc: number }; money: Record<string, string>; operations: { openRiskCases: number; pendingApprovals: number; activeIncidents: number }; providers: Record<string, Provider>; features: Record<string, boolean> };
type User = { id: string; mode: string; name: string; email: string; phone: string; status: string; kycStatus: string; lastActiveAt: string; notes: string[] };
type MoneyRequest = { id: string; userId: string; type: 'DEPOSIT' | 'WITHDRAWAL'; amountMinor: string; feeMinor: string; status: string; provider: string; reference: string; bankName?: string; accountNumber?: string; accountName?: string; createdAt: string };
type Trade = { id: string; userId: string; tokenId: string; side: string; amountMinor: string; feeMinor: string; status: string; createdAt: string };
type Token = { id: string; name: string; symbol: string; mint: string; runnerScore: number; riskScore: number; liquidityNgn: string; volume24hNgn: string; holders: number; change24h: number; source: string };
type KycCase = { id: string; userId: string; status: string; provider: string; submittedAt?: string; reviewReason?: string };
type Provider = { key: string; family: string; displayName: string; enabled: boolean; priority: number; configured: boolean; status: string; secret: string };
type Audit = { id: string; actorId: string; action: string; targetType: string; targetId: string; reason: string; createdAt: string };
type Notice = { tone: 'success' | 'warning'; text: string };

const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8790';
const nav = ['Overview', 'Users & KYC', 'Deposits', 'Withdrawals', 'Trades', 'Runner AI', 'Auto Sniper', 'Copy Trading', 'Campaigns & Earn', 'Providers & API Keys', 'Fees & Limits', 'Audit Log', 'Incidents'];

async function request<T>(path: string, init: RequestInit = {}, mode: 'DEMO' | 'LIVE' = 'DEMO'): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', 'X-App-Mode': mode, ...init.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || 'The action could not be completed.');
  return body as T;
}

function App() {
  const [selected, setSelected] = useState('Overview');
  const [mode, setMode] = useState<'DEMO' | 'LIVE'>('DEMO');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const refresh = () => request<Overview>(`/v1/admin/overview?mode=${mode}`, {}, mode).then(setOverview).catch((error) => setNotice({ tone: 'warning', text: error.message }));
  useEffect(() => { void refresh(); }, [mode]);
  return <main>
    <aside><div className="brand"><span>NM</span><div><strong>NairaMeme</strong><small>Business operations</small></div></div><nav>{nav.map((item) => <button key={item} className={selected === item ? 'active' : ''} onClick={() => setSelected(item)}>{item}<ChevronRight /></button>)}</nav></aside>
    <section className="content">
      <header><div><p className="eyebrow">{mode} OPERATIONS</p><h1>{selected}</h1><p>Operate users, money movement, markets, providers and controls from one place.</p></div><div className="header-actions"><div className="mode-switch"><button className={mode === 'DEMO' ? 'selected' : ''} onClick={() => setMode('DEMO')}>Demo</button><button className={mode === 'LIVE' ? 'selected live' : ''} onClick={() => setMode('LIVE')}>Live</button></div><button className="danger" onClick={() => request('/v1/admin/emergency/trading/pause', { method: 'POST' }, mode).then(() => setNotice({ tone: 'warning', text: 'Emergency pause request recorded for approval.' }))}><AlertTriangle /> Emergency pause</button></div></header>
      {mode === 'DEMO' && <div className="demo-banner"><ShieldCheck /> Demo operations use sample users and money. Live records remain isolated.</div>}
      {notice && <div className={`notice ${notice.tone}`}><span>{notice.text}</span><button onClick={() => setNotice(null)}>Close</button></div>}
      <Workspace selected={selected} mode={mode} overview={overview} notice={setNotice} refresh={refresh} />
    </section>
  </main>;
}

function Workspace({ selected, mode, overview, notice, refresh }: { selected: string; mode: 'DEMO' | 'LIVE'; overview: Overview | null; notice: (value: Notice) => void; refresh: () => void }) {
  if (selected === 'Overview') return <OverviewPage data={overview} />;
  if (selected === 'Users & KYC') return <UsersPage mode={mode} notice={notice} />;
  if (selected === 'Deposits') return <MoneyPage mode={mode} type="DEPOSIT" notice={notice} refresh={refresh} />;
  if (selected === 'Withdrawals') return <MoneyPage mode={mode} type="WITHDRAWAL" notice={notice} refresh={refresh} />;
  if (selected === 'Trades') return <TradesPage mode={mode} />;
  if (selected === 'Runner AI') return <TokensPage mode={mode} />;
  if (selected === 'Providers & API Keys') return <ProvidersPage mode={mode} notice={notice} />;
  if (selected === 'Audit Log') return <AuditPage mode={mode} />;
  return <OperationalModule name={selected} mode={mode} />;
}

function OverviewPage({ data }: { data: Overview | null }) {
  const metrics = [
    ['Total users', data?.users.total || 0, <Users />], ['Active users', data?.users.active || 0, <Activity />],
    ['Deposits today', naira(data?.money.depositsTodayNgn), <Banknote />], ['Withdrawals today', naira(data?.money.withdrawalsTodayNgn), <WalletCards />],
    ['Trading volume', naira(data?.money.tradingVolumeNgn), <Activity />], ['Fees earned', naira(data?.money.revenueTodayNgn), <Banknote />],
    ['Pending approvals', data?.operations.pendingApprovals || 0, <ShieldCheck />], ['Risk alerts', data?.operations.openRiskCases || 0, <AlertTriangle />]
  ] as const;
  return <><div className="metrics">{metrics.map(([label, value, icon]) => <Metric key={label} label={label} value={value} icon={icon} />)}</div><div className="panel-grid">
    <Panel title="Provider health" subtitle="Configuration and priority from the backend"><div className="compact-list">{Object.values(data?.providers || {}).slice(0, 8).map((item) => <div className="list-row" key={item.key}><div><strong>{item.displayName}</strong><small>{item.family} · priority {item.priority}</small></div><Badge value={item.status} /></div>)}</div></Panel>
    <Panel title="System controls" subtitle="The app fails closed when a real provider is missing"><div className="system-state"><CheckCircle2 /><div><strong>Demo ledger operational</strong><p>Deposits, withdrawals, fees and trades are auditable.</p></div></div><div className="system-state warning-state"><AlertTriangle /><div><strong>Live execution disabled</strong><p>Requires production custody, provider webhooks and deployment approval.</p></div></div></Panel>
  </div></>;
}

function UsersPage({ mode, notice }: { mode: 'DEMO' | 'LIVE'; notice: (value: Notice) => void }) {
  const [users, setUsers] = useState<User[]>([]); const [cases, setCases] = useState<KycCase[]>([]); const [query, setQuery] = useState('');
  const load = () => Promise.all([request<{ users: User[] }>(`/v1/admin/users?mode=${mode}&q=${encodeURIComponent(query)}`, {}, mode), request<{ cases: KycCase[] }>('/v1/admin/kyc', {}, mode)]).then(([a, b]) => { setUsers(a.users); setCases(b.cases.filter((item) => users.length === 0 || true)); });
  useEffect(() => { void load(); }, [mode]);
  const updateUser = async (user: User, status: 'ACTIVE' | 'SUSPENDED') => {
    await request(`/v1/admin/users/${user.id}`, { method: 'PATCH', body: JSON.stringify({ status, reason: `${status === 'SUSPENDED' ? 'Risk review' : 'Admin review completed'}` }) }, mode); notice({ tone: 'success', text: `${user.name} is now ${status.toLowerCase()}.` }); void load();
  };
  const decide = async (item: KycCase, decision: string) => {
    await request(`/v1/admin/kyc/${item.id}/decision`, { method: 'POST', body: JSON.stringify({ decision, reason: `Admin ${decision.toLowerCase().replaceAll('_', ' ')}` }) }, mode); notice({ tone: 'success', text: `KYC case ${decision.toLowerCase()}.` }); void load();
  };
  return <div className="stack"><Panel title="User directory" subtitle="Search identity, status and account activity"><div className="toolbar"><div className="search"><Search /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, email, phone or user ID" /></div><button onClick={load}>Search</button></div><Table headers={['User', 'Contact', 'KYC', 'Status', 'Last active', 'Actions']}>{users.map((user) => <tr key={user.id}><td><strong>{user.name}</strong><small>{user.id}</small></td><td>{user.email}<small>{user.phone}</small></td><td><Badge value={user.kycStatus} /></td><td><Badge value={user.status} /></td><td>{date(user.lastActiveAt)}</td><td><button className={user.status === 'ACTIVE' ? 'table-danger' : 'table-action'} onClick={() => updateUser(user, user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}>{user.status === 'ACTIVE' ? 'Suspend' : 'Unsuspend'}</button></td></tr>)}</Table></Panel>
    <Panel title="KYC review queue" subtitle="Approve, reject or ask for more information"><Table headers={['Case', 'User', 'Provider', 'Submitted', 'Status', 'Decision']}>{cases.filter((item) => users.some((user) => user.id === item.userId)).map((item) => <tr key={item.id}><td>{item.id}</td><td>{users.find((user) => user.id === item.userId)?.name || item.userId}</td><td>{item.provider}</td><td>{date(item.submittedAt)}</td><td><Badge value={item.status} /></td><td className="actions"><button className="table-action" onClick={() => decide(item, 'APPROVED')}>Approve</button><button className="table-muted" onClick={() => decide(item, 'MORE_INFORMATION_REQUIRED')}>Request info</button><button className="table-danger" onClick={() => decide(item, 'REJECTED')}>Reject</button></td></tr>)}</Table></Panel></div>;
}

function MoneyPage({ mode, type, notice, refresh }: { mode: 'DEMO' | 'LIVE'; type: 'DEPOSIT' | 'WITHDRAWAL'; notice: (value: Notice) => void; refresh: () => void }) {
  const [items, setItems] = useState<MoneyRequest[]>([]); const [filter, setFilter] = useState('');
  const load = () => request<{ requests: MoneyRequest[] }>(`/v1/admin/money-requests?mode=${mode}&type=${type}${filter ? `&status=${filter}` : ''}`, {}, mode).then((value) => setItems(value.requests));
  useEffect(() => { void load(); }, [mode, filter, type]);
  const decide = async (item: MoneyRequest, decision: string) => {
    try { await request(`/v1/admin/money-requests/${item.id}/decision`, { method: 'POST', body: JSON.stringify({ decision, reason: `Admin verified ${item.reference}` }) }, mode); notice({ tone: 'success', text: `${item.reference} marked ${decision.toLowerCase()}.` }); void load(); refresh(); }
    catch (error) { notice({ tone: 'warning', text: error instanceof Error ? error.message : 'Action failed.' }); }
  };
  return <Panel title={`${type === 'DEPOSIT' ? 'Deposit' : 'Withdrawal'} operations`} subtitle="Every decision is recorded in the audit log"><div className="toolbar"><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="">All statuses</option><option>PENDING</option><option>CONFIRMED</option><option>PAID</option><option>REJECTED</option></select><Badge value={`${items.length} RECORDS`} /></div><Table headers={['Reference', 'User', 'Amount', 'Provider / Bank', 'Created', 'Status', 'Actions']}>{items.map((item) => <tr key={item.id}><td><strong>{item.reference}</strong><small>{item.id}</small></td><td>{item.userId}</td><td>{naira(Number(item.amountMinor) / 100)}<small>Fee {naira(Number(item.feeMinor) / 100)}</small></td><td>{item.bankName || item.provider}<small>{item.accountNumber ? `•••• ${item.accountNumber.slice(-4)}` : item.provider}</small></td><td>{date(item.createdAt)}</td><td><Badge value={item.status} /></td><td className="actions">{item.status === 'PENDING' && <><button className="table-action" onClick={() => decide(item, type === 'DEPOSIT' ? 'CONFIRMED' : 'PAID')}>{type === 'DEPOSIT' ? 'Approve' : 'Mark paid'}</button><button className="table-danger" onClick={() => decide(item, 'REJECTED')}>Reject</button></>}</td></tr>)}</Table></Panel>;
}

function TradesPage({ mode }: { mode: 'DEMO' | 'LIVE' }) {
  const [items, setItems] = useState<Trade[]>([]); useEffect(() => { request<{ trades: Trade[] }>('/v1/admin/trades', {}, mode).then((value) => setItems(value.trades)); }, [mode]);
  return <Panel title="Trade supervision" subtitle="Confirmed and failed executions including charged fees"><Table headers={['Trade ID', 'User', 'Token', 'Side', 'Gross amount', 'Fee', 'Status', 'Time']}>{items.map((item) => <tr key={item.id}><td>{item.id.slice(0, 16)}…</td><td>{item.userId}</td><td>{item.tokenId}</td><td><Badge value={item.side} /></td><td>{naira(Number(item.amountMinor) / 100)}</td><td>{naira(Number(item.feeMinor) / 100)}</td><td><Badge value={item.status} /></td><td>{date(item.createdAt)}</td></tr>)}</Table></Panel>;
}

function TokensPage({ mode }: { mode: 'DEMO' | 'LIVE' }) {
  const [tokens, setTokens] = useState<Token[]>([]); useEffect(() => { request<{ tokens: Token[] }>('/v1/admin/tokens', {}, mode).then((value) => setTokens(value.tokens)); }, [mode]);
  return <Panel title="Runner AI monitor" subtitle="Newest token observations first; no tokens are generated in Live mode"><Table headers={['Token', 'Contract', 'Runner', 'Risk', 'Liquidity', 'Volume', 'Holders', 'Movement', 'Source']}>{tokens.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.symbol}</small></td><td className="mono">{item.mint.slice(0, 8)}…{item.mint.slice(-6)}</td><td><Score value={item.runnerScore} /></td><td><Score value={item.riskScore} risk /></td><td>{naira(item.liquidityNgn)}</td><td>{naira(item.volume24hNgn)}</td><td>{item.holders.toLocaleString()}</td><td className={item.change24h >= 0 ? 'positive' : 'negative'}>{item.change24h > 0 ? '+' : ''}{item.change24h.toFixed(1)}%</td><td>{item.source}</td></tr>)}</Table></Panel>;
}

function ProvidersPage({ mode, notice }: { mode: 'DEMO' | 'LIVE'; notice: (value: Notice) => void }) {
  const [providers, setProviders] = useState<Provider[]>([]); const load = () => request<Provider[]>('/v1/admin/providers', {}, mode).then(setProviders); useEffect(() => { void load(); }, [mode]);
  const change = async (item: Provider, enabled: boolean) => { await request(`/v1/admin/providers/${item.key}`, { method: 'PATCH', body: JSON.stringify({ enabled, reason: enabled ? 'Enabled by administrator' : 'Disabled by administrator' }) }, mode); notice({ tone: 'success', text: `${item.displayName} ${enabled ? 'enabled' : 'disabled'}.` }); void load(); };
  const test = async (item: Provider) => { const result = await request<{ message: string }>(`/v1/admin/providers/${item.key}/test`, { method: 'POST' }, mode); notice({ tone: item.configured ? 'success' : 'warning', text: `${item.displayName}: ${result.message}` }); };
  const grouped = useMemo(() => providers.reduce<Record<string, Provider[]>>((groups, item) => {
    (groups[item.family] ||= []).push(item);
    return groups;
  }, {}), [providers]);
  return <div className="stack">{Object.entries(grouped).map(([family, items]) => <Panel key={family} title={`${family} providers`} subtitle="Enable, prioritize and test adapters without changing mobile code"><div className="provider-grid">{items?.map((item) => <div className="provider-card" key={item.key}><div><strong>{item.displayName}</strong><small>Priority {item.priority} · {item.secret}</small></div><Badge value={item.status} /><div className="provider-buttons"><button className="table-muted" onClick={() => test(item)}>Test</button><button className={item.enabled ? 'table-danger' : 'table-action'} onClick={() => change(item, !item.enabled)}>{item.enabled ? 'Disable' : 'Enable'}</button></div></div>)}</div></Panel>)}</div>;
}

function AuditPage({ mode }: { mode: 'DEMO' | 'LIVE' }) {
  const [events, setEvents] = useState<Audit[]>([]); useEffect(() => { request<{ events: Audit[] }>('/v1/admin/audit', {}, mode).then((value) => setEvents(value.events)); }, [mode]);
  return <Panel title="Immutable action trail" subtitle="Actor, decision, target, reason and time"><Table headers={['Time', 'Actor', 'Action', 'Target', 'Reason']}>{events.map((item) => <tr key={item.id}><td>{date(item.createdAt)}</td><td>{item.actorId}</td><td><strong>{item.action.replaceAll('_', ' ')}</strong></td><td>{item.targetType}<small>{item.targetId}</small></td><td>{item.reason}</td></tr>)}</Table></Panel>;
}

function OperationalModule({ name, mode }: { name: string; mode: string }) {
  const guidance: Record<string, string[]> = {
    'Auto Sniper': ['Global emergency stop', 'Per-user limits', 'Bot PnL and trade history', 'Risk preset versioning'],
    'Copy Trading': ['Trader eligibility review', 'Risk-adjusted performance', 'Follower allocations', 'Copy profile suspension'],
    'Campaigns & Earn': ['Bounty creation', 'Submission review', 'Winner approval', 'Consent-aware email and push'],
    'Fees & Limits': ['Swap fee', 'Bot fee', 'Withdrawal fee', 'KYC-tier daily limits'],
    Incidents: ['Create incident', 'Assign severity', 'Link affected records', 'Resolve with audit notes']
  };
  return <Panel title={name} subtitle={`${mode} control surface`}><div className="module-list">{(guidance[name] || []).map((item) => <div key={item}><CheckCircle2 /><span>{item}</span><Badge value="BACKEND CONTRACT NEXT" /></div>)}</div><p className="module-note">This module does not perform a fake action. Its real workflow requires the corresponding persistence and provider adapter before activation.</p></Panel>;
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) { return <div className="metric">{icon}<div><small>{label}</small><strong>{value}</strong></div></div>; }
function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <section className="panel"><div className="panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>; }
function Table({ headers, children }: { headers: string[]; children: ReactNode }) { return <div className="table-wrap"><table><thead><tr>{headers.map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Badge({ value }: { value: string }) { const good = /ACTIVE|APPROVED|CONNECTED|CONFIRMED|PAID|BUY/.test(value); const bad = /SUSPENDED|REJECTED|FAILED|DISABLED|SELL/.test(value); return <span className={`badge ${good ? 'good' : bad ? 'bad' : 'warn'}`}>{value.replaceAll('_', ' ')}</span>; }
function Score({ value, risk = false }: { value: number; risk?: boolean }) { const good = risk ? value < 40 : value >= 80; return <span className={`score ${good ? 'score-good' : 'score-warn'}`}>{value}</span>; }
function naira(value: string | number | undefined) { return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(Number(value || 0)); }
function date(value?: string) { return value ? new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not submitted'; }

createRoot(document.getElementById('root')!).render(<App />);
