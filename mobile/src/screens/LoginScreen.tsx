import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import { useTheme, displayFont } from '../context/ThemeContext';

/** Persist the full session (including the refresh token). */
export const storeSession = async (d: any) => {
  const pairs: [string, string][] = [
    ['token', d.token || ''],
    ['refreshToken', d.refreshToken || ''],
    ['userId', d.userId || ''],
    ['userName', d.fullName || ''],
    ['userEmail', d.email || ''],
    ['isPremium', String(!!d.premium)],
    ['analysisCount', String(d.analysisCount ?? 0)],
  ];
  await AsyncStorage.multiSet(pairs);
};

const LoginScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const s = styles(colors);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string; buttons?: any[] } | null>(null);

  const login = async () => {
    if (!identifier.trim() || !password) {
      setAlert({ title: 'Missing details', message: 'Enter your email or username and your password.' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        usernameOrEmail: identifier.trim(),
        password,
      });
      await storeSession(res.data);
      const seen = await AsyncStorage.getItem('hasSeenOnboarding');
      navigation.replace(seen === 'true' ? 'MainTabs' : 'Onboarding');
    } catch (error: any) {
      const msg = error.response?.data?.message
        || (error.response ? 'Email/username or password is incorrect.' : 'Cannot reach the server. Check your connection.');
      setAlert({ title: 'Sign in failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.brand}>NewsCred</Text>
          <Text style={s.tagline}>Read smarter. Share safer.</Text>

          <View style={s.card}>
            <Text style={s.heading}>Sign in</Text>

            <Text style={s.label}>Email or username</Text>
            <TextInput
              style={s.input}
              placeholder="name@example.com"
              placeholderTextColor={colors.hint}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />

            <Text style={s.label}>Password</Text>
            <View style={s.passwordRow}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
                placeholder="Your password"
                placeholderTextColor={colors.hint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 12 }}>
                <Text style={{ color: colors.teal, fontSize: 12, fontWeight: '600' }}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.primaryBtn} onPress={login} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={colors.onTeal} /> : <Text style={s.primaryBtnText}>Sign in</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: colors.teal, fontSize: 13, fontWeight: '600' }}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <View style={s.footerRow}>
            <Text style={{ color: colors.inkMuted, fontSize: 13 }}>New to NewsCred? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={{ color: colors.teal, fontSize: 13, fontWeight: '700' }}>Create an account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {alert && (
        <CustomAlert
          visible
          title={alert.title}
          message={alert.message}
          buttons={alert.buttons || [{ text: 'OK' }]}
          onClose={() => setAlert(null)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.paper },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  brand: { ...displayFont, fontSize: 34, color: c.ink, textAlign: 'center', letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: c.inkMuted, textAlign: 'center', marginTop: 4, marginBottom: 28 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 20, padding: 20 },
  heading: { ...displayFont, fontSize: 20, color: c.ink, marginBottom: 16 },
  label: { fontSize: 12, color: c.inkMuted, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: c.line, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: c.ink, marginBottom: 14, backgroundColor: c.card,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: c.line, borderRadius: 12, marginBottom: 18, backgroundColor: c.card,
  },
  primaryBtn: { backgroundColor: c.teal, borderRadius: 26, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { color: c.onTeal, fontSize: 15, fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
});

export default LoginScreen;
