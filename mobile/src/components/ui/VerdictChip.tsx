import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, scoreColors, verdictLabel } from '../../context/ThemeContext';

const VerdictChip = ({ verdict, score, size = 'md' }:
  { verdict?: string; score: number; size?: 'sm' | 'md' }) => {
  const { colors } = useTheme();
  const { fg, bg } = scoreColors(score, colors);
  const pad = size === 'sm' ? { paddingVertical: 3, paddingHorizontal: 10 } : { paddingVertical: 6, paddingHorizontal: 16 };
  return (
    <View style={[{ backgroundColor: bg, borderRadius: 20, alignSelf: 'center' }, pad]}>
      <Text style={{ color: fg, fontWeight: '600', fontSize: size === 'sm' ? 11 : 13 }}>
        {verdictLabel(verdict)}
      </Text>
    </View>
  );
};

export default VerdictChip;
