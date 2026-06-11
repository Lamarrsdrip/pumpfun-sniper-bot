import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, AlertTriangle, Banknote, Bot, CheckCircle2, ChevronRight, KeyRound, Search, ShieldCheck, Users, WalletCards } from 'lucide-react';
import './styles.css';

type Overview = { mode: 'DEMO' | 'LIVE'; users: { total: number; active: number; restricted: number; pendingKyc: number }; money: Record<string, string>; operations: { openRiskCases: number; pendingApprovals: number; activeIncidents: number }; providers: Record<string, Provider>; features: Record<string, boolean> };
type User = { id: string; mode: string; name: string; email: string; phone: string; status: string; kycStatus: string; lastActiveAt: string; notes: string[] };
type MoneyRequest = { id: string; userId: string; type: 'DEPOSIT' | 'WITHDRAWAL'; amountMinor: string; feeMinor: string; status: string; provider: string; reference: string; bankName?: string; accountNumber?: string; accountName?: string; createdAt: string };
type Trade = { id: string; userId: string; tokenId: string; side: string; amountMinor: string; feeMinor: string; status: string; createdAt: string };
type Token = { id: string; name: string; symbol: string; mint: string; runnerScore: number; riskScore: number; liquidityNgn: string; volume24hNgn: string; holders: number; change24h: number; source: string; moderation?: { classification: string; hidden: boolean; featured: boolean } };
type KycCase = { id: string; userId: string; status: string; provider: string; submittedAt?: string; reviewReason?: string };
type Provider = { key: string; family: string; displayName: string; enabled: boolean; priority: number; configured: boolean; status: string; secret: string; setupUrl?: string; docsUrl?: string; requiredFields?: string[]; featureUnlocked?: string; lastError?: string };
type Audit = { id: string; actorId: string; action: string; targetType: string; targetId: string; reason: string; createdAt: string };
type Campaign = { id: string; name: string; channel: string; audience: string; status: string; scheduledAt?: string; createdAt: string };
type Incident = { id: string; title: string; severity: string; status: string; notes: string[]; affectedRecords: string[]; createdAt: string };
type OperationsSettings = { depositFeePercent: number; swapFeePercent: number; botFeePercent: number; withdrawalFeePercent: number; cryptoWithdrawalMarginPercent: number; minimumDepositNgn: number; maximumWithdrawalNgn: number; dailyUserLimitNgn: number; proMonthlyNgn: number; eliteMonthlyNgn: number };
type BotControl = { userId: string; name: string; settings: { active: boolean; riskLevel: string } | null };
type CopyTrader = { userId: string; name: string; enabled: boolean; riskRating: 'LOW' | 'MEDIUM' | 'HIGH'; trades: number; winRate: number; copiedVolumeNgn: string; reviewedAt?: string };
type Notice = { tone: 'success' | 'warning'; text: string };

const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8790';
const nav = ['Overview', 'Users & KYC', 'Virtual Accounts', 'Deposits', 'Withdrawals', 'AI Payments', 'P2P Orders', 'Bill Payments', 'Trades', 'Runner AI', 'Auto Sniper', 'Copy Trading', 'Campaign Center', 'Providers & API Keys', 'Fees & Limits', 'Audit Log', 'Incidents', 'Launch Checklist'];

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
    <aside><div className="brand"><span>MZ</span><div><strong>MemeZo</strong><small>Business operations</small></div></div><nav>{nav.map((item) => <button key={item} className={selected === item ? 'active' : ''} onClick={() => setSelected(item)}>{item}<ChevronRight /></button>)}</nav></aside>
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
  if (selected === 'Virtual Accounts') return <RecordsPage mode={mode} title="Virtual account operations" endpoint="/v1/admin/virtual-accounts" collection="accounts" />;
  if (selected === 'AI Payments') return <RecordsPage mode={mode} title="AI payment review" endpoint="/v1/admin/ai-payments" collection="payments" />;
  if (selected === 'P2P Orders') return <RecordsPage mode={mode} title="P2P merchant orders" endpoint="/v1/admin/p2p-orders" collection="orders" />;
  if (selected === 'Bill Payments') return <RecordsPage mode={mode} title="Bill-payment operations" endpoint="/v1/admin/bill-payments" collection="payments" />;
  if (selected === 'Trades') return <TradesPage mode={mode} />;
  if (selected === 'Runner AI') return <TokensPage mode={mode} />;
  if (selected === 'Providers & API Keys') return <ProvidersPage mode={mode} notice={notice} />;
  if (selected === 'Campaign Center') return <CampaignCenter mode={mode} notice={notice} />;
  if (selected === 'Auto Sniper') return <BotAdmin mode={mode} notice={notice} />;
  if (selected === 'Copy Trading') return <CopyTradingAdmin mode={mode} notice={notice} />;
  if (selected === 'Fees & Limits') return <FeesLimits mode={mode} notice={notice} />;
  if (selected === 'Incidents') return <IncidentsPage mode={mode} notice={notice} />;
  if (selected === 'Launch Checklist') return <LaunchChecklist overview={overview} />;
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
  const [tokens, setTokens] = useState<Token[]>([]);
  const load = () => request<{ tokens: Token[] }>('/v1/admin/tokens', {}, mode).then((value) => setTokens(value.tokens));
  useEffect(() => { void load(); }, [mode]);
  const moderate = async (item: Token, update: Partial<{ classification: string; hidden: boolean; featured: boolean }>) => {
    await request(`/v1/admin/tokens/${item.id}`, { method: 'PATCH', body: JSON.stringify({ ...update, reason: `Runner AI review for ${item.symbol}` }) }, mode);
    void load();
  };
  return <Panel title="Runner AI monitor" subtitle="Review, feature, hide or classify observed market tokens"><Table headers={['Token', 'Contract', 'Runner', 'Risk', 'Liquidity', 'Holders', 'Moderation', 'Actions']}>{tokens.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.symbol} · {item.source}</small></td><td className="mono">{item.mint.slice(0, 8)}…{item.mint.slice(-6)}</td><td><Score value={item.runnerScore} /></td><td><Score value={item.riskScore} risk /></td><td>{naira(item.liquidityNgn)}<small>Vol {naira(item.volume24hNgn)}</small></td><td>{item.holders.toLocaleString()}</td><td><Badge value={item.moderation?.hidden ? 'HIDDEN' : item.moderation?.featured ? 'FEATURED' : item.moderation?.classification || 'DEFAULT'} /></td><td className="actions"><button className="table-action" onClick={() => moderate(item, { featured: !item.moderation?.featured, hidden: false })}>{item.moderation?.featured ? 'Unfeature' : 'Feature'}</button><button className="table-muted" onClick={() => moderate(item, { classification: item.moderation?.classification === 'RISKY' ? 'DEFAULT' : 'RISKY' })}>Risky</button><button className="table-danger" onClick={() => moderate(item, { hidden: !item.moderation?.hidden, featured: false })}>{item.moderation?.hidden ? 'Restore' : 'Hide'}</button></td></tr>)}</Table></Panel>;
}

function ProvidersPage({ mode, notice }: { mode: 'DEMO' | 'LIVE'; notice: (value: Notice) => void }) {
  const [providers, setProviders] = useState<Provider[]>([]); const [open, setOpen] = useState(''); const [values, setValues] = useState<Record<string, string>>({}); const load = () => request<Provider[]>('/v1/admin/providers', {}, mode).then(setProviders); useEffect(() => { void load(); }, [mode]);
  const change = async (item: Provider, enabled: boolean) => { await request(`/v1/admin/providers/${item.key}`, { method: 'PATCH', body: JSON.stringify({ enabled, reason: enabled ? 'Enabled by administrator' : 'Disabled by administrator' }) }, mode); notice({ tone: 'success', text: `${item.displayName} ${enabled ? 'enabled' : 'disabled'}.` }); void load(); };
  const test = async (item: Provider) => { const result = await request<{ message: string }>(`/v1/admin/providers/${item.key}/test`, { method: 'POST' }, mode); notice({ tone: item.configured ? 'success' : 'warning', text: `${item.displayName}: ${result.message}` }); };
  const save = async (item: Provider) => {
    const credentials = Object.fromEntries((item.requiredFields || []).map((field) => [field, values[`${item.key}:${field}`] || '']));
    try { await request(`/v1/admin/providers/${item.key}/configure`, { method: 'POST', body: JSON.stringify({ credentials, publicConfig: {} }) }, mode); notice({ tone: 'success', text: `${item.displayName} configuration saved securely. Run Test next.` }); void load(); }
    catch (error) { notice({ tone: 'warning', text: error instanceof Error ? error.message : 'Configuration failed.' }); }
  };
  const grouped = useMemo(() => providers.reduce<Record<string, Provider[]>>((groups, item) => {
    (groups[item.family] ||= []).push(item);
    return groups;
  }, {}), [providers]);
  return <div className="stack">{Object.entries(grouped).map(([family, items]) => <Panel key={family} title={`${family} providers`} subtitle="Credentials are sent only to the backend secret-storage endpoint"><div className="provider-grid">{items?.map((item) => <div className="provider-card" key={item.key}><div><strong>{item.displayName}</strong><small>Priority {item.priority} · {item.secret}</small></div><Badge value={item.status} /><p>{item.featureUnlocked || `Enables ${item.family} services`}</p><div className="provider-buttons"><a href={item.setupUrl} target="_blank" rel="noreferrer">Get credentials</a><button className="table-muted" onClick={() => setOpen(open === item.key ? '' : item.key)}>Configure</button><button className="table-muted" onClick={() => test(item)}>Test</button><button className={item.enabled ? 'table-danger' : 'table-action'} onClick={() => change(item, !item.enabled)}>{item.enabled ? 'Disable' : 'Enable'}</button></div>{open === item.key && <div className="provider-form">{(item.requiredFields || []).map((field) => <label key={field}>{field}<input type={/secret|key|password|credential/i.test(field) ? 'password' : 'text'} value={values[`${item.key}:${field}`] || ''} onChange={(event) => setValues({ ...values, [`${item.key}:${field}`]: event.target.value })} /></label>)}<button onClick={() => save(item)}>Save securely</button></div>}</div>)}</div></Panel>)}</div>;
}

function CampaignCenter({ mode, notice }: { mode: 'DEMO' | 'LIVE'; notice: (value: Notice) => void }) {
  const [form, setForm] = useState({ name: '', channel: 'EMAIL', subject: '', body: '', segment: 'ALL', schedule: '' });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const load = () => request<{ campaigns: Campaign[] }>('/v1/admin/campaigns', {}, mode).then((value) => setCampaigns(value.campaigns));
  useEffect(() => { void load(); }, [mode]);
  const submit = async (event: FormEvent, submitForApproval = false) => {
    event.preventDefault();
    try {
      await request('/v1/admin/campaigns', { method: 'POST', body: JSON.stringify({ name: form.name, channel: form.channel, subject: form.subject || undefined, body: form.body, audience: form.segment, scheduledAt: form.schedule ? new Date(form.schedule).toISOString() : undefined, submitForApproval, segment: { marketingConsentRequired: true } }) }, mode);
      notice({ tone: 'success', text: submitForApproval ? 'Campaign submitted for approval.' : 'Campaign saved as draft.' });
      setForm({ name: '', channel: 'EMAIL', subject: '', body: '', segment: 'ALL', schedule: '' });
      void load();
    } catch (error) { notice({ tone: 'warning', text: error instanceof Error ? error.message : 'Campaign failed.' }); }
  };
  const approve = async (campaign: Campaign) => {
    try { await request(`/v1/admin/campaigns/${campaign.id}/approve`, { method: 'POST' }, mode); notice({ tone: 'success', text: `${campaign.name} approved.` }); void load(); }
    catch (error) { notice({ tone: 'warning', text: error instanceof Error ? error.message : 'Approval failed.' }); }
  };
  return <div className="stack"><Panel title="Campaign Center" subtitle="Consent-aware email, push, and in-app broadcasts"><form className="campaign-form" onSubmit={(event) => submit(event, false)}><label>Campaign name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Channel<select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}><option>EMAIL</option><option>PUSH</option><option>IN_APP</option></select></label><label>Audience<select value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })}><option value="ALL">All consented users</option><option value="KYC_APPROVED">KYC-approved users</option><option value="INACTIVE">Inactive users</option><option value="BOUNTY_USERS">Bounty users</option><option value="TRADERS">Traders</option></select></label><label>Subject<input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label><label className="wide">Message<textarea required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label><label>Schedule<input type="datetime-local" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} /></label><div className="wide actions"><button type="submit" className="table-muted">Save draft</button><button type="button" className="table-action" onClick={(event) => submit(event, true)}>Submit for approval</button></div></form></Panel><Panel title="Campaign delivery queue" subtitle="Drafts, approvals, schedules and delivery status"><Table headers={['Campaign', 'Channel', 'Audience', 'Schedule', 'Status', 'Action']}>{campaigns.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{date(item.createdAt)}</small></td><td>{item.channel}</td><td>{item.audience}</td><td>{item.scheduledAt ? date(item.scheduledAt) : 'Immediate after approval'}</td><td><Badge value={item.status} /></td><td>{item.status === 'PENDING_APPROVAL' && <button className="table-action" onClick={() => approve(item)}>Approve</button>}</td></tr>)}</Table></Panel></div>;
}

function FeesLimits({ mode, notice }: { mode: 'DEMO' | 'LIVE'; notice: (value: Notice) => void }) {
  const [settings, setSettings] = useState<OperationsSettings | null>(null);
  useEffect(() => { request<{ settings: OperationsSettings }>('/v1/admin/settings', {}, mode).then((value) => setSettings(value.settings)); }, [mode]);
  if (!settings) return <Panel title="Fees & Limits" subtitle="Loading current policy"><p>Loading…</p></Panel>;
  const save = async (event: FormEvent) => {
    event.preventDefault();
    try { await request('/v1/admin/settings', { method: 'PUT', body: JSON.stringify(settings) }, mode); notice({ tone: 'success', text: `${mode} fees and limits saved with an audit record.` }); }
    catch (error) { notice({ tone: 'warning', text: error instanceof Error ? error.message : 'Settings failed.' }); }
  };
  const fields: Array<[keyof OperationsSettings, string]> = [['depositFeePercent','Naira deposit fee (%)'],['withdrawalFeePercent','Naira withdrawal fee (%)'],['cryptoWithdrawalMarginPercent','Crypto withdrawal margin (%)'],['swapFeePercent','Swap spread (%)'],['botFeePercent','Sniper fee (%)'],['minimumDepositNgn','Minimum deposit (₦)'],['maximumWithdrawalNgn','Maximum withdrawal (₦)'],['dailyUserLimitNgn','Daily user limit (₦)'],['proMonthlyNgn','Pro monthly price (₦)'],['eliteMonthlyNgn','Elite monthly price (₦)']];
  return <Panel title="Fees & Limits" subtitle={`${mode} policy changes are versioned in the audit trail`}><form className="campaign-form" onSubmit={save}>{fields.map(([key, label]) => <label key={key}>{label}<input type="number" min="0" step="0.01" value={settings[key]} onChange={(event) => setSettings({ ...settings, [key]: Number(event.target.value) })} /></label>)}<div className="wide actions"><button className="table-action" type="submit">Save fees and limits</button></div></form></Panel>;
}

function IncidentsPage({ mode, notice }: { mode: 'DEMO' | 'LIVE'; notice: (value: Notice) => void }) {
  const [items, setItems] = useState<Incident[]>([]); const [title, setTitle] = useState(''); const [severity, setSeverity] = useState('MEDIUM'); const [note, setNote] = useState('');
  const load = () => request<{ incidents: Incident[] }>('/v1/admin/incidents', {}, mode).then((value) => setItems(value.incidents));
  useEffect(() => { void load(); }, [mode]);
  const create = async (event: FormEvent) => { event.preventDefault(); await request('/v1/admin/incidents', { method: 'POST', body: JSON.stringify({ title, severity, note, affectedRecords: [] }) }, mode); setTitle(''); setNote(''); notice({ tone: 'success', text: 'Incident opened and added to the audit trail.' }); void load(); };
  const resolve = async (item: Incident) => { await request(`/v1/admin/incidents/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'RESOLVED', note: 'Resolved by operations administrator' }) }, mode); notice({ tone: 'success', text: `${item.title} resolved.` }); void load(); };
  return <div className="stack"><Panel title="Open an incident" subtitle="Track operational, payment, trading or security events"><form className="campaign-form" onSubmit={create}><label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label><label>Severity<select value={severity} onChange={(event) => setSeverity(event.target.value)}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label><label className="wide">Initial note<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label><div className="wide actions"><button className="table-action">Create incident</button></div></form></Panel><Panel title="Incident register" subtitle="Ownership, severity and resolution state"><Table headers={['Incident', 'Severity', 'Opened', 'Status', 'Action']}>{items.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.notes.at(-1)}</small></td><td><Badge value={item.severity} /></td><td>{date(item.createdAt)}</td><td><Badge value={item.status} /></td><td>{item.status !== 'RESOLVED' && <button className="table-action" onClick={() => resolve(item)}>Resolve</button>}</td></tr>)}</Table></Panel></div>;
}

function BotAdmin({ mode, notice }: { mode: 'DEMO' | 'LIVE'; notice: (value: Notice) => void }) {
  const [users, setUsers] = useState<BotControl[]>([]);
  const load = () => request<{ users: BotControl[] }>('/v1/admin/bot-controls', {}, mode).then((value) => setUsers(value.users));
  useEffect(() => { void load(); }, [mode]);
  const toggle = async (item: BotControl) => { const active = !item.settings?.active; await request(`/v1/admin/bot-controls/${item.userId}`, { method: 'PATCH', body: JSON.stringify({ active }) }, mode); notice({ tone: active ? 'success' : 'warning', text: `${item.name} bot ${active ? 'enabled' : 'stopped'}.` }); void load(); };
  return <Panel title="Auto Sniper operations" subtitle="Per-user bot state and emergency control"><Table headers={['User', 'Risk style', 'State', 'Action']}>{users.map((item) => <tr key={item.userId}><td><strong>{item.name}</strong><small>{item.userId}</small></td><td>{item.settings?.riskLevel || 'Not configured'}</td><td><Badge value={item.settings?.active ? 'ACTIVE' : 'STOPPED'} /></td><td><button className={item.settings?.active ? 'table-danger' : 'table-action'} onClick={() => toggle(item)}>{item.settings?.active ? 'Stop bot' : 'Enable bot'}</button></td></tr>)}</Table></Panel>;
}

function CopyTradingAdmin({ mode, notice }: { mode: 'DEMO' | 'LIVE'; notice: (value: Notice) => void }) {
  const [traders, setTraders] = useState<CopyTrader[]>([]);
  const load = () => request<{ traders: CopyTrader[] }>('/v1/admin/copy-traders', {}, mode).then((value) => setTraders(value.traders));
  useEffect(() => { void load(); }, [mode]);
  const update = async (item: CopyTrader, enabled: boolean) => {
    await request(`/v1/admin/copy-traders/${item.userId}`, { method: 'PATCH', body: JSON.stringify({ enabled, riskRating: item.riskRating, reason: enabled ? 'Performance profile approved' : 'Copy profile suspended by risk review' }) }, mode);
    notice({ tone: enabled ? 'success' : 'warning', text: `${item.name} copy profile ${enabled ? 'enabled' : 'disabled'}.` });
    void load();
  };
  return <Panel title="Copy Trading review" subtitle="Eligibility is controlled separately from social rankings"><Table headers={['Trader', 'Risk', 'Trades', 'Win rate', 'Copied volume', 'Status', 'Action']}>{traders.map((item) => <tr key={item.userId}><td><strong>{item.name}</strong><small>{item.userId}</small></td><td><Badge value={item.riskRating} /></td><td>{item.trades}</td><td>{item.winRate.toFixed(1)}%</td><td>{naira(item.copiedVolumeNgn)}</td><td><Badge value={item.enabled ? 'ACTIVE' : 'DISABLED'} /></td><td><button className={item.enabled ? 'table-danger' : 'table-action'} onClick={() => update(item, !item.enabled)}>{item.enabled ? 'Disable copy' : 'Enable copy'}</button></td></tr>)}</Table></Panel>;
}

function LaunchChecklist({ overview }: { overview: Overview | null }) {
  const providers = Object.values(overview?.providers || {}); const requiredFamilies = ['payments','identity','kyc','marketData','trading','custody','transactionRisk','email','push','observability']; const required = providers.filter((p) => requiredFamilies.includes(p.family));
  const release = ['App name and store metadata', 'Bundle ID and package name', 'Icons and splash', 'Privacy policy and terms', 'Risk disclosure', 'Support email', 'Delete account flow', 'Production API URL', 'Crash reporting', 'TestFlight build', 'Google Play internal test'];
  const connectedFamilies = new Set(required.filter((p) => p.configured && p.enabled).map((p) => p.family));
  return <div className="panel-grid"><Panel title="Provider readiness" subtitle={`${connectedFamilies.size}/${requiredFamilies.length} required capabilities configured`}><div className="compact-list">{required.map(item => <div className="list-row" key={item.key}><div><strong>{item.displayName}</strong><small>{item.featureUnlocked || item.family}</small></div><Badge value={item.status} /></div>)}</div></Panel><Panel title="Store release checklist" subtitle="Evidence required before submission"><div className="compact-list">{release.map(item => <div className="list-row" key={item}><strong>{item}</strong><Badge value="PENDING" /></div>)}</div></Panel></div>;
}

function AuditPage({ mode }: { mode: 'DEMO' | 'LIVE' }) {
  const [events, setEvents] = useState<Audit[]>([]); useEffect(() => { request<{ events: Audit[] }>('/v1/admin/audit', {}, mode).then((value) => setEvents(value.events)); }, [mode]);
  return <Panel title="Immutable action trail" subtitle="Actor, decision, target, reason and time"><Table headers={['Time', 'Actor', 'Action', 'Target', 'Reason']}>{events.map((item) => <tr key={item.id}><td>{date(item.createdAt)}</td><td>{item.actorId}</td><td><strong>{item.action.replaceAll('_', ' ')}</strong></td><td>{item.targetType}<small>{item.targetId}</small></td><td>{item.reason}</td></tr>)}</Table></Panel>;
}

function OperationalModule({ name, mode }: { name: string; mode: string }) {
  return <Panel title={name} subtitle={`${mode} operations`}><p>This module has no records in the selected environment.</p></Panel>;
}

function RecordsPage({ mode, title, endpoint, collection }: { mode: 'DEMO' | 'LIVE'; title: string; endpoint: string; collection: string }) {
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    request<Record<string, Array<Record<string, unknown>>>>(endpoint, {}, mode)
      .then((value) => setRecords(value[collection] || []))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Records could not be loaded.'));
  }, [mode, endpoint, collection]);
  const keys = records.length ? Object.keys(records[0]).filter((key) => !['instruction', 'riskFlags'].includes(key)).slice(0, 8) : [];
  return <Panel title={title} subtitle="Live backend records with Demo and Live isolation">{error ? <div className="notice warning">{error}</div> : records.length ? <Table headers={keys.map((key) => key.replaceAll(/([A-Z])/g, ' $1'))}>{records.map((record, index) => <tr key={String(record.id || index)}>{keys.map((key) => <td key={key}>{formatRecordValue(record[key])}</td>)}</tr>)}</Table> : <p>No records exist in the selected environment.</p>}</Panel>;
}

function formatRecordValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'None';
  if (typeof value === 'string' && /^\d{13,}$/.test(value)) return naira(Number(value) / 100);
  if (typeof value === 'string' && value.includes('T') && !Number.isNaN(Date.parse(value))) return date(value);
  return String(value ?? '—');
}

function Metric({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) { return <div className="metric">{icon}<div><small>{label}</small><strong>{value}</strong></div></div>; }
function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) { return <section className="panel"><div className="panel-head"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>; }
function Table({ headers, children }: { headers: string[]; children: ReactNode }) { return <div className="table-wrap"><table><thead><tr>{headers.map((item) => <th key={item}>{item}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Badge({ value }: { value: string }) { const good = /ACTIVE|APPROVED|CONNECTED|CONFIRMED|PAID|BUY/.test(value); const bad = /SUSPENDED|REJECTED|FAILED|DISABLED|SELL/.test(value); return <span className={`badge ${good ? 'good' : bad ? 'bad' : 'warn'}`}>{value.replaceAll('_', ' ')}</span>; }
function Score({ value, risk = false }: { value: number; risk?: boolean }) { const good = risk ? value < 40 : value >= 80; return <span className={`score ${good ? 'score-good' : 'score-warn'}`}>{value}</span>; }
function naira(value: string | number | undefined) { return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(Number(value || 0)); }
function date(value?: string) { return value ? new Date(value).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not submitted'; }

createRoot(document.getElementById('root')!).render(<App />);
