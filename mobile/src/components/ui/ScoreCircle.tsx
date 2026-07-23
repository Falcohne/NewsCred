import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, scoreColors } from '../../context/ThemeContext';

/** Small colored score badge used in history lists. */
const ScoreCircle = ({ score, size = 40 }: { score: number; size?: number }) => {
  const { colors } = useTheme();
  const { fg, bg } = scoreColors(score, colors);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: size * 0.34 }}>
        {Math.round(score)}
      </Text>
    </View>
  );
};

export default ScoreCircle;
