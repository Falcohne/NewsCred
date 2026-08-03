import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import { useTheme, displayFont } from '../context/ThemeContext';

const ForgotPasswordScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const s = styles(colors);

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string; buttons?: any[] } | null>(null);

  const requestCode = async () => {
    if (!email.trim()) {
      setAlert({ title: t('forgotPassword.emailNeededTitle'), message: t('forgotPassword.emailNeededMessage') });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setStep(2);
      setAlert({
        title: t('forgotPassword.checkEmailTitle'),
        message: t('forgotPassword.checkEmailMessage'),
      });
    } catch (error: any) {
      setAlert({
        title: t('forgotPassword.couldNotSendTitle'),
        message: error.response?.data?.message || t('forgotPassword.couldNotSendMessage'),
      });
    } finally { setLoading(false); }
  };

  const reset = async () => {
    if (code.trim().length !== 6 || !newPassword) {
      setAlert({ title: t('forgotPassword.missingDetailsTitle'), message: t('forgotPassword.missingDetailsMessage') });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword,
      });
      setAlert({
        title: t('forgotPassword.resetSuccessTitle'),
        message: t('forgotPassword.resetSuccessMessage'),
        buttons: [{ text: t('forgotPassword.goToSignIn'), onPress: () => navigation.replace('Login') }],
      });
    } catch (error: any) {
      setAlert({
        title: t('forgotPassword.resetFailedTitle'),
        message: error.response?.data?.message || t('forgotPassword.resetFailedMessage'),
      });
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.brand}>NewsCred</Text>
          <Text style={s.tagline}>{t('forgotPassword.tagline')}</Text>

          <View style={s.card}>
            {step === 1 ? (
              <>
                <Text style={s.heading}>{t('forgotPassword.forgotHeading')}</Text>
                <Text style={s.body}>{t('forgotPassword.forgotBody')}</Text>
                <TextInput
                  style={s.input}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.hint}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TouchableOpacity style={s.primaryBtn} onPress={requestCode} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color={colors.onTeal} /> : <Text style={s.primaryBtnText}>{t('forgotPassword.sendCodeButton')}</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.heading}>{t('forgotPassword.enterCodeHeading')}</Text>
                <Text style={s.body}>{t('forgotPassword.codeSentBody', { email: email.trim() })}</Text>
                <TextInput
                  style={[s.input, { textAlign: 'center', letterSpacing: 8, fontSize: 18, fontWeight: '700' }]}
                  placeholder="000000"
                  placeholderTextColor={colors.hint}
                  value={code}
                  onChangeText={(raw) => setCode(raw.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={s.input}
                  placeholder={t('forgotPassword.newPasswordPlaceholder')}
                  placeholderTextColor={colors.hint}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <TouchableOpacity style={s.primaryBtn} onPress={reset} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color={colors.onTeal} /> : <Text style={s.primaryBtnText}>{t('forgotPassword.resetPasswordButton')}</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={requestCode} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ color: colors.teal, fontSize: 13, fontWeight: '600' }}>{t('forgotPassword.sendNewCode')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 18, alignItems: 'center' }}>
            <Text style={{ color: colors.inkMuted, fontSize: 13 }}>{t('forgotPassword.backToSignIn')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {alert && (
        <CustomAlert visible title={alert.title} message={alert.message}
          buttons={alert.buttons || [{ text: t('common.ok') }]} onClose={() => setAlert(null)} />
      )}
    </SafeAreaView>
  );
};

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.paper },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { ...displayFont, fontSize: 30, color: c.ink, textAlign: 'center', letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: c.inkMuted, textAlign: 'center', marginTop: 4, marginBottom: 24 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 20, padding: 20 },
  heading: { ...displayFont, fontSize: 19, color: c.ink, marginBottom: 8 },
  body: { fontSize: 13, color: c.inkMuted, lineHeight: 19, marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: c.line, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: c.ink, marginBottom: 12, backgroundColor: c.card,
  },
  primaryBtn: { backgroundColor: c.teal, borderRadius: 26, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { color: c.onTeal, fontSize: 15, fontWeight: '700' },
});

export default ForgotPasswordScreen;
