import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { IconButton } from 'react-native-paper';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import ScoreCircle from '../components/ui/ScoreCircle';
import { useTheme, displayFont, verdictLabel } from '../context/ThemeContext';

const SavedArticlesScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const s = styles(colors);

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string; buttons: any[] } | null>(null);

  const load = async () => {
    try {
      const res = await api.get('/articles/mine');
      setArticles(res.data || []);
    } catch { setArticles([]); }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const confirmDelete = (item: any) => {
    setAlert({
      title: 'Delete this check?',
      message: `"${item.title || 'Untitled article'}" will be removed from your history.`,
      buttons: [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await api.delete(`/articles/${item.id}`);
              setArticles((prev) => prev.filter((a) => a.id !== item.id));
            } catch {
              setAlert({ title: 'Delete failed', message: 'Could not delete. Try again.', buttons: [{ text: 'OK' }] });
            }
          },
        },
      ],
    });
  };

  const fmtDate = (d?: string) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString(); } catch { return ''; }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Text style={s.pageTitle}>Check history</Text>
      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
      ) : articles.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyTitle}>No checks yet</Text>
          <Text style={s.emptyBody}>Everything you analyze will be saved here for you to revisit.</Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.row}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('AnalysisDetail', { result: item })}
              onLongPress={() => confirmDelete(item)}
            >
              <ScoreCircle score={Math.round(item.overallScore ?? 0)} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.rowTitle} numberOfLines={2}>{item.title || 'Untitled article'}</Text>
                <Text style={s.rowMeta} numberOfLines={1}>
                  {(item.sourceName || 'Pasted text')} · {verdictLabel(item.credibilityVerdict)}
                  {item.createdAt ? ` · ${fmtDate(item.createdAt)}` : ''}
                </Text>
              </View>
              <IconButton icon="trash-can-outline" size={18} iconColor={colors.hint}
                onPress={() => confirmDelete(item)} style={{ margin: 0 }} />
            </TouchableOpacity>
          )}
        />
      )}
      {alert && (
        <CustomAlert visible title={alert.title} message={alert.message}
          buttons={alert.buttons} onClose={() => setAlert(null)} />
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

export default SavedArticlesScreen;
