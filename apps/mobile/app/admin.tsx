import { useEffect, useState } from 'react';
import { Linking, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { api } from '@/api';
import { Button, ModePill, Page, SectionHeader } from '@/components';
import { dark } from '@/theme';

type Provider = { key: string; displayName: string; family: string; status: string; enabled: boolean; requiredFields?: string[]; setupUrl?: string };
type Overview = { users: { total: number; pendingKyc: number }; money: { depositsTodayNgn: string }; operations: { openRiskCases: number } };
const adminUrl = process.env.EXPO_PUBLIC_ADMIN_URL || '';

export default function AdminScreen() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [open, setOpen] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [overview, setOverview] = useState<Overview | null>(null);
  useEffect(() => {
    api<{ isAdmin: boolean }>('/v1/me').then((value) => {
      setAllowed(value.isAdmin);
      if (!value.isAdmin) router.replace('/profile');
      else Promise.all([
        api<Provider[]>('/v1/admin/providers'),
        api<Overview>('/v1/admin/overview')
      ]).then(([providerData, overviewData]) => {
        setProviders(providerData);
        setOverview(overviewData);
      });
    }).catch(() => router.replace('/profile'));
  }, []);
  if (!allowed) return <Page><Text style={{ color: dark.muted }}>Checking administrator access…</Text></Page>;
  const save = async (provider: Provider) => {
    const credentials = Object.fromEntries((provider.requiredFields || []).map((name) => [name, fields[`${provider.key}:${name}`] || '']));
    try {
      await api(`/v1/admin/providers/${provider.key}/configure`, { method: 'POST', body: JSON.stringify({ credentials, publicConfig: {} }) });
      setMessage(`${provider.displayName} saved. Run connection test next.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Configuration could not be saved.');
    }
  };
  const test = async (provider: Provider) => {
    try { const result = await api<{ message: string }>(`/v1/admin/providers/${provider.key}/test`, { method: 'POST' }); setMessage(`${provider.displayName}: ${result.message}`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Connection test failed.'); }
  };
  const toggleProvider = async (provider: Provider, enabled: boolean) => {
    try {
      await api(`/v1/admin/providers/${provider.key}`, { method: 'PATCH', body: JSON.stringify({ enabled, reason: `${enabled ? 'Enabled' : 'Disabled'} from mobile admin` }) });
      setProviders(providers.map((item) => item.key === provider.key ? { ...item, enabled } : item));
      setMessage(`${provider.displayName} ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Provider status could not be changed.');
    }
  };
  return <Page>
    <View><Text style={{ color: dark.red, fontSize: 11, fontWeight: '900' }}>ADMIN ACCESS</Text><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900', marginTop: 3 }}>Business operations</Text></View><ModePill />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}><Metric label="Users" value={String(overview?.users.total || 0)} /><Metric label="Pending KYC" value={String(overview?.users.pendingKyc || 0)} /><Metric label="Deposits today" value={`₦${Number(overview?.money.depositsTodayNgn || 0).toLocaleString()}`} /><Metric label="Risk alerts" value={String(overview?.operations.openRiskCases || 0)} /></View>
    {adminUrl ? <Button title="Open full operations center" onPress={() => Linking.openURL(adminUrl)} /> : null}
    <SectionHeader title="Providers & API keys" action={`${providers.filter(p => p.status === 'CONNECTED').length}/${providers.length} connected`} />
    {providers.map(provider => <View key={provider.key} style={{ padding: 14, borderRadius: 12, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 9 }}>
      <Pressable onPress={() => setOpen(open === provider.key ? '' : provider.key)} style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View><Text style={{ color: dark.text, fontWeight: '900' }}>{provider.displayName}</Text><Text style={{ color: dark.muted, fontSize: 10 }}>{provider.family}</Text></View><Text style={{ color: provider.status === 'CONNECTED' ? dark.green : dark.yellow, fontSize: 10 }}>{provider.status}</Text></Pressable>
      {open === provider.key && <>{provider.requiredFields?.map(name => <View key={name}><Text style={{ color: dark.muted, fontSize: 10, marginBottom: 5 }}>{name}</Text><TextInput secureTextEntry={/secret|key|password|credential/i.test(name)} value={fields[`${provider.key}:${name}`] || ''} onChangeText={(value) => setFields({ ...fields, [`${provider.key}:${name}`]: value })} style={{ minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surfaceRaised, color: dark.text, paddingHorizontal: 11 }} /></View>)}<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: dark.text }}>Enabled</Text><Switch value={provider.enabled} onValueChange={(value) => toggleProvider(provider, value)} /></View><Button title="Save configuration" onPress={() => save(provider)} /><Button title="Test connection" kind="secondary" onPress={() => test(provider)} />{provider.setupUrl ? <Text onPress={() => Linking.openURL(provider.setupUrl!)} style={{ color: dark.cyan, textAlign: 'center', padding: 8 }}>Get credentials from {provider.displayName}</Text> : null}</>}
    </View>)}
    {message ? <Text style={{ color: dark.yellow, lineHeight: 18 }}>{message}</Text> : null}<SectionHeader title="Emergency controls" /><Button title="Pause all live actions" kind="danger" onPress={() => api('/v1/admin/emergency/trading/pause', { method: 'POST' }).then(() => setMessage('Emergency pause request recorded.'))} />
  </Page>;
}
function Metric({ label, value }: { label: string; value: string }) { return <View style={{ flexBasis: '47%', flexGrow: 1, padding: 13, backgroundColor: dark.surface, borderRadius: 10 }}><Text style={{ color: dark.muted, fontSize: 10 }}>{label}</Text><Text style={{ color: dark.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{value}</Text></View>; }
