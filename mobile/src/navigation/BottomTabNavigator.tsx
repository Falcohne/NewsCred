import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Badge } from 'react-native-paper';

import DashboardScreen from '../screens/DashboardScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import SavedArticlesScreen from '../screens/SavedArticlesScreen';
import SourceDatabaseScreen from '../screens/SourceDatabaseScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

/**
 * Bottom tab navigator with five main sections
 * Uses Expo Vector Icons for clean, professional icons
 * Integrated with Paper theme for consistent styling
 */
const BottomTabNavigator = () => {
  const { darkMode, colors } = useTheme();

  const themeColors = {
    background: darkMode ? '#0A0A1A' : '#F5F7FA',
    card: darkMode ? '#16213E' : '#FFFFFF',
    tint: '#6200EE',
    inactiveTint: darkMode ? '#666666' : '#999999',
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: themeColors.card,
          borderTopColor: darkMode ? '#333333' : '#EEEEEE',
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
            case 'Sources':
              iconName = focused ? 'book' : 'book-outline';
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
        name="Sources" 
        component={SourceDatabaseScreen} 
        options={{ 
          tabBarLabel: 'Sources',
          tabBarAccessibilityLabel: 'Sources',
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