import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { IconButton } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import { Image } from 'react-native';
import ScoreCircle from '../components/ui/ScoreCircle';
import { useTheme, displayFont, verdictLabel } from '../context/ThemeContext';
import { notifyAnalysisComplete } from '../services/notifications';

const FREE_LIMIT = 3;

const DashboardScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const s = styles(colors);

  const [userName, setUserName] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const [alert, setAlert] = useState<{ title: string; message: string; buttons: any[] } | null>(null);
  const showAlert = (title: string, message: string, buttons?: any[]) =>
    setAlert({ title, message, buttons: buttons || [{ text: 'OK' }] });

  const loadUser = async () => {
    const name = await AsyncStorage.getItem('userName');
    setUserName(name || 'there');
    setProfileImage(await AsyncStorage.getItem('profileImage'));
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const res = await api.get(`/users/${userId}`);
        setIsPremium(!!res.data.premium);
        setAnalysisCount(res.data.analysisCount ?? 0);
        await AsyncStorage.setItem('isPremium', String(!!res.data.premium));
        await AsyncStorage.setItem('analysisCount', String(res.data.analysisCount ?? 0));
      }
    } catch {
      setIsPremium((await AsyncStorage.getItem('isPremium')) === 'true');
      setAnalysisCount(parseInt((await AsyncStorage.getItem('analysisCount')) || '0'));
    }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get('/articles/mine');
      setHistory(res.data || []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadUser();
      loadHistory();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUser(), loadHistory()]);
    setRefreshing(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const analyze = async () => {
    const hasUrl = url.trim().length > 0;
    const hasText = content.trim().length > 0;
    if (!hasUrl && !hasText) {
      showAlert('Nothing to check', 'Paste an article link or the article text.');
      return;
    }
    if (hasText && content.trim().length < 50) {
      showAlert('Text too short', 'Paste at least 50 characters so the analysis has something to work with.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/articles/analyze', {
        url: hasUrl ? url.trim() : '',
        content: hasText ? content.trim() : '',
      });
      setUrl('');
      setContent('');
      loadUser();
      loadHistory();
      notifyAnalysisComplete(
        res.data?.title || 'Untitled article',
        res.data?.overallScore ?? 0,
        res.data?.credibilityVerdict || 'UNRATED'
      );
      navigation.navigate('AnalysisDetail', { result: res.data });
    } catch (error: any) {
      if (error.response?.status === 402) {
        showAlert(
          'Free checks used up',
          error.response?.data?.message ||
            `You have used all ${FREE_LIMIT} free checks. Premium gives you unlimited checks and the full report.`,
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'See Premium', onPress: () => navigation.navigate('Payment') },
          ]
        );
      } else {
        showAlert('Check failed', error.response?.data?.message || 'Something went wrong. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const remaining = Math.max(0, FREE_LIMIT - analysisCount);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Masthead */}
        <Text style={s.dateline}>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}
        </Text>
        <View style={s.masthead}>
          <Text style={s.brand}>NewsCred</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isPremium && (
              <View style={s.premiumBadge}>
                <Text style={s.premiumBadgeText}>Premium</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: 32, height: 32, borderRadius: 16 }} />
              ) : (
                <IconButton icon="account-circle-outline" size={26} iconColor={colors.inkMuted} style={{ margin: 0 }} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.greetSmall}>{greeting()}, {userName}</Text>
        <Text style={s.greetBig}>Verify before you share</Text>

        {/* Analyze card */}
        <View style={s.card}>
          <View style={s.inputRow}>
            <IconButton icon="link-variant" size={18} iconColor={colors.hint} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="Paste article link"
              placeholderTextColor={colors.hint}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={[s.inputRow, { alignItems: 'flex-start' }]}>
            <IconButton icon="text" size={18} iconColor={colors.hint} style={s.inputIcon} />
            <TextInput
              style={[s.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Or paste article text"
              placeholderTextColor={colors.hint}
              value={content}
              onChangeText={setContent}
              multiline
            />
          </View>
          <TouchableOpacity style={s.primaryBtn} onPress={analyze} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color={colors.onTeal} />
              : <Text style={s.primaryBtnText}>Check credibility</Text>}
          </TouchableOpacity>
          {!isPremium && (
            <Text style={s.quotaText}>
              {remaining > 0
                ? `${remaining} free check${remaining === 1 ? '' : 's'} left`
                : 'Free checks used — Premium is unlimited'}
            </Text>
          )}
        </View>

        {/* News discovery */}
        <TouchableOpacity
          style={s.newsCard}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('News')}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.newsCardTitle}>Trending right now</Text>
            <Text style={s.newsCardBody}>
              Browse today's top stories and check any headline in one tap.
            </Text>
          </View>
          <Text style={s.newsCardArrow}>›</Text>
        </TouchableOpacity>

        {/* Recent checks */}
        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Recent checks</Text>
          {history.length > 3 && (
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={s.link}>View all</Text>
            </TouchableOpacity>
          )}
        </View>

        {historyLoading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: 16 }} />
        ) : history.length === 0 ? (
          <View style={[s.card, { alignItems: 'center', paddingVertical: 28 }]}>
            <Text style={s.emptyTitle}>Run your first check</Text>
            <Text style={s.emptyBody}>
              Paste a link or article text above and NewsCred will score its credibility.
            </Text>
          </View>
        ) : (
          history.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.historyRow}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('AnalysisDetail', { result: item })}
            >
              <ScoreCircle score={Math.round(item.overallScore ?? 0)} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.historyTitle} numberOfLines={1}>{item.title || 'Untitled article'}</Text>
                <Text style={s.historyMeta} numberOfLines={1}>
                  {(item.sourceName || 'Pasted text')} · {verdictLabel(item.credibilityVerdict)}
                </Text>
              </View>
              <IconButton icon="chevron-right" size={18} iconColor={colors.hint} style={{ margin: 0 }} />
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {alert && (
        <CustomAlert
          visible={true}
          title={alert.title}
          message={alert.message}
          buttons={alert.buttons}
          onClose={() => setAlert(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.paper },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  dateline: { fontSize: 10.5, color: c.hint, letterSpacing: 1.2, marginTop: 8, textAlign: 'center' },
  masthead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  brand: { ...displayFont, fontSize: 22, color: c.ink, letterSpacing: -0.3 },
  premiumBadge: { backgroundColor: c.tealSoft, borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10, marginRight: 4 },
  premiumBadgeText: { color: c.teal, fontSize: 11, fontWeight: '700' },
  greetSmall: { fontSize: 13, color: c.inkMuted, marginTop: 10 },
  greetBig: { ...displayFont, fontSize: 24, color: c.ink, marginTop: 2, marginBottom: 14 },
  card: {
    backgroundColor: c.card, borderWidth: 1, borderColor: c.line,
    borderRadius: 18, padding: 14, marginBottom: 18,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: c.line, borderRadius: 12,
    marginBottom: 10, backgroundColor: c.card,
  },
  inputIcon: { margin: 0, marginLeft: 4 },
  input: { flex: 1, fontSize: 14, color: c.ink, paddingVertical: 10, paddingRight: 12 },
  primaryBtn: {
    backgroundColor: c.teal, borderRadius: 26, paddingVertical: 13,
    alignItems: 'center', marginTop: 2,
  },
  primaryBtnText: { color: c.onTeal, fontSize: 15, fontWeight: '700' },
  quotaText: { fontSize: 12, color: c.inkMuted, textAlign: 'center', marginTop: 10 },
  newsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.tealSoft, borderRadius: 18,
    padding: 16, marginBottom: 18,
  },
  newsCardTitle: { ...displayFont, fontSize: 15, color: c.teal, marginBottom: 4 },
  newsCardBody: { fontSize: 12.5, color: c.teal, opacity: 0.85, lineHeight: 18 },
  newsCardArrow: { fontSize: 22, color: c.teal, marginLeft: 8 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { ...displayFont, fontSize: 16, color: c.ink },
  link: { fontSize: 13, color: c.teal, fontWeight: '600' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.card, borderWidth: 1, borderColor: c.line,
    borderRadius: 14, padding: 12, marginBottom: 8,
  },
  historyTitle: { fontSize: 13.5, color: c.ink, fontWeight: '600' },
  historyMeta: { fontSize: 12, color: c.inkMuted, marginTop: 2 },
  emptyTitle: { ...displayFont, fontSize: 16, color: c.ink, marginBottom: 6 },
  emptyBody: { fontSize: 13, color: c.inkMuted, textAlign: 'center', lineHeight: 19, paddingHorizontal: 16 },
});

export default DashboardScreen;
