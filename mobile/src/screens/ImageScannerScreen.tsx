import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import ShareableResultCard from '../components/ui/ShareableResultCard';
import { shareViewAsImage } from '../services/shareUtils';
import { useTheme, displayFont } from '../context/ThemeContext';

const FREE_LIMIT = 3;

interface ImageAnalysisResult {
  attempted: boolean;
  available: boolean;
  aiGeneratedProbability?: number;
  status: 'VERIFIED' | 'AI_GENERATED' | 'NEEDS_REVIEW';
  verdictMessage: string;
  message: string;
}

const ImageScannerScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const s = styles(colors);

  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImageAnalysisResult | null>(null);
  const cardShotRef = useRef<ViewShotRef>(null);
  const shareAsImage = () => shareViewAsImage(cardShotRef);
  const [alert, setAlert] = useState<{ title: string; message: string; buttons?: any[] } | null>(null);
  const showAlert = (title: string, message: string, buttons?: any[]) =>
    setAlert({ title, message, buttons: buttons || [{ text: t('common.ok') }] });

  const pickFrom = async (source: 'library' | 'camera') => {
    setResult(null);
    try {
      const perm = source === 'library'
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showAlert(t('imageScanner.permissionNeededTitle'), source === 'library'
          ? t('imageScanner.photoLibraryPermission')
          : t('imageScanner.cameraPermission'));
        return;
      }
      const launch = source === 'library' ? ImagePicker.launchImageLibraryAsync : ImagePicker.launchCameraAsync;
      const picked = await launch({ mediaTypes: ['images'], quality: 0.8 });
      if (!picked.canceled && picked.assets?.[0]?.uri) {
        const asset = picked.assets[0];
        setImage({
          uri: asset.uri,
          name: asset.fileName || 'photo.jpg',
          type: asset.mimeType || 'image/jpeg',
        });
      }
    } catch {
      showAlert(t('imageScanner.couldNotOpenTitle'), t('imageScanner.couldNotOpenMessage'));
    }
  };

  const analyze = async () => {
    if (!image) {
      showAlert(t('imageScanner.noImageAlertTitle'), t('imageScanner.noImageAlertMessage'));
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('image', image as any);

      const res = await api.post('/images/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (error: any) {
      if (error.response?.status === 402) {
        showAlert(
          t('imageScanner.freeChecksUsedUpTitle'),
          error.response?.data?.message ||
            t('dashboard.freeChecksUsedUpFallback', { limit: FREE_LIMIT }),
          [
            { text: t('imageScanner.notNow'), style: 'cancel' },
            { text: t('imageScanner.seePremium'), onPress: () => navigation.navigate('Payment') },
          ]
        );
      } else {
        showAlert(t('imageScanner.scanFailedTitle'), error.response?.data?.message || t('imageScanner.scanFailedMessage'));
      }
    } finally {
      setLoading(false);
    }
  };

  const verdictColors = (status?: string) => {
    if (status === 'AI_GENERATED') return { fg: colors.bad, bg: colors.badBg, label: t('imageScanner.likelyAiGenerated') };
    if (status === 'VERIFIED') return { fg: colors.good, bg: colors.goodBg, label: t('imageScanner.noAiSignals') };
    return { fg: colors.warn, bg: colors.warnBg, label: t('imageScanner.inconclusive') };
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <IconButton icon="arrow-left" size={22} iconColor={colors.ink} onPress={() => navigation.goBack()} style={{ margin: 0 }} />
          <Text style={s.title}>{t('imageScanner.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={s.subtitle}>{t('imageScanner.subtitle')}</Text>

        <View style={s.card}>
          {image ? (
            <Image source={{ uri: image.uri }} style={s.preview} resizeMode="cover" />
          ) : (
            <View style={s.placeholder}>
              <IconButton icon="image-outline" size={40} iconColor={colors.inkMuted} style={{ margin: 0 }} />
              <Text style={s.placeholderText}>{t('imageScanner.noImageSelected')}</Text>
            </View>
          )}

          <View style={s.pickRow}>
            <TouchableOpacity style={s.pickBtn} onPress={() => pickFrom('library')} activeOpacity={0.85}>
              <Text style={s.pickBtnText}>{t('imageScanner.choosePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.pickBtn} onPress={() => pickFrom('camera')} activeOpacity={0.85}>
              <Text style={s.pickBtnText}>{t('imageScanner.takePhoto')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.primaryBtn, (!image || loading) && s.primaryBtnDisabled]}
            onPress={analyze}
            disabled={!image || loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color={colors.onTeal} /> : <Text style={s.primaryBtnText}>{t('imageScanner.analyzeImage')}</Text>}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={[s.resultCard, { backgroundColor: verdictColors(result.status).bg }]}>
            <Text style={[s.resultLabel, { color: verdictColors(result.status).fg }]}>
              {verdictColors(result.status).label}
            </Text>
            {typeof result.aiGeneratedProbability === 'number' && (
              <Text style={[s.resultProbability, { color: verdictColors(result.status).fg }]}>
                {t('imageScanner.confidenceLabel', { percent: Math.round(result.aiGeneratedProbability * 100) })}
              </Text>
            )}
            <Text style={s.resultMessage}>{result.verdictMessage || result.message}</Text>
            <TouchableOpacity style={s.shareRow} onPress={shareAsImage} activeOpacity={0.8}>
              <IconButton icon="image-outline" size={16} iconColor={verdictColors(result.status).fg} style={{ margin: 0 }} />
              <Text style={[s.shareRowText, { color: verdictColors(result.status).fg }]}>{t('imageScanner.shareAsImage')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {result && (
          <View style={s.offscreen} pointerEvents="none">
            <ViewShot ref={cardShotRef} options={{ format: 'png', quality: 0.95 }}>
              <ShareableResultCard
                headline={image?.name || t('imageScanner.title')}
                verdictText={verdictColors(result.status).label}
                percent={typeof result.aiGeneratedProbability === 'number' ? result.aiGeneratedProbability * 100 : 0}
                fg={verdictColors(result.status).fg}
                bg={verdictColors(result.status).bg}
                footerText="Checked with NewsCred"
              />
            </ViewShot>
          </View>
        )}
      </ScrollView>

      <CustomAlert
        visible={!!alert}
        title={alert?.title || ''}
        message={alert?.message || ''}
        buttons={alert?.buttons}
        onClose={() => setAlert(null)}
      />
    </SafeAreaView>
  );
};

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.paper },
  scroll: { paddingHorizontal: 16, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  title: { ...displayFont, fontSize: 20, color: c.ink },
  subtitle: { fontSize: 13, color: c.inkMuted, marginTop: 6, marginBottom: 18, lineHeight: 18 },
  card: {
    backgroundColor: c.card, borderWidth: 1, borderColor: c.line,
    borderRadius: 18, padding: 14, marginBottom: 18,
  },
  preview: { width: '100%', height: 220, borderRadius: 14, marginBottom: 14, backgroundColor: c.line },
  placeholder: {
    height: 220, borderRadius: 14, marginBottom: 14, backgroundColor: c.paper,
    borderWidth: 1, borderColor: c.line, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderText: { color: c.inkMuted, fontSize: 13, marginTop: 2 },
  pickRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pickBtn: {
    flex: 1, borderWidth: 1, borderColor: c.line, borderRadius: 12,
    paddingVertical: 11, alignItems: 'center', backgroundColor: c.paper,
  },
  pickBtnText: { color: c.ink, fontSize: 13, fontWeight: '600' },
  primaryBtn: { backgroundColor: c.teal, borderRadius: 26, paddingVertical: 13, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: c.onTeal, fontSize: 15, fontWeight: '700' },
  resultCard: { borderRadius: 18, padding: 16, marginBottom: 18 },
  resultLabel: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  resultProbability: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  resultMessage: { fontSize: 13, color: c.ink, lineHeight: 18 },
  shareRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, alignSelf: 'flex-start' },
  shareRowText: { fontSize: 13, fontWeight: '700' },
  offscreen: { position: 'absolute', top: -9999, left: -9999 },
});

export default ImageScannerScreen;
