import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import { useTheme, displayFont } from '../context/ThemeContext';
import { storeSession } from './LoginScreen';

const RegisterScreen = ({ navigation }: any) => {
  const { colors } = useTheme();
  const s = styles(colors);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string; buttons?: any[] } | null>(null);

  const passwordChecks = [
    { ok: password.length >= 8, label: '8+ characters' },
    { ok: /[A-Z]/.test(password), label: 'One uppercase letter' },
    { ok: /[0-9]/.test(password), label: 'One number' },
    { ok: /[^A-Za-z0-9]/.test(password), label: 'One symbol' },
  ];

  const register = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      setAlert({ title: 'Missing details', message: 'Fill in your name, email, and a password.' });
      return;
    }
    if (password !== confirm) {
      setAlert({ title: 'Passwords differ', message: 'The two passwords do not match.' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim() || undefined,
        password,
      });
      // Backend nests the auth payload under "response"
      const auth = res.data?.response || res.data;
      await storeSession(auth);
      setAlert({
        title: 'Welcome to NewsCred',
        message: 'Your account is ready.',
        buttons: [{
          text: 'Start checking',
          onPress: async () => {
            const seen = await AsyncStorage.getItem('hasSeenOnboarding');
            navigation.replace(seen === 'true' ? 'MainTabs' : 'Onboarding');
          },
        }],
      });
    } catch (error: any) {
      const msg = error.response?.data?.message
        || (error.response ? 'Registration failed. Check your details.' : 'Cannot reach the server. Check your connection.');
      setAlert({ title: 'Registration failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          <Text style={s.brand}>NewsCred</Text>
          <Text style={s.tagline}>Create your account</Text>

          <View style={s.card}>
            <Text style={s.label}>Full name</Text>
            <TextInput style={s.input} placeholder="Ama Mensah" placeholderTextColor={colors.hint}
              value={fullName} onChangeText={setFullName} />

            <Text style={s.label}>Email</Text>
            <TextInput style={s.input} placeholder="name@example.com" placeholderTextColor={colors.hint}
              value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

            <Text style={s.label}>Username (optional)</Text>
            <TextInput style={s.input} placeholder="ama_gh" placeholderTextColor={colors.hint}
              value={username} onChangeText={setUsername} autoCapitalize="none" />

            <Text style={s.label}>Password</Text>
            <View style={s.passwordRow}>
              <TextInput style={[s.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
                placeholder="Create a password" placeholderTextColor={colors.hint}
                value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 12 }}>
                <Text style={{ color: colors.teal, fontSize: 12, fontWeight: '600' }}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {password.length > 0 && (
              <View style={s.checksWrap}>
                {passwordChecks.map((chk) => (
                  <Text key={chk.label} style={{ fontSize: 11, marginRight: 12, marginBottom: 4, color: chk.ok ? colors.good : colors.hint }}>
                    {chk.ok ? '✓ ' : '○ '}{chk.label}
                  </Text>
                ))}
              </View>
            )}

            <Text style={s.label}>Confirm password</Text>
            <TextInput style={s.input} placeholder="Repeat the password" placeholderTextColor={colors.hint}
              value={confirm} onChangeText={setConfirm} secureTextEntry={!showPassword} />

            <TouchableOpacity style={s.primaryBtn} onPress={register} disabled={loading} activeOpacity={0.85}>
              {loading ? <ActivityIndicator color={colors.onTeal} /> : <Text style={s.primaryBtnText}>Create account</Text>}
            </TouchableOpacity>
          </View>

          <View style={s.footerRow}>
            <Text style={{ color: colors.inkMuted, fontSize: 13 }}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: colors.teal, fontSize: 13, fontWeight: '700' }}>Sign in</Text>
            </TouchableOpacity>
          </View>
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
  tagline: { fontSize: 13, color: c.inkMuted, textAlign: 'center', marginTop: 4, marginBottom: 22 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 20, padding: 20 },
  label: { fontSize: 12, color: c.inkMuted, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: c.line, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    color: c.ink, marginBottom: 12, backgroundColor: c.card,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: c.line, borderRadius: 12, marginBottom: 8, backgroundColor: c.card,
  },
  checksWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 },
  primaryBtn: { backgroundColor: c.teal, borderRadius: 26, paddingVertical: 13, alignItems: 'center', marginTop: 6 },
  primaryBtnText: { color: c.onTeal, fontSize: 15, fontWeight: '700' },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
});

export default RegisterScreen;
