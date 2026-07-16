import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../context/ThemeContext';
import { IconButton } from 'react-native-paper';

import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import AnalysisDetailScreen from '../screens/AnalysisDetailScreen';
import ArticleWebViewScreen from '../screens/ArticleWebViewScreen';
import BottomTabNavigator from './BottomTabNavigator';

const Stack = createStackNavigator();

/**
 * Main application navigator that handles authentication flow and main app screens
 */
const AppNavigator = () => {
  const { darkMode, colors } = useTheme();

  const headerStyle = {
    backgroundColor: darkMode ? '#16213E' : '#FFFFFF',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: darkMode ? '#333333' : '#EEEEEE',
  };

  const headerTitleStyle = {
    fontWeight: '600' as const,
    color: darkMode ? '#FFFFFF' : '#1A2332',
    fontSize: 18,
  };

  const headerTintColor = darkMode ? '#BB86FC' : '#6200EE';

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
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
        
        {/* Main Application */}
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
            headerTitle: 'Analysis Report',
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
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;