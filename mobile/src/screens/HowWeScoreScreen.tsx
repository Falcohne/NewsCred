import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import BreakdownBar from '../components/ui/BreakdownBar';
import { useTheme, displayFont } from '../context/ThemeContext';

const COMPONENTS = [
  { weight: 35, labelKey: 'howWeScore.component1Label', bodyKey: 'howWeScore.component1Body' },
  { weight: 30, labelKey: 'howWeScore.component2Label', bodyKey: 'howWeScore.component2Body' },
  { weight: 15, labelKey: 'howWeScore.component3Label', bodyKey: 'howWeScore.component3Body' },
  { weight: 10, labelKey: 'howWeScore.component4Label', bodyKey: 'howWeScore.component4Body' },
  { weight: 10, labelKey: 'howWeScore.component5Label', bodyKey: 'howWeScore.component5Body' },
] as const;

const HowWeScoreScreen = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const s = styles(colors);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>{t('howWeScore.pageTitle')}</Text>
        <Text style={s.intro}>{t('howWeScore.intro')}</Text>

        <View style={s.card}>
          <Text style={s.sectionTitle}>{t('howWeScore.componentsSectionTitle')}</Text>
          {COMPONENTS.map((c) => (
            <View key={c.labelKey} style={{ marginBottom: 4 }}>
              <BreakdownBar label={t(c.labelKey)} value={c.weight} />
            </View>
          ))}
        </View>

        {COMPONENTS.map((c) => (
          <View key={c.labelKey} style={s.card}>
            <Text style={s.componentTitle}>{t(c.labelKey)} · {c.weight}%</Text>
            <Text style={s.componentBody}>{t(c.bodyKey)}</Text>
          </View>
        ))}

        <View style={[s.card, s.calloutCard]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="shield-checkmark" size={18} color={colors.teal} style={{ marginRight: 8 }} />
            <Text style={s.calloutTitle}>{t('howWeScore.falseClaimCalloutTitle')}</Text>
          </View>
          <Text style={s.componentBody}>{t('howWeScore.falseClaimCalloutBody')}</Text>
        </View>

        <View style={[s.card, s.calloutCard]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="information-circle" size={18} color={colors.warn} style={{ marginRight: 8 }} />
            <Text style={s.calloutTitle}>{t('howWeScore.noMatchCalloutTitle')}</Text>
          </View>
          <Text style={s.componentBody}>{t('howWeScore.noMatchCalloutBody')}</Text>
        </View>

        <View style={[s.card, s.calloutCard]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="warning" size={18} color={colors.bad} style={{ marginRight: 8 }} />
            <Text style={s.calloutTitle}>{t('howWeScore.limitationCalloutTitle')}</Text>
          </View>
          <Text style={s.componentBody}>{t('howWeScore.limitationCalloutBody')}</Text>
        </View>

        <View style={s.footerCard}>
          <Text style={s.footerText}>{t('howWeScore.footer')}</Text>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.paper },
  scroll: { padding: 16 },
  pageTitle: { ...displayFont, fontSize: 22, color: c.ink, marginBottom: 6 },
  intro: { fontSize: 13, color: c.inkMuted, lineHeight: 20, marginBottom: 16 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 18, marginBottom: 12 },
  sectionTitle: { ...displayFont, fontSize: 16, color: c.ink, marginBottom: 14 },
  componentTitle: { fontSize: 14, fontWeight: '700', color: c.ink, marginBottom: 6 },
  componentBody: { fontSize: 13, color: c.inkMuted, lineHeight: 20 },
  calloutCard: { borderColor: c.line },
  calloutTitle: { fontSize: 14, fontWeight: '700', color: c.ink },
  footerCard: {
    backgroundColor: c.tealSoft, borderRadius: 18, padding: 18, marginTop: 4,
  },
  footerText: { fontSize: 13, color: c.teal, lineHeight: 20, fontWeight: '500' },
});

export default HowWeScoreScreen;
