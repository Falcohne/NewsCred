import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import { useTheme, displayFont, verdictLabel } from '../context/ThemeContext';

type Overview = {
  totalUsers: number; premiumUsers: number; freeUsers: number;
  totalAnalyses: number; averageScore: number;
  successfulPayments: number; revenueGhs: number;
};

type VerdictRow = { verdict: string; count: number; percent: number };

type AdminUser = {
  id: string; fullName: string; maskedEmail: string; fullEmail: string;
  premium: boolean; isAdmin: boolean; analysisCount: number; createdAt: string;
};

const AdminDashboardScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const s = styles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [verdicts, setVerdicts] = useState<VerdictRow[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);

  const loadAll = async () => {
    try {
      const [ov, vd, us] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/verdicts'),
        api.get('/admin/users'),
      ]);
      setOverview(ov.data);
      setVerdicts(vd.data || []);
      setUsers(us.data || []);
      setAccessDenied(false);
    } catch (error: any) {
      if (error.response?.status === 403) {
        setAccessDenied(true);
      } else {
        setAlert({ title: t('admin.loadFailedTitle'), message: t('admin.loadFailedMessage') });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const onRefresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const togglePremium = async (user: AdminUser) => {
    const nextValue = !user.premium;
    setTogglingId(user.id);
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, premium: nextValue } : u)));
    try {
      await api.put(`/admin/users/${user.id}/premium`, { premium: nextValue });
    } catch (error: any) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, premium: !nextValue } : u)));
      setAlert({
        title: t('admin.updateFailedTitle'),
        message: error.response?.data?.message || t('admin.updateFailedMessage'),
      });
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerFill}>
          <ActivityIndicator color={colors.teal} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (accessDenied) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centerFill}>
          <Text style={s.deniedTitle}>{t('admin.accessDeniedTitle')}</Text>
          <Text style={s.deniedMessage}>{t('admin.accessDeniedMessage')}</Text>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Text style={s.backBtnText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />}
      >
        <Text style={s.pageTitle}>{t('admin.title')}</Text>

        {/* Overview */}
        <Text style={s.groupLabel}>{t('admin.overviewTitle')}</Text>
        <View style={s.statsGrid}>
          <StatCard label={t('admin.totalUsers')} value={overview?.totalUsers ?? 0} colors={colors} />
          <StatCard label={t('admin.premiumUsers')} value={overview?.premiumUsers ?? 0} colors={colors} />
          <StatCard label={t('admin.freeUsers')} value={overview?.freeUsers ?? 0} colors={colors} />
          <StatCard label={t('admin.totalAnalyses')} value={overview?.totalAnalyses ?? 0} colors={colors} />
          <StatCard label={t('admin.averageScore')} value={overview?.averageScore ?? 0} colors={colors} />
          <StatCard label={t('admin.successfulPayments')} value={overview?.successfulPayments ?? 0} colors={colors} />
          <StatCard label={t('admin.revenue')} value={overview?.revenueGhs ?? 0} colors={colors} wide />
        </View>

        {/* Verdict distribution */}
        <Text style={s.groupLabel}>{t('admin.verdictDistributionTitle')}</Text>
        <View style={s.card}>
          {verdicts.map((v, i) => (
            <View key={v.verdict} style={[s.verdictRow, i === verdicts.length - 1 && { marginBottom: 0 }]}>
              <Text style={s.verdictLabel}>{verdictLabel(v.verdict)}</Text>
              <View style={s.verdictBarTrack}>
                <View style={[s.verdictBarFill, { width: `${Math.min(100, v.percent)}%`, backgroundColor: colors.teal }]} />
              </View>
              <Text style={s.verdictCount}>{v.count} · {v.percent}%</Text>
            </View>
          ))}
        </View>

        {/* Users */}
        <View style={s.sectionHead}>
          <Text style={s.groupLabel}>{t('admin.usersTitle')}</Text>
          <Text style={s.usersCount}>{t('admin.usersCount', { count: users.length })}</Text>
        </View>
        {users.map((u) => (
          <View key={u.id} style={s.userRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={s.userName}>{u.fullName || u.maskedEmail}</Text>
                {u.isAdmin && (
                  <View style={s.badgeAdmin}><Text style={s.badgeAdminText}>{t('admin.adminBadge')}</Text></View>
                )}
              </View>
              <Text style={s.userEmail}>{u.maskedEmail}</Text>
              <Text style={s.userMeta}>{t('admin.checksCount', { count: u.analysisCount ?? 0 })}</Text>
            </View>
            {togglingId === u.id ? (
              <ActivityIndicator color={colors.teal} />
            ) : (
              <Switch
                value={u.premium}
                onValueChange={() => togglePremium(u)}
                trackColor={{ false: colors.line, true: colors.teal }}
                thumbColor={colors.card}
              />
            )}
          </View>
        ))}

        <View style={{ height: 24 }} />
      </ScrollView>

      {alert && (
        <CustomAlert
          visible
          title={alert.title}
          message={alert.message}
          buttons={[{ text: t('common.ok') }]}
          onClose={() => setAlert(null)}
        />
      )}
    </SafeAreaView>
  );
};

const StatCard = ({ label, value, colors, wide }: any) => (
  <View style={[cardStyles(colors).statCard, wide && { flexBasis: '100%' }]}>
    <Text style={cardStyles(colors).statValue}>{value}</Text>
    <Text style={cardStyles(colors).statLabel}>{label}</Text>
  </View>
);

const cardStyles = (c: any) => StyleSheet.create({
  statCard: {
    flexBasis: '48%', backgroundColor: c.card, borderWidth: 1, borderColor: c.line,
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: c.ink },
  statLabel: { fontSize: 11.5, color: c.inkMuted, marginTop: 4 },
});

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.paper },
  scroll: { padding: 16 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  pageTitle: { ...displayFont, fontSize: 22, color: c.ink, marginBottom: 14 },
  deniedTitle: { ...displayFont, fontSize: 18, color: c.ink, marginBottom: 8, textAlign: 'center' },
  deniedMessage: { fontSize: 13.5, color: c.inkMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  backBtn: { backgroundColor: c.teal, borderRadius: 24, paddingVertical: 11, paddingHorizontal: 24 },
  backBtnText: { color: c.onTeal, fontSize: 14, fontWeight: '700' },
  groupLabel: {
    fontSize: 12, fontWeight: '700', color: c.inkMuted, marginTop: 10, marginBottom: 8,
    marginLeft: 2, textTransform: 'uppercase', letterSpacing: 0.6,
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  usersCount: { fontSize: 12, color: c.inkMuted, marginBottom: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 6 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 16, marginBottom: 8 },
  verdictRow: { marginBottom: 12 },
  verdictLabel: { fontSize: 12.5, fontWeight: '600', color: c.ink, marginBottom: 4 },
  verdictBarTrack: { height: 8, borderRadius: 4, backgroundColor: c.line, overflow: 'hidden' },
  verdictBarFill: { height: 8, borderRadius: 4 },
  verdictCount: { fontSize: 11, color: c.inkMuted, marginTop: 4 },
  userRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: c.card, borderWidth: 1, borderColor: c.line,
    borderRadius: 14, padding: 12, marginBottom: 8,
  },
  userName: { fontSize: 13.5, fontWeight: '700', color: c.ink, marginRight: 6 },
  userEmail: { fontSize: 12, color: c.inkMuted, marginTop: 2 },
  userMeta: { fontSize: 11, color: c.hint, marginTop: 2 },
  badgeAdmin: { backgroundColor: c.tealSoft, borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8, marginTop: 2 },
  badgeAdminText: { fontSize: 10, fontWeight: '700', color: c.teal },
});

export default AdminDashboardScreen;
