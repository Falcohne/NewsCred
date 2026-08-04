import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { enableNotifications, disableNotifications, isExpoGo } from '../services/notifications';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';
import { useTheme, displayFont } from '../context/ThemeContext';
import { SUPPORTED_LANGUAGES, changeAppLanguage, LanguageCode } from '../i18n';

type Panel = 'none' | 'name' | 'password' | 'delete';

const SettingsScreen = ({ navigation }: any) => {
  const { colors, darkMode, toggleDarkMode } = useTheme();
  const { t, i18n } = useTranslation();
  const s = styles(colors);

  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [notifs, setNotifs] = useState(false);
  const [panel, setPanel] = useState<Panel>('none');

  const [newName, setNewName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string; buttons?: any[] } | null>(null);

  const load = async () => {
    const uid = (await AsyncStorage.getItem('userId')) || '';
    setUserId(uid);
    setName((await AsyncStorage.getItem('userName')) || '');
    setEmail((await AsyncStorage.getItem('userEmail')) || '');
    setProfileImage(await AsyncStorage.getItem('profileImage'));
    setNotifs((await AsyncStorage.getItem('notificationsEnabled')) === 'true');
    setIsAdmin((await AsyncStorage.getItem('isAdmin')) === 'true');
    try {
      if (uid) {
        const res = await api.get(`/users/${uid}`);
        setName(res.data.fullName || '');
        setEmail(res.data.email || '');
        setIsPremium(!!res.data.premium);
        await AsyncStorage.setItem('isPremium', String(!!res.data.premium));
      }
    } catch {
      setIsPremium((await AsyncStorage.getItem('isPremium')) === 'true');
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const pickProfilePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setAlert({ title: t('settings.permissionNeededTitle'), message: t('settings.photoPermissionMessage') });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        await AsyncStorage.setItem('profileImage', uri);
        setProfileImage(uri);
      }
    } catch {
      setAlert({ title: t('settings.photoFailedTitle'), message: t('settings.photoFailedMessage') });
    }
  };

  const toggleNotifs = async (value: boolean) => {
    if (value) {
      const granted = await enableNotifications();
      setNotifs(granted);
      if (!granted) {
        setAlert({
          title: isExpoGo ? t('settings.notAvailableInExpoGoTitle') : t('settings.permissionNeededTitle'),
          message: isExpoGo
            ? t('settings.expoGoNotificationsMessage')
            : t('settings.notificationsPermissionMessage'),
        });
      }
    } else {
      await disableNotifications();
      setNotifs(false);
    }
  };

  const saveName = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await api.put(`/users/${userId}`, { fullName: newName.trim() });
      await AsyncStorage.setItem('userName', newName.trim());
      setName(newName.trim());
      setPanel('none');
      setNewName('');
      setAlert({ title: t('settings.savedTitle'), message: t('settings.nameUpdatedMessage') });
    } catch (e: any) {
      setAlert({ title: t('settings.updateFailedTitle'), message: e.response?.data?.message || t('settings.updateFailedMessage') });
    } finally { setBusy(false); }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword) {
      setAlert({ title: t('settings.missingDetailsTitle'), message: t('settings.missingPasswordDetails') });
      return;
    }
    setBusy(true);
    try {
      await api.put(`/users/${userId}/password`, { currentPassword, newPassword });
      setPanel('none');
      setCurrentPassword('');
      setNewPassword('');
      setAlert({ title: t('settings.passwordChangedTitle'), message: t('settings.passwordChangedMessage') });
    } catch (e: any) {
      setAlert({ title: t('settings.changeFailedTitle'), message: e.response?.data?.message || t('settings.changeFailedMessage') });
    } finally { setBusy(false); }
  };

  const signOut = () => {
    setAlert({
      title: t('settings.signOutTitle'),
      message: t('settings.signOutMessage'),
      buttons: [
        { text: t('settings.stay'), style: 'cancel' },
        {
          text: t('settings.signOutAction'),
          onPress: async () => {
            await AsyncStorage.multiRemove([
              'token', 'refreshToken', 'userId', 'userName', 'userEmail', 'isPremium', 'analysisCount', 'isAdmin',
            ]);
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ],
    });
  };

  const deleteAccount = async () => {
    if (!deletePassword) {
      setAlert({ title: t('settings.passwordNeededTitle'), message: t('settings.passwordNeededMessage') });
      return;
    }
    setBusy(true);
    try {
      await api.delete(`/users/${userId}`, {
        data: { password: deletePassword, confirmation: 'DELETE' },
      });
      await AsyncStorage.clear();
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e: any) {
      setAlert({ title: t('settings.deletionFailedTitle'), message: e.response?.data?.message || t('settings.deletionFailedMessage') });
    } finally { setBusy(false); }
  };

  const initials = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={s.pageTitle}>{t('settings.pageTitle')}</Text>

        {/* Profile */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={pickProfilePhoto} activeOpacity={0.8}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              ) : (
                <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
              )}
              <View style={s.avatarEdit}><Text style={{ fontSize: 9, color: colors.onTeal, fontWeight: '700' }}>{t('settings.editPhoto')}</Text></View>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.name}>{name || t('settings.yourName')}</Text>
              <Text style={s.email}>{email}</Text>
            </View>
            <View style={[s.tierBadge, { backgroundColor: isPremium ? colors.tealSoft : colors.line }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: isPremium ? colors.teal : colors.inkMuted }}>
                {isPremium ? t('settings.premiumTier') : t('settings.freeTier')}
              </Text>
            </View>
          </View>
        </View>

        {/* Membership */}
        <Text style={s.groupLabel}>{t('settings.membershipGroup')}</Text>
        <View style={s.card}>
          {isPremium ? (
            <Text style={s.rowNote}>{t('settings.premiumStatusNote')}</Text>
          ) : (
            <Row
              label={t('settings.upgradeLabel')}
              note={t('settings.upgradeNote')}
              action={t('settings.upgradeAction')}
              onPress={() => navigation.navigate('Payment')}
              colors={colors}
            />
          )}
        </View>

        {/* Appearance */}
        <Text style={s.groupLabel}>{t('settings.appearanceGroup')}</Text>
        <View style={s.card}>
          <View style={s.rowBetween}>
            <View>
              <Text style={s.rowLabel}>{t('settings.darkModeLabel')}</Text>
              <Text style={s.rowNote}>{t('settings.darkModeNote')}</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: colors.line, true: colors.teal }}
              thumbColor={colors.card}
            />
          </View>
          <View style={s.divider} />
          <View style={s.rowBetween}>
            <View>
              <Text style={s.rowLabel}>{t('settings.notificationsLabel')}</Text>
              <Text style={s.rowNote}>{t('settings.notificationsNote')}</Text>
            </View>
            <Switch
              value={notifs}
              onValueChange={toggleNotifs}
              trackColor={{ false: colors.line, true: colors.teal }}
              thumbColor={colors.card}
            />
          </View>
        </View>

        {/* Language */}
        <Text style={s.groupLabel}>{t('settings.languageGroup')}</Text>
        <View style={s.card}>
          <Text style={s.rowLabel}>{t('settings.languageLabel')}</Text>
          <Text style={s.rowNote}>{t('settings.languageNote')}</Text>
          <View style={s.languageRow}>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = i18n.language === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[s.languagePill, active && s.languagePillActive]}
                  onPress={() => changeAppLanguage(lang.code as LanguageCode)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.languagePillText, active && s.languagePillTextActive]}>{lang.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Account */}
        <Text style={s.groupLabel}>{t('settings.accountGroup')}</Text>
        <View style={s.card}>
          <Row label={t('settings.changeNameLabel')} action={panel === 'name' ? t('common.close') : t('common.edit')}
            onPress={() => setPanel(panel === 'name' ? 'none' : 'name')} colors={colors} />
          {panel === 'name' && (
            <View style={s.panel}>
              <TextInput style={s.input} placeholder={name || t('settings.newNamePlaceholder')} placeholderTextColor={colors.hint}
                value={newName} onChangeText={setNewName} />
              <PrimaryButton label={t('settings.saveName')} onPress={saveName} busy={busy} colors={colors} />
            </View>
          )}

          <View style={s.divider} />

          <Row label={t('settings.changePasswordLabel')} action={panel === 'password' ? t('common.close') : t('common.edit')}
            onPress={() => setPanel(panel === 'password' ? 'none' : 'password')} colors={colors} />
          {panel === 'password' && (
            <View style={s.panel}>
              <TextInput style={s.input} placeholder={t('settings.currentPasswordPlaceholder')} placeholderTextColor={colors.hint}
                value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
              <TextInput style={s.input} placeholder={t('settings.newPasswordPlaceholder')} placeholderTextColor={colors.hint}
                value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              <PrimaryButton label={t('settings.changePasswordAction')} onPress={savePassword} busy={busy} colors={colors} />
            </View>
          )}
        </View>

        {/* Admin */}
        {isAdmin && (
          <>
            <Text style={s.groupLabel}>{t('settings.adminGroup')}</Text>
            <View style={s.card}>
              <Row
                label={t('settings.adminDashboardLabel')}
                note={t('settings.adminDashboardNote')}
                action={t('common.view')}
                onPress={() => navigation.navigate('AdminDashboard')}
                colors={colors}
              />
            </View>
          </>
        )}

        {/* Help */}
        <Text style={s.groupLabel}>{t('settings.helpGroup')}</Text>
        <View style={s.card}>
          <Row
            label={t('settings.howWeScoreLabel')}
            note={t('settings.howWeScoreNote')}
            action={t('common.view')}
            onPress={() => navigation.navigate('HowWeScore')}
            colors={colors}
          />
          <View style={s.divider} />
          <Row
            label={t('settings.replayTourLabel')}
            note={t('settings.replayTourNote')}
            action={t('settings.replay')}
            onPress={() => navigation.navigate('Onboarding')}
            colors={colors}
          />
        </View>

        {/* Session */}
        <Text style={s.groupLabel}>{t('settings.sessionGroup')}</Text>
        <View style={s.card}>
          <Row label={t('settings.signOutLabel')} action={t('settings.signOutAction')} onPress={signOut} colors={colors} />
          <View style={s.divider} />
          <Row
            label={t('settings.deleteAccountLabel')}
            note={t('settings.deleteAccountNote')}
            action={panel === 'delete' ? t('common.close') : t('settings.delete')}
            danger
            onPress={() => setPanel(panel === 'delete' ? 'none' : 'delete')}
            colors={colors}
          />
          {panel === 'delete' && (
            <View style={s.panel}>
              <Text style={[s.rowNote, { marginBottom: 8 }]}>{t('settings.deleteAccountWarning')}</Text>
              <TextInput style={s.input} placeholder={t('settings.deletePasswordPlaceholder')} placeholderTextColor={colors.hint}
                value={deletePassword} onChangeText={setDeletePassword} secureTextEntry />
              <TouchableOpacity
                style={[s.primaryBtn, { backgroundColor: colors.bad }]}
                onPress={deleteAccount} disabled={busy} activeOpacity={0.85}
              >
                {busy ? <ActivityIndicator color="#FFFFFF" /> :
                  <Text style={[s.primaryBtnText, { color: '#FFFFFF' }]}>{t('settings.deleteMyAccount')}</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={s.footer}>{t('settings.footer')}</Text>
        <View style={{ height: 24 }} />
      </ScrollView>

      {alert && (
        <CustomAlert visible title={alert.title} message={alert.message}
          buttons={alert.buttons || [{ text: t('common.ok') }]} onClose={() => setAlert(null)} />
      )}
    </SafeAreaView>
  );
};

const Row = ({ label, note, action, onPress, danger, colors }: any) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <View style={{ flex: 1, paddingRight: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: danger ? colors.bad : colors.ink }}>{label}</Text>
      {!!note && <Text style={{ fontSize: 12, color: colors.inkMuted, marginTop: 2 }}>{note}</Text>}
    </View>
    <TouchableOpacity onPress={onPress}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: danger ? colors.bad : colors.teal }}>{action}</Text>
    </TouchableOpacity>
  </View>
);

const PrimaryButton = ({ label, onPress, busy, colors }: any) => (
  <TouchableOpacity
    style={{ backgroundColor: colors.teal, borderRadius: 24, paddingVertical: 11, alignItems: 'center' }}
    onPress={onPress} disabled={busy} activeOpacity={0.85}
  >
    {busy ? <ActivityIndicator color={colors.onTeal} /> :
      <Text style={{ color: colors.onTeal, fontSize: 14, fontWeight: '700' }}>{label}</Text>}
  </TouchableOpacity>
);

const styles = (c: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.paper },
  scroll: { padding: 16 },
  pageTitle: { ...displayFont, fontSize: 22, color: c.ink, marginBottom: 14 },
  card: { backgroundColor: c.card, borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 16, marginBottom: 8 },
  groupLabel: { fontSize: 12, fontWeight: '700', color: c.inkMuted, marginTop: 10, marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: c.tealSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: c.teal, fontWeight: '700', fontSize: 16 },
  avatarEdit: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: c.teal, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1,
  },
  name: { fontSize: 16, fontWeight: '700', color: c.ink },
  email: { fontSize: 12, color: c.inkMuted, marginTop: 2 },
  tierBadge: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 14, fontWeight: '600', color: c.ink },
  rowNote: { fontSize: 12, color: c.inkMuted, marginTop: 2, lineHeight: 18 },
  languageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  languagePill: {
    borderWidth: 1, borderColor: c.line, borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 16, backgroundColor: c.paper,
  },
  languagePillActive: { backgroundColor: c.tealSoft, borderColor: c.teal },
  languagePillText: { fontSize: 13, fontWeight: '600', color: c.inkMuted },
  languagePillTextActive: { color: c.teal },
  divider: { height: 1, backgroundColor: c.line, marginVertical: 14 },
  panel: { marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: c.line, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14,
    color: c.ink, marginBottom: 10, backgroundColor: c.card,
  },
  primaryBtn: { borderRadius: 24, paddingVertical: 11, alignItems: 'center' },
  primaryBtnText: { fontSize: 14, fontWeight: '700' },
  footer: { fontSize: 11, color: c.hint, textAlign: 'center', marginTop: 16 },
});

export default SettingsScreen;
