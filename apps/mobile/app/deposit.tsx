import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '@/api';
import {
  Button, Card, ConfirmSheet, FormInput, InfoRow,
  ModePill, Notice, Page, ReceiptCard, SectionHeader, TrustStripe,
} from '@/components';
import { dark } from '@/theme';

type Method = 'naira' | 'crypto';
type Stage = 'form' | 'receipt';

type DepositResult = {
  request: { amountMinor: string; status: string; reference: string };
  instructions: { bankName: string; accountName: string; accountNumber: string; reference: string };
  feeNgn: string;
  netCreditNgn: string;
};

const PRESETS = ['5,000', '10,000', '20,000', '50,000', '100,000', '200,000'];

export default function DepositScreen() {
  const [method, setMethod] = useState<Method>('naira');
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const [result, setResult] = useState<DepositResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const numeric = Number(amount.replace(/,/g, ''));
  const fee = numeric * 0.005;
  const net = numeric - fee;
  const valid = numeric >= 1000;

  const handleAmountChange = (v: string) => {
    const n = parseInt(v.replace(/[^0-9]/g, '') || '0', 10);
    setAmount(n ? n.toLocaleString() : '');
  };

  const handleConfirm = async () => {
    setConfirmVisible(false);
    setBusy(true);
    setError('');
    try {
      const res = await api<DepositResult>('/v1/deposits', {
        method: 'POST',
        body: JSON.stringify({ amountNgn: numeric }),
      });
      setResult(res);
      setStage('receipt');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Deposit request failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (stage === 'receipt' && result) {
    return (
      <Page>
        <ReceiptCard
          title="Transfer details ready"
          status="pending"
          rows={[
            { label: 'Bank', value: result.instructions.bankName },
            { label: 'Account name', value: result.instructions.accountName },
            { label: 'Account number', value: result.instructions.accountNumber, copy: true },
            { label: 'Reference', value: result.instructions.reference, copy: true },
            { label: 'Fee (0.5%)', value: `₦${parseFloat(result.feeNgn).toLocaleString()}` },
            { label: 'You will receive', value: `₦${parseFloat(result.netCreditNgn).toLocaleString()}` },
          ]}
          onClose={() => { setStage('form'); setResult(null); setAmount(''); }}
        />
        <Notice
          tone="info"
          icon="information-circle-outline"
          title="How to complete this transfer"
          body="Open your bank app and transfer the exact amount above. Use the reference exactly as shown. Your wallet will be credited after admin confirmation (usually within 15 minutes)."
        />
        <Notice
          tone="warning"
          body="Each deposit has a unique reference. Do not reuse this reference for future deposits."
        />
        <Button title="Done" onPress={() => router.back()} />
      </Page>
    );
  }

  return (
    <Page>
      <Text style={st.title}>Add money</Text>
      <Text style={st.sub}>Fund your wallet with a Nigerian bank transfer or crypto deposit.</Text>
      <ModePill compact />

      {/* Method selector */}
      <View style={{ flexDirection: 'row', gap: 9 }}>
        <MethodTab
          active={method === 'naira'}
          icon="business"
          title="Bank transfer"
          sub="Naira · Instant reference"
          color={dark.green}
          onPress={() => setMethod('naira')}
        />
        <MethodTab
          active={method === 'crypto'}
          icon="logo-bitcoin"
          title="Crypto deposit"
          sub="USDT · USDC · BTC · ETH"
          color={dark.purple}
          onPress={() => { setMethod('crypto'); router.push('/crypto-deposit'); }}
        />
      </View>

      {method === 'naira' && (
        <>
          <Card>
            <Text style={st.label}>Amount to deposit</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Text style={st.nairaSign}>₦</Text>
              <View style={{ flex: 1 }}>
                <FormInput
                  label=""
                  value={amount}
                  onChangeText={handleAmountChange}
                  numeric
                  placeholder="0"
                  hint=""
                />
              </View>
            </View>

            {/* Quick amounts */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4 }}>
              {PRESETS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setAmount(p)}
                  style={[st.preset, amount === p && { backgroundColor: dark.greenSoft, borderColor: dark.green }]}
                >
                  <Text style={[st.presetText, amount === p && { color: dark.green }]}>₦{p}</Text>
                </Pressable>
              ))}
            </View>

            {/* Fee preview */}
            {valid ? (
              <View style={st.feeBox}>
                <FeeRow label="Deposit amount" value={`₦${numeric.toLocaleString()}`} />
                <FeeRow label="Processing fee (0.5%)" value={`-₦${fee.toFixed(2)}`} />
                <View style={st.feeLine} />
                <FeeRow label="You will receive" value={`₦${net.toFixed(2)}`} highlight />
              </View>
            ) : null}

            {amount && !valid ? (
              <Text style={{ color: dark.red, fontSize: 12, marginTop: 6 }}>Minimum deposit is ₦1,000</Text>
            ) : null}

            {error ? <Notice tone="danger" body={error} /> : null}

            <Button
              title="Get transfer details"
              onPress={() => setConfirmVisible(true)}
              disabled={!valid}
              icon="arrow-forward"
            />
          </Card>

          <Card>
            <SectionHeader title="How it works" />
            <View style={{ gap: 14, marginTop: 10 }}>
              {steps.map((step) => (
                <View key={step.n} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <View style={st.stepNum}>
                    <Text style={{ color: dark.green, fontWeight: '900', fontSize: 11 }}>{step.n}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: dark.text, fontWeight: '900', fontSize: 13 }}>{step.title}</Text>
                    <Text style={{ color: dark.muted, fontSize: 11, marginTop: 2, lineHeight: 16 }}>{step.body}</Text>
                  </View>
                </View>
              ))}
            </View>
          </Card>

          <TrustStripe />
        </>
      )}

      <ConfirmSheet
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        onConfirm={handleConfirm}
        title="Confirm deposit"
        cta="Get transfer details"
        busy={busy}
      >
        <View style={{ marginVertical: 4 }}>
          <InfoRow label="Amount" value={`₦${numeric.toLocaleString()}`} />
          <InfoRow label="Fee (0.5%)" value={`-₦${fee.toFixed(2)}`} />
          <InfoRow label="You will receive" value={`₦${net.toFixed(2)}`} />
          <InfoRow label="Method" value="Nigerian bank transfer" />
        </View>
        <Notice
          tone="info"
          body="You will receive bank account details to complete this transfer manually."
        />
      </ConfirmSheet>
    </Page>
  );
}

function MethodTab({ active, icon, title, sub, color, onPress }: {
  active: boolean; icon: keyof typeof Ionicons.glyphMap;
  title: string; sub: string; color: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[st.methodTab, active && { backgroundColor: `${color}14`, borderColor: `${color}50` }]}
    >
      <Ionicons name={icon} color={active ? color : dark.muted} size={20} />
      <Text style={[{ color: dark.muted, fontWeight: '900', fontSize: 13, marginTop: 4 }, active && { color }]}>{title}</Text>
      <Text style={{ color: dark.muted, fontSize: 10 }}>{sub}</Text>
    </Pressable>
  );
}

function FeeRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
      <Text style={{ color: dark.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: highlight ? dark.green : dark.text, fontWeight: '800', fontSize: 12 }}>{value}</Text>
    </View>
  );
}

const steps = [
  { n: '1', title: 'Get transfer details', body: 'We generate a unique bank account and reference for your deposit.' },
  { n: '2', title: 'Make the transfer', body: 'Send the exact amount from your bank app using the provided details and reference.' },
  { n: '3', title: 'Confirmation', body: 'Admin verifies your payment and credits your MemeZo wallet — usually within 15 minutes.' },
];

const st = StyleSheet.create({
  title: { color: dark.text, fontSize: 28, fontWeight: '900' },
  sub: { color: dark.muted, fontSize: 14, lineHeight: 20 },
  label: { color: dark.mutedStrong, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  nairaSign: { color: dark.green, fontSize: 26, fontWeight: '900', marginBottom: 10 },
  preset: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: dark.surfaceRaised, borderWidth: 1, borderColor: dark.border },
  presetText: { color: dark.muted, fontSize: 11, fontWeight: '800' },
  feeBox: { backgroundColor: dark.surfaceRaised, borderRadius: 10, padding: 12, marginTop: 12, marginBottom: 4 },
  feeLine: { height: 1, backgroundColor: dark.border, marginVertical: 5 },
  methodTab: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 3 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: dark.greenSoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
