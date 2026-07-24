import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { IconButton } from 'react-native-paper';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AnalysisDetailScreen from '../screens/AnalysisDetailScreen';
import ArticleWebViewScreen from '../screens/ArticleWebViewScreen';
import PaymentScreen from '../screens/PaymentScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import SourceDatabaseScreen from '../screens/SourceDatabaseScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HowWeScoreScreen from '../screens/HowWeScoreScreen'; // 👈 ADD THIS IMPORT
import BottomTabNavigator from './BottomTabNavigator';

const Stack = createStackNavigator();

/**
 * Main application navigator that handles authentication flow and main app screens
 */
const AppNavigator = () => {
  const { darkMode, colors } = useTheme();

  const headerStyle = {
    backgroundColor: colors.paper,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  };

  const headerTitleStyle = {
    fontWeight: '600' as const,
    color: colors.ink,
    fontSize: 18,
  };

  const headerTintColor = colors.teal;

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Authentication Screens */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{
            animationTypeForReplace: 'pop',
          }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
        />
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
        />
        <Stack.Screen
          name="SourceDatabase"
          component={SourceDatabaseScreen}
          options={{
            headerShown: true,
            headerTitle: 'Your sources',
            headerStyle: headerStyle,
            headerTitleStyle: headerTitleStyle,
            headerTintColor: headerTintColor,
          }}
        />
        
        {/* Main Application */}
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="HowWeScore"
          component={HowWeScoreScreen}
          options={{
            headerShown: true,
            headerTitle: 'How we score',
            headerStyle: headerStyle,
            headerTitleStyle: headerTitleStyle,
            headerTintColor: headerTintColor,
          }}
        />
        <Stack.Screen 
          name="MainTabs" 
          component={BottomTabNavigator} 
          options={{
            gestureEnabled: false,
          }}
        />
        
        {/* Analysis Detail */}
        <Stack.Screen
          name="AnalysisDetail"
          component={AnalysisDetailScreen}
          options={({ navigation }) => ({
            headerShown: true,
            headerTitle: 'Credibility report',
            headerBackTitle: 'Back',
            headerStyle: headerStyle,
            headerTitleStyle: headerTitleStyle,
            headerTintColor: headerTintColor,
            headerLeft: () => (
              <IconButton
                icon="arrow-left"
                size={24}
                onPress={() => navigation.goBack()}
                iconColor={headerTintColor}
                style={{ marginLeft: 4 }}
              />
            ),
            headerRight: () => null,
          })}
        />

        {/* Article WebView */}
        <Stack.Screen
          name="ArticleWebView"
          component={ArticleWebViewScreen}
          options={{
            headerShown: false,
          }}
        />

        {/* 👇 ADD THIS: Payment Screen */}
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={({ navigation }) => ({
            headerShown: true,
            headerTitle: 'Upgrade to Premium',
            headerBackTitle: 'Back',
            headerStyle: {
              backgroundColor: darkMode ? '#1A2332' : '#4CAF50',
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTitleStyle: {
              fontWeight: '600' as const,
              color: '#FFFFFF',
              fontSize: 18,
            },
            headerTintColor: '#FFFFFF',
            headerLeft: () => (
              <IconButton
                icon="arrow-left"
                size={24}
                onPress={() => navigation.goBack()}
                iconColor="#FFFFFF"
                style={{ marginLeft: 4 }}
              />
            ),
            headerRight: () => null,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;