import { useEffect } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { dark } from '@/theme';

export default function Splash() {
  useEffect(() => {
    const timer = setTimeout(() => router.replace('/auth'), 900);
    return () => clearTimeout(timer);
  }, []);
  return (
    <LinearGradient colors={['#06110D', '#0B2A1C']} style={styles.root}>
      <View style={styles.mark}><Text style={styles.markText}>MZ</Text></View>
      <Text style={styles.name}>MemeZo</Text>
      <Text style={styles.tag}>Money. Crypto. Automation.</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 74, height: 74, borderRadius: 16, backgroundColor: dark.green, alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#031008', fontSize: 26, fontWeight: '900' },
  name: { color: dark.text, fontSize: 34, fontWeight: '900', marginTop: 18 },
  tag: { color: dark.muted, fontSize: 13, marginTop: 8 }
});
