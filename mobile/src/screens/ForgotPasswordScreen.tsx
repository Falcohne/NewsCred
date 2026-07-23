import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import { useTheme, displayFont } from '../context/ThemeContext';

const ForgotPasswordScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const s = styles(colors);

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string; buttons?: any[] } | null>(null);

  const requestCode = async () => {
    if (!email.trim()) {
      setAlert({ title: 'Email needed', message: 'Enter the email you registered with.' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setStep(2);
      setAlert({
        title: 'Check your email',
        message: 'If that email is registered, a 6-digit code is on its way. It expires in 15 minutes.',
      });
    } catch (error: any) {
      setAlert({
        title: 'Could not send code',
        message: error.response?.data?.message || 'Something went wrong. Try again.',
      });
    } finally { setLoading(false); }
  };

  const reset = async () => {
    if (code.trim().length !== 6 || !newPassword) {
      setAlert({ title: 'Missing details', message: 'Enter the 6-digit code and a new password.' });
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
        title: 'Password reset',
        message: 'Sign in with your new password.',
        buttons: [{ text: 'Go to sign in', onPress: () => navigation.replace('Login') }],
      });
    } catch (error: any) {
      setAlert({
        title: 'Reset failed',
        message: error.response?.data?.message || 'Invalid or expired code.',
      });
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.brand}>NewsCred</Text>
          <Text style={s.tagline}>Reset your password</Text>

          <View style={s.card}>
            {step === 1 ? (
              <>
                <Text style={s.heading}>Forgot your password?</Text>
                <Text style={s.body}>
                  Enter your email and we'll send a 6-digit reset code.
                </Text>
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
                  {loading ? <ActivityIndicator color={colors.onTeal} /> : <Text style={s.primaryBtnText}>Send reset code</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.heading}>Enter the code</Text>
                <Text style={s.body}>We sent a 6-digit code to {email.trim()}.</Text>
                <TextInput
                  style={[s.input, { textAlign: 'center', letterSpacing: 8, fontSize: 18, fontWeight: '700' }]}
                  placeholder="000000"
                  placeholderTextColor={colors.hint}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                />
                <TextInput
                  style={s.input}
                  placeholder="New password"
                  placeholderTextColor={colors.hint}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <TouchableOpacity style={s.primaryBtn} onPress={reset} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color={colors.onTeal} /> : <Text style={s.primaryBtnText}>Reset password</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={requestCode} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={{ color: colors.teal, fontSize: 13, fontWeight: '600' }}>Send a new code</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 18, alignItems: 'center' }}>
            <Text style={{ color: colors.inkMuted, fontSize: 13 }}>Back to sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {alert && (
        <CustomAlert visible title={alert.title} message={alert.message}
          buttons={alert.buttons || [{ text: 'OK' }]} onClose={() => setAlert(null)} />
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
