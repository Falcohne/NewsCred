import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export interface FactCheckMatch {
  articleClaim?: string;
  matchedClaim?: string;
  publisher?: string;
  rating?: string;
  reviewUrl?: string;
  ratingScore?: number;
}

/** A live fact-check match: publisher, colored rating chip, claim, link. */
const EvidenceCard = ({ match }: { match: FactCheckMatch }) => {
  const { colors } = useTheme();
  const s = match.ratingScore ?? 0.5;
  const chip = s <= 0.3
    ? { fg: colors.bad, bg: colors.badBg }
    : s < 0.65
      ? { fg: colors.warn, bg: colors.warnBg }
      : { fg: colors.good, bg: colors.goodBg };

  return (
    <View style={{
      borderWidth: 1, borderColor: colors.line, borderRadius: 14,
      padding: 12, marginBottom: 10, backgroundColor: colors.card,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
          {match.publisher || 'Fact-checker'}
        </Text>
        <View style={{ backgroundColor: chip.bg, borderRadius: 12, paddingVertical: 2, paddingHorizontal: 10 }}>
          <Text style={{ color: chip.fg, fontSize: 11, fontWeight: '600' }}>{match.rating || 'Reviewed'}</Text>
        </View>
      </View>
      {!!match.matchedClaim && (
        <Text style={{ fontSize: 12, color: colors.inkMuted, lineHeight: 18 }}>
          "{match.matchedClaim}"
        </Text>
      )}
      {!!match.reviewUrl && (
        <TouchableOpacity onPress={() => Linking.openURL(match.reviewUrl!)} style={{ marginTop: 6 }}>
          <Text style={{ fontSize: 12, color: colors.teal, fontWeight: '600' }}>Read the fact-check →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default EvidenceCard;
