import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Share, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';
import { useTheme, displayFont, verdictLabel } from '../context/ThemeContext';
import ScoreDial from '../components/ui/ScoreDial';
import VerdictChip from '../components/ui/VerdictChip';
import BreakdownBar from '../components/ui/BreakdownBar';
import EvidenceCard, { FactCheckMatch } from '../components/ui/EvidenceCard';

/**
 * Credibility report — the app's hero screen.
 * Hero: the trust dial. Then: what shaped the score, live fact-checks,
 * verification details, and the written summary.
 */

const qualityPct = (v?: string): number | null => {
  switch ((v || '').toUpperCase()) {
    case 'HIGH': return 90;
    case 'VERIFIED': return 90;
    case 'MEDIUM': return 55;
    case 'UNVERIFIED': return 50;
    case 'LOW': return 20;
    case 'UNKNOWN': return 35;
    default: return null;
  }
};

const avg = (vals: (number | null)[]): number | null => {
  const xs = vals.filter((v): v is number => v !== null);
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
};

const AnalysisDetailScreen = ({ route, navigation }: any) => {
  const { result } = route.params as { result: any };
  const { colors } = useTheme();

  const score = Math.round(result?.overallScore ?? 0);

  const matches: FactCheckMatch[] = useMemo(() => {
    try {
      const parsed = JSON.parse(result?.factCheckDetails || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [result?.factCheckDetails]);

  const languagePct = avg([
    qualityPct(result?.contentQuality),
    qualityPct(result?.evidenceQuality),
    qualityPct(result?.languageTone),
    qualityPct(result?.factConsistency),
    qualityPct(result?.headlineAnalysis),
    qualityPct(result?.sourceReliability),
  ]);
  const factPct = matches.length
    ? avg(matches.map((m) => (m.ratingScore ?? 0.5) * 100))
    : null;
  const datePct = typeof result?.dateScore === 'number' ? result.dateScore * 100 : null;
  const authorPct = typeof result?.authorCredibilityScore === 'number'
    ? result.authorCredibilityScore * 100 : null;

  const isPremiumLocked =
    typeof result?.dateMessage === 'string' && result.dateMessage.includes('Upgrade to Premium');

  const shareReport = async () => {
    try {
      await Share.share({
        message:
          `NewsCred credibility report\n` +
          `"${result?.title || 'Untitled article'}"\n` +
          `Score: ${score}/100 — ${verdictLabel(result?.credibilityVerdict)}\n` +
          (matches.length ? `${matches.length} related fact-check(s) found.\n` : '') +
          `Checked with NewsCred.`,
      });
    } catch {}
  };

  const s = styles(colors);

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero: the trust dial */}
        <View style={s.card}>
          <Text style={s.articleTitle} numberOfLines={3}>
            {result?.title || 'Untitled article'}
          </Text>
          {!!result?.sourceName && (
            <Text style={s.sourceName}>{result.sourceName}</Text>
          )}
          <View style={{ marginTop: 12 }}>
            <ScoreDial score={score} />
          </View>
          <View style={{ marginTop: 4 }}>
            <VerdictChip verdict={result?.credibilityVerdict} score={score} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' }}>
            <TouchableOpacity onPress={shareReport} style={s.shareRow}>
              <IconButton icon="share-variant" size={16} iconColor={colors.teal} style={{ margin: 0 }} />
              <Text style={s.shareText}>Share this report</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('HowWeScore')} style={[s.shareRow, { marginLeft: 4 }]}>
              <IconButton icon="information-outline" size={16} iconColor={colors.inkMuted} style={{ margin: 0 }} />
              <Text style={[s.shareText, { color: colors.inkMuted }]}>How we score</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* What shaped this score */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>What shaped this score</Text>
          {languagePct !== null && <BreakdownBar label="Language signals" value={languagePct} />}
          {factPct !== null && <BreakdownBar label="Fact-check verification" value={factPct} />}
          {datePct !== null && <BreakdownBar label="Date freshness" value={datePct} />}
          {authorPct !== null && <BreakdownBar label="Author transparency" value={authorPct} />}
          {languagePct === null && factPct === null && datePct === null && authorPct === null && (
            <Text style={s.mutedText}>Breakdown not available for this analysis.</Text>
          )}
        </View>

        {/* Live fact-checks */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>
            Live fact-checks{matches.length ? ` · ${matches.length} found` : ''}
          </Text>
          {matches.length > 0 ? (
            matches.map((m, i) => <EvidenceCard key={i} match={m} />)
          ) : isPremiumLocked ? (
            <Text style={s.mutedText}>
              Upgrade to Premium to see claim-by-claim fact-check matches with sources.
            </Text>
          ) : (
            <Text style={s.mutedText}>
              No published fact-checks matched this article's claims. That is neutral —
              it does not prove the claims true or false.
            </Text>
          )}
        </View>

        {/* Verification details */}
        {(result?.authorName || result?.publishDate || result?.dateMessage || result?.authorMessage) && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Verification details</Text>
            {!!result?.authorName && (
              <DetailRow label="Author" value={result.authorName} colors={colors} />
            )}
            {!!result?.authorMessage && (
              <Text style={s.detailNote}>{result.authorMessage}</Text>
            )}
            {!!result?.publishDate && (
              <DetailRow label="Published" value={String(result.publishDate)} colors={colors} />
            )}
            {!!result?.dateMessage && (
              <Text style={s.detailNote}>{result.dateMessage}</Text>
            )}
          </View>
        )}

        {/* Full written report */}
        {!!result?.analysisSummary && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Full report</Text>
            <Text style={s.reportText}>{result.analysisSummary}</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const DetailRow = ({ label, value, colors }: any) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
    <Text style={{ fontSize: 13, color: colors.inkMuted }}>{label}</Text>
    <Text style={{ fontSize: 13, color: colors.ink, fontWeight: '600', flexShrink: 1, textAlign: 'right' }}>
      {value}
    </Text>
  </View>
);

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.paper },
  scroll: { padding: 16 },
  card: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  articleTitle: {
    ...displayFont,
    fontSize: 19,
    color: c.ink,
    textAlign: 'center',
    lineHeight: 26,
  },
  sourceName: { fontSize: 12, color: c.inkMuted, textAlign: 'center', marginTop: 4 },
  sectionTitle: { ...displayFont, fontSize: 16, color: c.ink, marginBottom: 12 },
  mutedText: { fontSize: 13, color: c.inkMuted, lineHeight: 20 },
  detailNote: { fontSize: 12, color: c.inkMuted, lineHeight: 18, marginBottom: 10 },
  reportText: { fontSize: 13, color: c.inkMuted, lineHeight: 21 },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  shareText: { fontSize: 13, color: c.teal, fontWeight: '600' },
});

export default AnalysisDetailScreen;
