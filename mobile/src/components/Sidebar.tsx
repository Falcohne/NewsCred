import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import type { RootStackParamList } from '../types';

interface SidebarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
  onUpgradePress?: () => void;
}

type NavigationType = StackNavigationProp<RootStackParamList>;

/**
 * Sidebar navigation component for the main app
 * Contains menu items, upgrade prompt, and logout button
 */
const Sidebar = ({ activeTab, onTabPress, onUpgradePress }: SidebarProps) => {
  const navigation = useNavigation<NavigationType>();
  const { t } = useTranslation();

  const menuItems = [
    { id: 'dashboard', label: t('sidebar.dashboard') },
    { id: 'url-scanner', label: t('sidebar.urlScanner') },
    { id: 'text-input', label: t('sidebar.textInput') },
    { id: 'image-scanner', label: t('sidebar.imageScanner') },
    { id: 'audio-scanner', label: t('sidebar.audioScanner') },
    { id: 'source-database', label: t('sidebar.sourceDatabase') },
    { id: 'statistics', label: t('sidebar.statistics') },
    { id: 'saved-articles', label: t('sidebar.savedArticles') },
    { id: 'settings', label: t('sidebar.settings') },
    { id: 'help-guide', label: t('sidebar.helpGuide') },
  ];

  /**
   * Handle logout - clears all stored data and navigates to login
   */
  const handleLogout = async (): Promise<void> => {
    try {
      Alert.alert(
        t('sidebar.logoutConfirmTitle'),
        t('sidebar.logoutConfirmMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('sidebar.logout'),
            style: 'destructive',
            onPress: async (): Promise<void> => {
              try {
                await AsyncStorage.clear();
                navigation.replace('Login');
              } catch (error) {
                console.error('Logout error:', error);
                Alert.alert(t('common.error'), t('sidebar.logoutError'));
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert(t('common.error'), t('sidebar.logoutError'));
    }
  };

  /**
   * Handle menu item press with proper navigation
   */
  const handleMenuItemPress = (tabId: string): void => {
    onTabPress(tabId);
    
    switch (tabId) {
      case 'dashboard':
        navigation.navigate('Dashboard');
        break;
      case 'settings':
        navigation.navigate('Settings');
        break;
      case 'source-database':
        navigation.navigate('SourceDatabase');
        break;
      case 'statistics':
        navigation.navigate('Statistics');
        break;
      case 'saved-articles':
        navigation.navigate('SavedArticles');
        break;
      case 'url-scanner':
        navigation.navigate('Dashboard');
        onTabPress('url-scanner');
        break;
      case 'text-input':
        navigation.navigate('Dashboard');
        onTabPress('text-input');
        break;
      case 'image-scanner':
        navigation.navigate('ImageScanner');
        break;
      case 'audio-scanner':
        navigation.navigate('AudioScanner');
        break;
      case 'help-guide':
        Alert.alert(
          t('sidebar.helpGuideTitle'),
          t('sidebar.helpGuideMessage'),
          [{ text: t('common.ok') }]
        );
        break;
      default:
        break;
    }
  };

  /**
   * Handle premium upgrade press
   */
  const handleUpgradePress = (): void => {
    if (onUpgradePress) {
      onUpgradePress();
      return;
    }
    Alert.alert(
      t('sidebar.upgradeTitle'),
      t('sidebar.upgradeAlertMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('sidebar.upgradeButton') },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>{t('sidebar.logo')}</Text>
        <Text style={styles.logoSubtext}>{t('sidebar.logoSubtext')}</Text>
      </View>

      <ScrollView 
        style={styles.menuContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuContent}
      >
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.menuItem,
              activeTab === item.id && styles.menuItemActive,
            ]}
            onPress={() => handleMenuItemPress(item.id)}
          >
            <Text
              style={[
                styles.menuLabel,
                activeTab === item.id && styles.menuLabelActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.upgradeContainer}
          onPress={handleUpgradePress}
        >
          <Text style={styles.upgradeTitle}>{t('sidebar.upgradeTitle')}</Text>
          <Text style={styles.upgradeDesc}>{t('sidebar.upgradeDesc')}</Text>
          <View style={styles.upgradeButton}>
            <Text style={styles.upgradeButtonText}>{t('sidebar.upgradeButton')}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('sidebar.logout')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 240,
    backgroundColor: '#1a2332',
    paddingTop: 40,
    paddingHorizontal: 16,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  logoContainer: {
    marginBottom: 20,
    paddingHorizontal: 4,
    flexShrink: 0,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  logoSubtext: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  menuContainer: {
    flex: 1,
  },
  menuContent: {
    paddingBottom: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  menuItemActive: {
    backgroundColor: '#2d3a4f',
  },
  menuLabel: {
    fontSize: 15,
    color: '#a0aec0',
    fontWeight: '500',
  },
  menuLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  bottomContainer: {
    flexShrink: 0,
    paddingBottom: 10,
  },
  upgradeContainer: {
    backgroundColor: '#2d3a4f',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  upgradeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  upgradeDesc: {
    fontSize: 12,
    color: '#a0aec0',
    marginBottom: 10,
    lineHeight: 16,
  },
  upgradeButton: {
    backgroundColor: '#e67e22',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutButton: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    color: '#e74c3c',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default Sidebar;