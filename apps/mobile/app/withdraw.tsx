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

type Stage = 'form' | 'receipt';

type WithdrawResult = {
  request: { reference: string; status: string; feeMinor: string };
};

const NIGERIAN_BANKS = [
  'Access Bank', 'First Bank', 'GTBank', 'Zenith Bank', 'UBA', 'Stanbic IBTC',
  'Fidelity Bank', 'Polaris Bank', 'Wema Bank', 'Ecobank', 'Sterling Bank',
  'Union Bank', 'Heritage Bank', 'Keystone Bank', 'Opay', 'Kuda Bank',
  'Palmpay', 'Moniepoint', 'VFD Bank', 'Carbon (Paylater)',
];

export default function WithdrawScreen() {
  const [method, setMethod] = useState<'naira' | 'crypto'>('naira');
  const [amount, setAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [stage, setStage] = useState<Stage>('form');
  const [result, setResult] = useState<WithdrawResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  const numeric = Number(amount.replace(/,/g, ''));
  const fee = Math.max(53, numeric * 0.015);
  const net = numeric - fee;
  const valid =
    method === 'naira'
      ? numeric >= 1000 && accountNumber.length === 10 && accountName.trim().length > 1 && bankName.length > 1
      : numeric >= 500;

  const handleAmountChange = (v: string) => {
    const n = parseInt(v.replace(/[^0-9]/g, '') || '0', 10);
    setAmount(n ? n.toLocaleString() : '');
  };

  const handleConfirm = async () => {
    setConfirmVisible(false);
    setBusy(true);
    setError('');
    try {
      const res = await api<WithdrawResult>('/v1/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          amountNgn: numeric,
          bankName,
          accountNumber,
          accountName,
        }),
      });
      setResult(res);
      setStage('receipt');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Withdrawal request failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const feeDisplay = `₦${fee.toFixed(2)}`;
  const netDisplay = `₦${net.toFixed(2)}`;

  if (stage === 'receipt' && result) {
    return (
      <Page>
        <ReceiptCard
          title="Withdrawal submitted"
          status="pending"
          rows={[
            { label: 'Reference', value: result.request.reference, copy: true },
            { label: 'Status', value: result.request.status },
            { label: 'Amount', value: `₦${numeric.toLocaleString()}` },
            { label: 'Fee', value: feeDisplay },
            { label: 'You will receive', value: netDisplay },
            { label: 'Bank', value: bankName },
            { label: 'Account', value: `${accountNumber} · ${accountName}` },
          ]}
          onClose={() => { setStage('form'); setResult(null); }}
        />
        <Notice
          tone="info"
          title="What happens next"
          body="Your withdrawal request is in the review queue. Admin will confirm and process the transfer to your bank account. You'll receive a notification when it's approved."
        />
        <Button title="Done" onPress={() => router.back()} />
      </Page>
    );
  }

  return (
    <Page>
      <Text style={st.title}>Withdraw money</Text>
      <Text style={st.sub}>Send Naira to your bank or withdraw supported crypto.</Text>
      <ModePill compact />

      {/* Method tabs */}
      <View style={{ flexDirection: 'row', gap: 9 }}>
        <MethodTab
          active={method === 'naira'}
          icon="business"
          title="Nigerian bank"
          sub="Instant bank transfer"
          color={dark.green}
          onPress={() => setMethod('naira')}
        />
        <MethodTab
          active={method === 'crypto'}
          icon="logo-bitcoin"
          title="Crypto wallet"
          sub="USDT · USDC · ETH"
          color={dark.purple}
          onPress={() => { setMethod('crypto'); router.push('/crypto-withdraw'); }}
        />
      </View>

      {method === 'naira' && (
        <>
          <Card>
            <Text style={st.sectionLabel}>Bank details</Text>

            {/* Bank picker */}
            <Pressable onPress={() => setShowBankPicker(!showBankPicker)} style={st.bankPicker}>
              <Text style={[st.bankPickerText, bankName && { color: dark.text }]}>
                {bankName || 'Select bank'}
              </Text>
              <Ionicons name={showBankPicker ? 'chevron-up' : 'chevron-down'} color={dark.muted} size={17} />
            </Pressable>

            {showBankPicker ? (
              <View style={st.bankList}>
                {NIGERIAN_BANKS.map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => { setBankName(b); setShowBankPicker(false); }}
                    style={[st.bankItem, bankName === b && { backgroundColor: dark.greenSoft }]}
                  >
                    <Text style={[{ color: dark.muted, fontWeight: '700', fontSize: 13 }, bankName === b && { color: dark.green }]}>{b}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <FormInput
              label="10-digit account number"
              value={accountNumber}
              onChangeText={(v) => setAccountNumber(v.replace(/[^0-9]/g, '').slice(0, 10))}
              numeric
              placeholder="0000000000"
              hint="Enter the 10-digit NUBAN account number"
            />
            <FormInput
              label="Account name"
              value={accountName}
              onChangeText={setAccountName}
              placeholder="As shown on your bank account"
              hint="Must match exactly as registered with the bank"
            />
          </Card>

          <Card>
            <Text style={st.sectionLabel}>Withdrawal amount</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={st.nairaSign}>₦</Text>
              <View style={{ flex: 1 }}>
                <FormInput label="" value={amount} onChangeText={handleAmountChange} numeric placeholder="0" hint="" />
              </View>
            </View>

            {numeric >= 1000 ? (
              <View style={st.feeBox}>
                <FeeRow label="Withdrawal amount" value={`₦${numeric.toLocaleString()}`} />
                <FeeRow label="Transfer fee" value={`-${feeDisplay}`} />
                <View style={st.feeLine} />
                <FeeRow label="Bank receives" value={netDisplay} highlight />
              </View>
            ) : null}

            {amount && numeric < 1000 ? (
              <Text style={{ color: dark.red, fontSize: 12 }}>Minimum withdrawal is ₦1,000</Text>
            ) : null}
          </Card>

          <Notice
            tone="info"
            body="Withdrawals go through admin review before processing. Most withdrawals are completed within 30 minutes during business hours."
          />

          {error ? <Notice tone="danger" body={error} /> : null}

          <Button
            title="Review withdrawal"
            onPress={() => { setError(''); setConfirmVisible(true); }}
            disabled={!valid}
            icon="arrow-forward"
          />

          <TrustStripe />
        </>
      )}

      <ConfirmSheet
        visible={confirmVisible}
        onClose={() => setConfirmVisible(false)}
        onConfirm={handleConfirm}
        title="Confirm withdrawal"
        cta="Submit withdrawal"
        busy={busy}
      >
        <View style={{ marginVertical: 6 }}>
          <InfoRow label="Amount" value={`₦${numeric.toLocaleString()}`} />
          <InfoRow label="Bank" value={bankName} />
          <InfoRow label="Account" value={accountNumber} />
          <InfoRow label="Account name" value={accountName} />
          <InfoRow label="Fee" value={feeDisplay} />
          <InfoRow label="You will receive" value={netDisplay} />
        </View>
        <Notice tone="warning" body="Ensure the account details are correct. Transfers to wrong accounts may not be recoverable." />
      </ConfirmSheet>
    </Page>
  );
}

function MethodTab({ active, icon, title, sub, color, onPress }: {
  active: boolean; icon: keyof typeof Ionicons.glyphMap;
  title: string; sub: string; color: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[st.methodTab, active && { backgroundColor: `${color}14`, borderColor: `${color}50` }]}>
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

const st = StyleSheet.create({
  title: { color: dark.text, fontSize: 28, fontWeight: '900' },
  sub: { color: dark.muted, fontSize: 14, lineHeight: 20 },
  sectionLabel: { color: dark.mutedStrong, fontSize: 12, fontWeight: '700', marginBottom: 10 },
  nairaSign: { color: dark.green, fontSize: 26, fontWeight: '900', marginBottom: 10 },
  bankPicker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 50, borderWidth: 1, borderColor: dark.border, borderRadius: 12, paddingHorizontal: 14, backgroundColor: dark.surface, marginBottom: 12 },
  bankPickerText: { color: dark.muted, fontSize: 15 },
  bankList: { backgroundColor: dark.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: dark.border, marginBottom: 12, maxHeight: 220, overflow: 'hidden' },
  bankItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: dark.border },
  feeBox: { backgroundColor: dark.surfaceRaised, borderRadius: 10, padding: 12, marginVertical: 10 },
  feeLine: { height: 1, backgroundColor: dark.border, marginVertical: 5 },
  methodTab: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 3 },
});
