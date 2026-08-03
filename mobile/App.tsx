import { registerRootComponent } from 'expo';
import React from 'react';
import './src/i18n';
import { Provider as PaperProvider } from 'react-native-paper';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AppNavigator from './src/navigation/AppNavigator';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * Main application wrapper component
 * Applies Paper theme and status bar based on dark/light mode
 */
const AppWrapper = () => {
  const { paperTheme, darkMode } = useTheme();
  
  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <PaperProvider theme={paperTheme}>
        <SafeAreaProvider>
          <AppNavigator />
        </SafeAreaProvider>
      </PaperProvider>
    </>
  );
};

/**
 * Main application entry point
 * Wraps the app with ThemeProvider for dark/light mode support
 */
const App = () => {
  return (
    <ThemeProvider>
      <AppWrapper />
    </ThemeProvider>
  );
};

export default registerRootComponent(App);