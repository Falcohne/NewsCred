import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme, scoreColors } from '../../context/ThemeContext';

/**
 * The signature element: a semicircular trust dial, 0–100.
 * Color follows the verdict scale (green / amber / red).
 */
const ScoreDial = ({ score, size = 180 }: { score: number; size?: number }) => {
  const { colors } = useTheme();
  const { fg } = scoreColors(score, colors);

  const stroke = size * 0.075;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2 + r / 2 - stroke / 2;

  const clamped = Math.max(0, Math.min(100, score));
  const angle = Math.PI * (clamped / 100); // 0..π
  const startX = cx - r;
  const endX = cx + r;
  const px = cx - r * Math.cos(angle);
  const py = cy - r * Math.sin(angle);
  const largeArc = angle > Math.PI / 2 ? 0 : 0;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={cy + stroke}>
        <Path
          d={`M ${startX} ${cy} A ${r} ${r} 0 0 1 ${endX} ${cy}`}
          stroke={colors.line}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
        />
        {clamped > 0 && (
          <Path
            d={`M ${startX} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${px} ${py}`}
            stroke={fg}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
          />
        )}
      </Svg>
      <View style={{ position: 'absolute', top: cy - size * 0.28, alignItems: 'center' }}>
        <Text style={{ fontSize: size * 0.24, fontWeight: '700', color: colors.ink }}>
          {Math.round(clamped)}
        </Text>
        <Text style={{ fontSize: 12, color: colors.inkMuted }}>out of 100</Text>
      </View>
    </View>
  );
};

export default ScoreDial;
