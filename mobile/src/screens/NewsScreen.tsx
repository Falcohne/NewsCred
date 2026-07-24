import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import { useTheme, displayFont } from '../context/ThemeContext';

interface NewsItem {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  source: string;
}

const CATEGORIES = [
  { key: 'top', label: 'Top stories' },
  { key: 'ghana', label: 'Ghana' },
  { key: 'politics', label: 'Politics' },
  { key: 'latest', label: 'Latest' },
];

const timeAgo = (iso: string) => {
  try {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ''; }
};

const NewsScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const s = styles(colors);

  const [category, setCategory] = useState('top');
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingUrl, setCheckingUrl] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ title: string; message: string; buttons?: any[] } | null>(null);

  const load = useCallback(async (cat: string) => {
    try {
      const res = await api.get(`/news?category=${cat}`);
      setArticles(res.data.articles || []);
    } catch (error: any) {
      setArticles([]);
      if (error.response?.status === 503) {
        setAlert({
          title: 'Headlines unavailable',
          message: error.response?.data?.message || 'The news feed is not available right now.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load(category);
  }, [category, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load(category);
    setRefreshing(false);
  };

  /** One-tap credibility check straight from a headline. */
  const checkArticle = async (item: NewsItem) => {
    setCheckingUrl(item.url);
    try {
      const res = await api.post('/articles/analyze', { url: item.url, content: '' });
      navigation.navigate('AnalysisDetail', { result: res.data });
    } catch (error: any) {
      if (error.response?.status === 402) {
        setAlert({
          title: 'Free checks used up',
          message: error.response?.data?.message || 'Premium gives you unlimited checks.',
          buttons: [
            { text: 'Not now', style: 'cancel' },
            { text: 'See Premium', onPress: () => navigation.navigate('Payment') },
          ],
        });
      } else {
        setAlert({
          title: 'Check failed',
          message: error.response?.data?.message || 'This article could not be analyzed. Try opening it instead.',
        });
      }
    } finally {
      setCheckingUrl(null);
    }
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <Text style={s.pageTitle}>Newsroom</Text>

      <View style={s.chipRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.key}
            onPress={() => setCategory(c.key)}
            style={[s.chip, category === c.key && s.chipActive]}
            activeOpacity={0.8}
          >
            <Text style={[s.chipText, category === c.key && s.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: 40 }} />
      ) : articles.length === 0 ? (
        <View style={s.emptyWrap}>
          <Text style={s.emptyTitle}>No headlines right now</Text>
          <Text style={s.emptyBody}>Pull down to refresh, or try another category.</Text>
        </View>
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item, i) => item.url + i}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
          renderItem={({ item }) => (
            <View style={s.card}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ArticleWebView', { url: item.url, title: item.source })}
              >
                {!!item.image && (
                  <Image source={{ uri: item.image }} style={s.thumb} resizeMode="cover" />
                )}
                <View style={{ padding: 12 }}>
                  <Text style={s.cardTitle} numberOfLines={3}>{item.title}</Text>
                  <Text style={s.cardMeta}>
                    {item.source}{item.publishedAt ? ` · ${timeAgo(item.publishedAt)}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={s.readBtn}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('ArticleWebView', { url: item.url, title: item.source })}
                >
                  <Text style={s.readBtnText}>Read</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.checkBtn}
                  activeOpacity={0.85}
                  onPress={() => checkArticle(item)}
                  disabled={checkingUrl !== null}
                >
                  {checkingUrl === item.url
                    ? <ActivityIndicator color={colors.onTeal} size="small" />
                    : <Text style={s.checkBtnText}>Check credibility</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {alert && (
        <CustomAlert visible title={alert.title} message={alert.message}
          buttons={alert.buttons || [{ text: 'OK' }]} onClose={() => setAlert(null)} />
      )}
    </SafeAreaView>
  );
};

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.paper },
  pageTitle: { ...displayFont, fontSize: 22, color: c.ink, marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  chipRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, flexWrap: 'wrap' },
  chip: {
    borderWidth: 1, borderColor: c.line, borderRadius: 18,
    paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, marginBottom: 6,
    backgroundColor: c.card,
  },
  chipActive: { backgroundColor: c.teal, borderColor: c.teal },
  chipText: { fontSize: 12.5, color: c.inkMuted, fontWeight: '600' },
  chipTextActive: { color: c.onTeal },
  card: {
    backgroundColor: c.card, borderWidth: 1, borderColor: c.line,
    borderRadius: 16, marginBottom: 12, overflow: 'hidden',
  },
  thumb: { width: '100%', height: 160, backgroundColor: c.line },
  cardTitle: { fontSize: 14.5, fontWeight: '700', color: c.ink, lineHeight: 20 },
  cardMeta: { fontSize: 12, color: c.inkMuted, marginTop: 4 },
  actionRow: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.line,
  },
  readBtn: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  readBtnText: { fontSize: 13, fontWeight: '700', color: c.inkMuted },
  checkBtn: {
    flex: 2, paddingVertical: 11, alignItems: 'center',
    backgroundColor: c.teal,
  },
  checkBtnText: { fontSize: 13, fontWeight: '700', color: c.onTeal },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyTitle: { ...displayFont, fontSize: 18, color: c.ink, marginBottom: 6 },
  emptyBody: { fontSize: 13, color: c.inkMuted, textAlign: 'center', lineHeight: 20 },
});

export default NewsScreen;
