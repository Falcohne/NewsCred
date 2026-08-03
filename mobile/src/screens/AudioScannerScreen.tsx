import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import {
  useAudioRecorder, useAudioRecorderState, AudioModule, RecordingPresets, setAudioModeAsync,
} from 'expo-audio';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import { useTheme, displayFont, verdictLabel } from '../context/ThemeContext';
import { ArticleAnalysisResponse } from '../types';

const FREE_LIMIT = 3;

const AudioScannerScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const s = styles(colors);

  const [audio, setAudio] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ArticleAnalysisResponse | null>(null);
  const [alert, setAlert] = useState<{ title: string; message: string; buttons?: any[] } | null>(null);
  const showAlert = (title: string, message: string, buttons?: any[]) =>
    setAlert({ title, message, buttons: buttons || [{ text: t('common.ok') }] });

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
  }, []);

  const startRecording = async () => {
    setResult(null);
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        showAlert(t('audioScanner.permissionNeededTitle'), t('audioScanner.microphonePermission'));
        return;
      }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch {
      showAlert(t('audioScanner.recordingFailedTitle'), t('audioScanner.recordingFailedMessage'));
    }
  };

  const stopRecording = async () => {
    try {
      await audioRecorder.stop();
      if (audioRecorder.uri) {
        setAudio({ uri: audioRecorder.uri, name: 'voice-note.m4a', type: 'audio/m4a' });
      }
    } catch {
      showAlert(t('audioScanner.recordingFailedTitle'), t('audioScanner.recordingFailedMessage'));
    }
  };

  const pickAudio = async () => {
    setResult(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });
      if (!picked.canceled && picked.assets?.[0]) {
        const asset = picked.assets[0];
        setAudio({
          uri: asset.uri,
          name: asset.name || 'audio.mp3',
          type: asset.mimeType || 'audio/mpeg',
        });
      }
    } catch {
      showAlert(t('audioScanner.couldNotOpenTitle'), t('audioScanner.couldNotOpenMessage'));
    }
  };

  const analyze = async () => {
    if (!audio) {
      showAlert(t('audioScanner.noAudioAlertTitle'), t('audioScanner.noAudioAlertMessage'));
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('audio', audio as any);

      const res = await api.post('/audio/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (error: any) {
      if (error.response?.status === 402) {
        showAlert(
          t('audioScanner.freeChecksUsedUpTitle'),
          error.response?.data?.message ||
            t('dashboard.freeChecksUsedUpFallback', { limit: FREE_LIMIT }),
          [
            { text: t('audioScanner.notNow'), style: 'cancel' },
            { text: t('audioScanner.seePremium'), onPress: () => navigation.navigate('Payment') },
          ]
        );
      } else if (error.response?.status === 503) {
        showAlert(t('audioScanner.notAvailableTitle'), error.response?.data?.message || t('audioScanner.notAvailableMessage'));
      } else {
        showAlert(t('audioScanner.scanFailedTitle'), error.response?.data?.message || t('audioScanner.scanFailedMessage'));
      }
    } finally {
      setLoading(false);
    }
  };

  const scoreColors = (score?: number) => {
    if (score == null) return { fg: colors.warn, bg: colors.warnBg };
    if (score >= 65) return { fg: colors.good, bg: colors.goodBg };
    if (score >= 45) return { fg: colors.warn, bg: colors.warnBg };
    return { fg: colors.bad, bg: colors.badBg };
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <IconButton icon="arrow-left" size={22} iconColor={colors.ink} onPress={() => navigation.goBack()} style={{ margin: 0 }} />
          <Text style={s.title}>{t('audioScanner.title')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={s.subtitle}>{t('audioScanner.subtitle')}</Text>
        <View style={s.disclaimerBox}>
          <IconButton icon="information-outline" size={16} iconColor={colors.inkMuted} style={{ margin: 0 }} />
          <Text style={s.disclaimerText}>{t('audioScanner.disclaimer')}</Text>
        </View>

        <View style={s.card}>
          {audio ? (
            <View style={s.filePreview}>
              <IconButton icon="file-music-outline" size={32} iconColor={colors.teal} style={{ margin: 0 }} />
              <Text style={s.fileName} numberOfLines={1}>{audio.name}</Text>
            </View>
          ) : (
            <View style={[s.placeholder, recorderState.isRecording && s.placeholderRecording]}>
              <IconButton
                icon={recorderState.isRecording ? 'stop-circle-outline' : 'microphone-outline'}
                size={40}
                iconColor={recorderState.isRecording ? colors.bad : colors.inkMuted}
                style={{ margin: 0 }}
              />
              <Text style={s.placeholderText}>
                {recorderState.isRecording ? t('audioScanner.recordingInProgress') : t('audioScanner.noAudioSelected')}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.pickBtn, recorderState.isRecording && s.recordBtnActive]}
            onPress={recorderState.isRecording ? stopRecording : startRecording}
            activeOpacity={0.85}
          >
            <Text style={[s.pickBtnText, recorderState.isRecording && { color: colors.bad }]}>
              {recorderState.isRecording ? t('audioScanner.stopRecordingButton') : t('audioScanner.recordButton')}
            </Text>
          </TouchableOpacity>

          <Text style={s.orDivider}>{t('audioScanner.orDivider')}</Text>

          <TouchableOpacity style={s.pickBtn} onPress={pickAudio} activeOpacity={0.85} disabled={recorderState.isRecording}>
            <Text style={s.pickBtnText}>{t('audioScanner.chooseAudioFile')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.primaryBtn, (!audio || loading || recorderState.isRecording) && s.primaryBtnDisabled]}
            onPress={analyze}
            disabled={!audio || loading || recorderState.isRecording}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color={colors.onTeal} /> : <Text style={s.primaryBtnText}>{t('audioScanner.analyzeAudio')}</Text>}
          </TouchableOpacity>
        </View>

        {result && (
          <View style={[s.resultCard, { backgroundColor: scoreColors(result.overallScore).bg }]}>
            <Text style={[s.resultLabel, { color: scoreColors(result.overallScore).fg }]}>
              {verdictLabel(result.credibilityVerdict)}
            </Text>
            <Text style={[s.resultScore, { color: scoreColors(result.overallScore).fg }]}>
              {t('audioScanner.creditibilityScoreLabel', { percent: Math.round(result.overallScore) })}
            </Text>
            {result.contentSummary && <Text style={s.resultMessage}>{result.contentSummary}</Text>}
            <TouchableOpacity
              style={s.detailLink}
              onPress={() => navigation.navigate('AnalysisDetail', { result })}
            >
              <Text style={s.detailLinkText}>{t('audioScanner.viewFullReport')}</Text>
            </TouchableOpacity>
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
  subtitle: { fontSize: 13, color: c.inkMuted, marginTop: 6, marginBottom: 10, lineHeight: 18 },
  disclaimerBox: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: c.tealSoft,
    borderRadius: 12, padding: 10, marginBottom: 18,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: c.inkMuted, lineHeight: 17, marginTop: 2 },
  card: {
    backgroundColor: c.card, borderWidth: 1, borderColor: c.line,
    borderRadius: 18, padding: 14, marginBottom: 18,
  },
  filePreview: {
    height: 120, borderRadius: 14, marginBottom: 14, backgroundColor: c.tealSoft,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20,
  },
  fileName: { color: c.ink, fontSize: 13, fontWeight: '600', marginTop: 2 },
  placeholder: {
    height: 120, borderRadius: 14, marginBottom: 14, backgroundColor: c.paper,
    borderWidth: 1, borderColor: c.line, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderRecording: { borderColor: c.bad, borderStyle: 'solid' },
  placeholderText: { color: c.inkMuted, fontSize: 13, marginTop: 2 },
  pickBtn: {
    borderWidth: 1, borderColor: c.line, borderRadius: 12,
    paddingVertical: 11, alignItems: 'center', backgroundColor: c.paper, marginBottom: 12,
  },
  recordBtnActive: { borderColor: c.bad },
  pickBtnText: { color: c.ink, fontSize: 13, fontWeight: '600' },
  orDivider: { textAlign: 'center', fontSize: 12, color: c.inkMuted, marginBottom: 12 },
  primaryBtn: { backgroundColor: c.teal, borderRadius: 26, paddingVertical: 13, alignItems: 'center' },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: c.onTeal, fontSize: 15, fontWeight: '700' },
  resultCard: { borderRadius: 18, padding: 16, marginBottom: 18 },
  resultLabel: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  resultScore: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  resultMessage: { fontSize: 13, color: c.ink, lineHeight: 18, marginBottom: 10 },
  detailLink: { alignSelf: 'flex-start' },
  detailLinkText: { fontSize: 13, fontWeight: '700', color: c.teal },
});

export default AudioScannerScreen;
