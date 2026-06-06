import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError } from '@/api';
import { Button, Card, Screen, formatNaira } from '@/components';
import { dark, spacing } from '@/theme';

type Quote = { token: { name: string; symbol: string }; side: 'BUY' | 'SELL'; amountNgn: string; feeNgn: string; estimatedQuantity: string; slippagePercent: number; expiresAt: string };

export default function TradeReview() {
  const { mint, side = 'BUY' } = useLocalSearchParams<{ mint: string; side?: 'BUY' | 'SELL' }>();
  const [amount, setAmount] = useState('10000');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const getQuote = async () => {
    setBusy(true);
    try { setQuote(await api('/v1/trades/quote', { method: 'POST', body: JSON.stringify({ mint, side, amountNgn: Number(amount) }) })); setMessage(''); }
    catch (cause) { setMessage(cause instanceof ApiError ? cause.message : 'Quote failed.'); }
    finally { setBusy(false); }
  };
  const execute = async () => {
    setBusy(true);
    try {
      const result = await api<{ balanceNgn: string; warning: string }>('/v1/trades/execute', { method: 'POST', body: JSON.stringify({ mint, side, amountNgn: Number(amount), idempotencyKey: `mobile-${side}-${mint}-${Date.now()}` }) });
      setMessage(`${side === 'BUY' ? 'Buy' : 'Sell'} confirmed. Available cash: ${formatNaira(result.balanceNgn)}. ${result.warning}`);
      setTimeout(() => router.replace('/(tabs)/portfolio'), 1200);
    } catch (cause) { setMessage(cause instanceof ApiError ? cause.message : 'Execution failed.'); }
    finally { setBusy(false); }
  };
  return <Screen><Text style={styles.title}>{side === 'BUY' ? 'Buy token' : 'Sell token'}</Text><Text style={styles.body}>The server calculates price, fees and output before confirmation.</Text><Card>
    <Text style={styles.label}>Amount in Naira</Text><TextInput value={amount} onChangeText={(value) => { setAmount(value); setQuote(null); }} keyboardType="number-pad" style={styles.input} />
    {quote ? <View style={styles.quote}><Line label="Token" value={`${quote.token.name} (${quote.token.symbol})`} /><Line label="Amount" value={formatNaira(quote.amountNgn)} /><Line label="Platform + execution fee" value={formatNaira(quote.feeNgn)} /><Line label="Estimated tokens" value={Number(quote.estimatedQuantity).toLocaleString()} /><Line label="Max slippage" value={`${quote.slippagePercent}%`} /></View> : null}
    {message ? <Text style={styles.message}>{message}</Text> : null}
    <Button title={quote ? (busy ? 'Confirming...' : `Confirm ${side === 'BUY' ? 'buy' : 'sell'}`) : (busy ? 'Getting quote...' : 'Review quote')} disabled={busy || Number(amount) < 100} onPress={quote ? execute : getQuote} />
  </Card><Text style={styles.warning}>Meme coins are highly volatile. Demo trades are simulated; Live trades remain unavailable until verified execution and custody providers are deployed.</Text></Screen>;
}
function Line({ label, value }: { label: string; value: string }) { return <View style={styles.line}><Text style={styles.label}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={styles.value}>{value}</Text></View>; }
const styles = StyleSheet.create({ title: { color: dark.text, fontSize: 26, fontWeight: '900' }, body: { color: dark.muted, lineHeight: 21, marginVertical: spacing.md }, label: { color: dark.muted, fontSize: 12 }, input: { minHeight: 52, color: dark.text, fontSize: 20, backgroundColor: dark.surfaceRaised, borderWidth: 1, borderColor: dark.border, borderRadius: 8, paddingHorizontal: 14, marginTop: 7, marginBottom: 12 }, quote: { marginBottom: 12 }, line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark.border }, value: { color: dark.text, fontWeight: '800', flex: 1, textAlign: 'right' }, message: { color: dark.green, lineHeight: 18, marginBottom: 12 }, warning: { color: dark.yellow, fontSize: 11, lineHeight: 17, marginTop: 14 } });
