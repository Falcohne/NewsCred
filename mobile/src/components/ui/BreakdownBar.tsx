import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, scoreColors } from '../../context/ThemeContext';

/** One "what shaped this score" row: label, percentage, colored bar. */
const BreakdownBar = ({ label, value }: { label: string; value: number }) => {
  const { colors } = useTheme();
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const { fg } = scoreColors(v, colors);
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: colors.inkMuted }}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.inkMuted, fontVariant: ['tabular-nums'] }}>{v}%</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' }}>
        <View style={{ width: `${v}%`, height: 6, backgroundColor: fg }} />
      </View>
    </View>
  );
};

export default BreakdownBar;
