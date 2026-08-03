import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { displayFont } from '../../context/ThemeContext';

interface ShareableResultCardProps {
  headline: string;
  verdictText: string;
  percent: number;
  fg: string;
  bg: string;
  sourceLabel?: string;
  footerText: string;
}

/**
 * Fixed-size branded card, captured to an image and shared via the OS share
 * sheet (see shareResultCard() in shareUtils.ts). Kept as its own small,
 * self-contained component (not reused from the on-screen result panels)
 * because a shareable image needs a fixed layout regardless of device size,
 * while the on-screen panels are responsive.
 */
const ShareableResultCard = ({ headline, verdictText, percent, fg, bg, sourceLabel, footerText }: ShareableResultCardProps) => {
  return (
    <View style={[s.card, { backgroundColor: bg, borderColor: fg }]}>
      <Text style={[s.brand, { color: fg }]}>NewsCred</Text>

      <Text style={[s.percent, { color: fg }]}>{Math.round(percent)}%</Text>
      <Text style={[s.verdict, { color: fg }]}>{verdictText}</Text>

      <Text style={s.headline} numberOfLines={3}>{headline}</Text>
      {!!sourceLabel && <Text style={s.source} numberOfLines={1}>{sourceLabel}</Text>}

      <View style={[s.divider, { backgroundColor: fg, opacity: 0.25 }]} />
      <Text style={[s.footer, { color: fg }]}>{footerText}</Text>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    width: 320,
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  brand: { ...displayFont, fontSize: 16, letterSpacing: -0.2, marginBottom: 14 },
  percent: { fontSize: 44, fontWeight: '800', lineHeight: 48 },
  verdict: { fontSize: 15, fontWeight: '700', marginTop: 2, marginBottom: 16 },
  headline: { fontSize: 15, fontWeight: '600', color: '#1A1A16', lineHeight: 20 },
  source: { fontSize: 12, color: '#6B6858', marginTop: 4 },
  divider: { height: 1, marginTop: 18, marginBottom: 10 },
  footer: { fontSize: 11, fontWeight: '600', textAlign: 'right' },
});

export default ShareableResultCard;
