import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { api, ApiError } from '@/api';
import { Button, Card, Label } from '@/components';
import { dark, spacing } from '@/theme';

type Settings = { active: boolean; riskLevel: 'SAFE' | 'BALANCED' | 'SNIPER'; maxTradeNgn: number; takeProfitPercent: number; stopLossPercent: number; dailyLossLimitPercent: number };
const defaults: Settings = { active: false, riskLevel: 'BALANCED', maxTradeNgn: 10000, takeProfitPercent: 30, stopLossPercent: 12, dailyLossLimitPercent: 5 };

export default function BotScreen() {
  const [settings, setSettings] = useState(defaults); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api<{ settings: Settings }>('/v1/bot/settings').then((value) => setSettings(value.settings)).catch(() => {}); }, []);
  const save = async (next = settings) => {
    setBusy(true);
    try { const result = await api<{ settings: Settings; message: string }>('/v1/bot/settings', { method: 'PUT', body: JSON.stringify(next) }); setSettings(result.settings); setMessage(result.message); }
    catch (cause) { setMessage(cause instanceof ApiError ? cause.message : 'Bot settings could not be saved.'); }
    finally { setBusy(false); }
  };
  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <Card tone="warning"><Text style={styles.warning}>Auto Sniper is optional</Text><Text style={styles.body}>It never guarantees profit. Demo monitoring is available; Live activation stays blocked until audited execution and custody are connected.</Text></Card>
    <Card><View style={styles.row}><View><Text style={styles.title}>Scanner automation</Text><Label>{settings.active ? 'Monitoring in Demo mode' : 'Stopped'}</Label></View><Switch value={settings.active} disabled={busy} onValueChange={(active) => save({ ...settings, active })} trackColor={{ true: dark.green }} /></View>
      <Text style={styles.heading}>Risk style</Text><View style={styles.presets}>{(['SAFE', 'BALANCED', 'SNIPER'] as const).map((item) => <Text onPress={() => setSettings({ ...settings, riskLevel: item })} key={item} style={[styles.preset, settings.riskLevel === item && styles.presetActive]}>{item}</Text>)}</View>
      <Field label="Maximum per trade (₦)" value={settings.maxTradeNgn} onChange={(value) => setSettings({ ...settings, maxTradeNgn: value })} />
      <Field label="Take profit target (%)" value={settings.takeProfitPercent} onChange={(value) => setSettings({ ...settings, takeProfitPercent: value })} />
      <Field label="Hard stop loss (%)" value={settings.stopLossPercent} onChange={(value) => setSettings({ ...settings, stopLossPercent: value })} />
      <Field label="Daily loss stop (%)" value={settings.dailyLossLimitPercent} onChange={(value) => setSettings({ ...settings, dailyLossLimitPercent: value })} />
      {message ? <Text style={styles.message}>{message}</Text> : null}<Button title={busy ? 'Saving limits...' : 'Save risk controls'} disabled={busy} onPress={() => save()} />
    </Card>
    <Text style={styles.note}>The AI explanation layer cannot approve trades or bypass these limits. Pattern memory remains advisory and versioned.</Text>
  </ScrollView>;
}
function Field({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <View style={styles.setting}><Text style={styles.settingText}>{label}</Text><TextInput value={String(value)} onChangeText={(text) => onChange(Number(text) || 0)} keyboardType="number-pad" style={styles.input} /></View>; }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: dark.background }, content: { padding: spacing.md, gap: 12, paddingBottom: 40 }, warning: { color: dark.yellow, fontWeight: '900', fontSize: 16 }, body: { color: dark.muted, lineHeight: 20, marginTop: 7 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }, title: { color: dark.text, fontSize: 20, fontWeight: '900' }, heading: { color: dark.text, fontWeight: '800', marginBottom: 8 }, presets: { flexDirection: 'row', gap: 7, marginBottom: 10 }, preset: { color: dark.muted, borderWidth: 1, borderColor: dark.border, borderRadius: 6, padding: 8, fontSize: 11, fontWeight: '800' }, presetActive: { color: dark.green, borderColor: dark.green, backgroundColor: dark.greenSoft }, setting: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: dark.border }, settingText: { color: dark.text, flex: 1 }, input: { width: 82, color: dark.text, textAlign: 'right', borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surfaceRaised, borderRadius: 6, padding: 8 }, message: { color: dark.green, fontSize: 12, lineHeight: 18, marginVertical: 10 }, note: { color: dark.muted, fontSize: 11, lineHeight: 17 } });
