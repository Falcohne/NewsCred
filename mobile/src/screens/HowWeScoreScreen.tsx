import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BreakdownBar from '../components/ui/BreakdownBar';
import { useTheme, displayFont } from '../context/ThemeContext';

const COMPONENTS = [
  {
    weight: 35,
    label: 'Language signals',
    body: 'We read the writing itself — sentence depth, cited evidence, sensational or clickbait phrasing, and headline patterns. Six indicators combine into this score.',
  },
  {
    weight: 30,
    label: 'Live fact-check verification',
    body: 'Claims are extracted from the article and checked against a global database of published fact-checks from organisations such as PolitiFact, Snopes, FactCheck.org, AFP and Full Fact.',
  },
  {
    weight: 15,
    label: 'Author transparency',
    body: 'Whether the article names an author, and whether that author is linked to a known publication. We never claim to personally vouch for a named individual.',
  },
  {
    weight: 10,
    label: 'Date freshness',
    body: "How recently the article was published, when a date can be found. Older articles score lower on this component only, and timeless topics are treated more leniently.",
  },
  {
    weight: 10,
    label: 'Image signals',
    body: 'Weak, URL-based checks for stock photography or AI-generation tool references in image links.',
  },
];

const HowWeScoreScreen = () => {
  const { colors } = useTheme();
  const s = styles(colors);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.pageTitle}>How we score</Text>
        <Text style={s.intro}>
          Every score out of 100 is built from five weighted components. Here is
          exactly how each one works, and where the system's limits are.
        </Text>

        <View style={s.card}>
          <Text style={s.sectionTitle}>The five components</Text>
          {COMPONENTS.map((c) => (
            <View key={c.label} style={{ marginBottom: 4 }}>
              <BreakdownBar label={c.label} value={c.weight} />
            </View>
          ))}
        </View>

        {COMPONENTS.map((c) => (
          <View key={c.label} style={s.card}>
            <Text style={s.componentTitle}>{c.label} · {c.weight}%</Text>
            <Text style={s.componentBody}>{c.body}</Text>
          </View>
        ))}

        <View style={[s.card, s.calloutCard]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="shield-checkmark" size={18} color={colors.teal} style={{ marginRight: 8 }} />
            <Text style={s.calloutTitle}>When a claim is verified false</Text>
          </View>
          <Text style={s.componentBody}>
            If a professional fact-checker has rated a matching claim as false, the
            article's overall score is capped at 40 — no matter how well the rest of
            it is written. Good writing cannot buy a good score.
          </Text>
        </View>

        <View style={[s.card, s.calloutCard]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="information-circle" size={18} color={colors.warn} style={{ marginRight: 8 }} />
            <Text style={s.calloutTitle}>No match found is not proof</Text>
          </View>
          <Text style={s.componentBody}>
            Most articles, including accurate ones, will show "no published
            fact-checks matched." Fact-checkers cannot review everything. Absence
            of a match is neutral — it does not mean an article is true or false.
          </Text>
        </View>

        <View style={[s.card, s.calloutCard]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="warning" size={18} color={colors.bad} style={{ marginRight: 8 }} />
            <Text style={s.calloutTitle}>A known limitation</Text>
          </View>
          <Text style={s.componentBody}>
            Language analysis looks for patterns common in misleading writing —
            things like citing "experts" or "studies." Very polished writing built
            around false claims can still score higher than it should on this
            component alone. This is exactly why live fact-check verification
            carries the most weight in the final score, and why a verified-false
            claim overrides everything else.
          </Text>
        </View>

        <View style={s.footerCard}>
          <Text style={s.footerText}>
            NewsCred is a decision-support tool, not a verdict. Use it alongside
            your own judgement, and always check a claim from more than one source
            before you decide to trust or share it.
          </Text>
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
