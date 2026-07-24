import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Badge } from 'react-native-paper';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

import DashboardScreen from '../screens/DashboardScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import SavedArticlesScreen from '../screens/SavedArticlesScreen';
import NewsScreen from '../screens/NewsScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

const useNewsBadge = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem('newsTabVisited').then((v) => setShow(v !== 'true'));
  }, []);
  const clear = () => {
    setShow(false);
    AsyncStorage.setItem('newsTabVisited', 'true');
  };
  return { show, clear };
};

/**
 * Bottom tab navigator with five main sections
 * Uses Expo Vector Icons for clean, professional icons
 * Integrated with Paper theme for consistent styling
 */
/** Small "new feature" dot on the News tab, cleared once visited. */
const NewsNewDot = () => {
  const [seen, setSeen] = useState(true);
  const isFocused = useIsFocused();

  useEffect(() => {
    AsyncStorage.getItem('newsTabSeen').then((v) => setSeen(v === 'true'));
  }, []);

  useEffect(() => {
    if (isFocused) {
      AsyncStorage.setItem('newsTabSeen', 'true');
      setSeen(true);
    }
  }, [isFocused]);

  if (seen) return null;
  return (
    <View
      style={{
        position: 'absolute', top: -2, right: -6,
        width: 8, height: 8, borderRadius: 4, backgroundColor: '#0F6E56',
      }}
    />
  );
};

const BottomTabNavigator = () => {
  const { darkMode, colors } = useTheme();

  const themeColors = {
    background: colors.paper,
    card: colors.card,
    tint: colors.teal,
    inactiveTint: darkMode ? '#666666' : '#999999',
  };

  const newsBadge = useNewsBadge();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: themeColors.card,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 8,
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
        tabBarActiveTintColor: themeColors.tint,
        tabBarInactiveTintColor: themeColors.inactiveTint,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
          marginBottom: 4,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any = '';
          let badgeCount = 0;
          
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Reports':
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
              break;
            case 'History':
              iconName = focused ? 'document-text' : 'document-text-outline';
              break;
            case 'News':
              iconName = focused ? 'newspaper' : 'newspaper-outline';
              if (newsBadge.show) badgeCount = 1;
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'apps-outline';
          }
          
          return (
            <>
              <Ionicons name={iconName} size={24} color={color} />
              {badgeCount > 0 && (
                <Badge 
                  style={styles.badge}
                  size={18}
                >
                  {badgeCount}
                </Badge>
              )}
              {route.name === 'News' && <NewsNewDot />}
            </>
          );
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen} 
        options={{ 
          tabBarLabel: 'Home',
          tabBarAccessibilityLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Reports" 
        component={StatisticsScreen} 
        options={{ 
          tabBarLabel: 'Reports',
          tabBarAccessibilityLabel: 'Reports',
        }}
      />
      <Tab.Screen 
        name="History" 
        component={SavedArticlesScreen} 
        options={{ 
          tabBarLabel: 'History',
          tabBarAccessibilityLabel: 'History',
        }}
      />
      <Tab.Screen 
        name="News" 
        component={NewsScreen} 
        options={{ 
          tabBarLabel: 'News',
          tabBarAccessibilityLabel: 'News',
        }}
        listeners={{
          tabPress: () => newsBadge.clear(),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={SettingsScreen} 
        options={{ 
          tabBarLabel: 'Profile',
          tabBarAccessibilityLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const styles = {
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF5350',
    color: '#FFFFFF',
    fontSize: 10,
  },
};

export default BottomTabNavigator;