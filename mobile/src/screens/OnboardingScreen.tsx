import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useTheme, displayFont } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

const SLIDES = [
  { icon: 'link-outline', titleKey: 'onboarding.slide1Title', bodyKey: 'onboarding.slide1Body' },
  { icon: 'shield-checkmark-outline', titleKey: 'onboarding.slide2Title', bodyKey: 'onboarding.slide2Body' },
  { icon: 'newspaper-outline', titleKey: 'onboarding.slide3Title', bodyKey: 'onboarding.slide3Body' },
  { icon: 'sparkles-outline', titleKey: 'onboarding.slide4Title', bodyKey: 'onboarding.slide4Body' },
] as const;

const OnboardingScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const s = styles(colors);
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('MainTabs');
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (index + 1), animated: true });
    } else {
      finish();
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.topRow}>
        <Text style={s.brand}>NewsCred</Text>
        <TouchableOpacity onPress={finish}>
          <Text style={s.skip}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[s.slide, { width }]}>
            <View style={s.iconWrap}>
              <Ionicons name={slide.icon as any} size={56} color={colors.teal} />
            </View>
            <Text style={s.title}>{t(slide.titleKey)}</Text>
            <Text style={s.body}>{t(slide.bodyKey)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={s.dotsRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[s.dot, i === index && s.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={s.primaryBtn} onPress={next} activeOpacity={0.85}>
        <Text style={s.primaryBtnText}>
          {index === SLIDES.length - 1 ? t('onboarding.getStarted') : t('onboarding.next')}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.paper },
  topRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4,
  },
  brand: { ...displayFont, fontSize: 18, color: c.ink },
  skip: { fontSize: 13, color: c.inkMuted, fontWeight: '600' },
  slide: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  iconWrap: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: c.tealSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 28,
  },
  title: { ...displayFont, fontSize: 22, color: c.ink, textAlign: 'center', marginBottom: 12, lineHeight: 28 },
  body: { fontSize: 14, color: c.inkMuted, textAlign: 'center', lineHeight: 21 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: c.line, marginHorizontal: 4 },
  dotActive: { backgroundColor: c.teal, width: 20 },
  primaryBtn: {
    backgroundColor: c.teal, borderRadius: 26, paddingVertical: 14,
    alignItems: 'center', marginHorizontal: 24, marginBottom: 24,
  },
  primaryBtnText: { color: c.onTeal, fontSize: 15, fontWeight: '700' },
});

export default OnboardingScreen;
