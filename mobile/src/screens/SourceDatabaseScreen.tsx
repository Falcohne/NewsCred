import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';
import ScoreCircle from '../components/ui/ScoreCircle';
import { useTheme, displayFont, verdictLabel } from '../context/ThemeContext';

interface SourceRow { name: string; count: number; avg: number; topVerdict: string; }

const SourceDatabaseScreen = () => {
  const { colors } = useTheme();
  const s = styles(colors);

  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/articles/mine');
      const map: Record<string, { total: number; count: number; verdicts: Record<string, number> }> = {};
      (res.data || []).forEach((a: any) => {
        const name = a.sourceName || 'Pasted text';
        if (!map[name]) map[name] = { total: 0, count: 0, verdicts: {} };
        map[name].total += a.overallScore || 0;
        map[name].count += 1;
        const v = a.credibilityVerdict || 'UNSURE';
        map[name].verdicts[v] = (map[name].verdicts[v] || 0) + 1;
      });
      const rows: SourceRow[] = Object.entries(map).map(([name, m]) => ({
        name,
        count: m.count,
        avg: m.total / m.count,
        topVerdict: Object.entries(m.verdicts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'UNSURE',
      }));
      rows.sort((a, b) => b.count - a.count);
      setSources(rows);
    } catch { setSources([]); }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Text style={s.pageTitle}>Sources you have checked</Text>
      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
      ) : sources.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyTitle}>No sources yet</Text>
          <Text style={s.emptyBody}>Check a few articles and their sources will build up here with average scores.</Text>
        </View>
      ) : (
        <FlatList
          data={sources}
          keyExtractor={(item) => item.name}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
          renderItem={({ item }) => (
            <View style={s.row}>
              <ScoreCircle score={Math.round(item.avg)} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.rowTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={s.rowMeta}>
                  {item.count} check{item.count === 1 ? '' : 's'} · usually {verdictLabel(item.topVerdict).toLowerCase()}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.paper },
  pageTitle: { ...displayFont, fontSize: 22, color: c.ink, margin: 16, marginBottom: 12 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.card, borderWidth: 1, borderColor: c.line,
    borderRadius: 14, padding: 12, marginBottom: 8,
  },
  rowTitle: { fontSize: 13.5, color: c.ink, fontWeight: '600' },
  rowMeta: { fontSize: 12, color: c.inkMuted, marginTop: 2 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { ...displayFont, fontSize: 18, color: c.ink, marginBottom: 6 },
  emptyBody: { fontSize: 13, color: c.inkMuted, textAlign: 'center', lineHeight: 20 },
});

export default SourceDatabaseScreen;
