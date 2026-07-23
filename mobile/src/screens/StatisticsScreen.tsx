import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import BreakdownBar from '../components/ui/BreakdownBar';
import { useTheme, displayFont, verdictLabel } from '../context/ThemeContext';

const VERDICTS = ['CREDIBLE', 'LIKELY_CREDIBLE', 'UNSURE', 'MISLEADING', 'NOT_CREDIBLE'];

const StatisticsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const s = styles(colors);

  const [articles, setArticles] = useState<any[]>([]);
  const [isPremium, setIsPremium] = useState(true);
  const [plan, setPlan] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/articles/mine');
      setArticles(res.data || []);
    } catch { setArticles([]); }
    try {
      const uid = await (await import('@react-native-async-storage/async-storage')).default.getItem('userId');
      if (uid) {
        const u = await api.get(`/users/${uid}`);
        setIsPremium(!!u.data.premium);
      }
    } catch {}
    try {
      const p = await api.get('/payments/plan');
      setPlan(p.data.amountDisplay || '');
    } catch {}
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const total = articles.length;
  const avgScore = total ? articles.reduce((a, x) => a + (x.overallScore || 0), 0) / total : 0;
  const sources = new Set(articles.map((a) => a.sourceName || 'Pasted text')).size;
  const counts: Record<string, number> = {};
  VERDICTS.forEach((v) => (counts[v] = 0));
  articles.forEach((a) => { if (counts[a.credibilityVerdict] !== undefined) counts[a.credibilityVerdict]++; });

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.pageTitle}>Your reading, measured</Text>

        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={s.metricsRow}>
              <Metric label="Checks run" value={String(total)} colors={colors} />
              <Metric label="Average score" value={total ? String(Math.round(avgScore)) : '—'} colors={colors} />
              <Metric label="Sources" value={String(sources)} colors={colors} />
            </View>

            <View style={s.card}>
              <Text style={s.sectionTitle}>How your checks rated</Text>
              {total === 0 ? (
                <Text style={s.muted}>Run a few checks and your distribution will appear here.</Text>
              ) : (
                VERDICTS.map((v) => (
                  <BreakdownBar
                    key={v}
                    label={`${verdictLabel(v)} (${counts[v]})`}
                    value={(counts[v] / total) * 100}
                  />
                ))
              )}
            </View>

            <TouchableOpacity
              style={[s.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SourceDatabase')}
            >
              <View>
                <Text style={s.sectionTitle}>Sources you have checked</Text>
                <Text style={s.muted}>Average scores per outlet</Text>
              </View>
              <Text style={{ color: colors.teal, fontSize: 18 }}>›</Text>
            </TouchableOpacity>

            {!isPremium && (
              <View style={[s.card, { alignItems: 'center' }]}>
                <Text style={s.sectionTitle}>NewsCred Premium</Text>
                <Text style={[s.muted, { textAlign: 'center', marginBottom: 12 }]}>
                  Unlimited checks, the full forensic report with live fact-check
                  sources, and higher limits.{plan ? ` ${plan}/month.` : ''}
                </Text>
                <TouchableOpacity style={s.primaryBtn} onPress={() => navigation.navigate('Payment')} activeOpacity={0.85}>
                  <Text style={s.primaryBtnText}>Upgrade with Paystack</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const Metric = ({ label, value, colors }: any) => (
  <View style={{
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginHorizontal: 4,
  }}>
    <Text style={{ fontSize: 22, fontWeight: '700', color: colors.ink }}>{value}</Text>
    <Text style={{ fontSize: 11, color: colors.inkMuted, marginTop: 2 }}>{label}</Text>
  </View>
);

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.paper },
  scroll: { padding: 16 },
  pageTitle: { ...displayFont, fontSize: 22, color: c.ink, marginBottom: 16 },
  metricsRow: { flexDirection: 'row', marginHorizontal: -4, marginBottom: 14 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 18, marginBottom: 14 },
  sectionTitle: { ...displayFont, fontSize: 16, color: c.ink, marginBottom: 12 },
  muted: { fontSize: 13, color: c.inkMuted, lineHeight: 20 },
  primaryBtn: { backgroundColor: c.teal, borderRadius: 26, paddingVertical: 12, paddingHorizontal: 28, alignItems: 'center' },
  primaryBtnText: { color: c.onTeal, fontSize: 14, fontWeight: '700' },
});

export default StatisticsScreen;
