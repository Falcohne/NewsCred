import React from 'react';
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
      <StatusBar 
        style={darkMode ? 'light' : 'dark'} 
        backgroundColor={darkMode ? '#0A0A1A' : '#F5F7FA'}
        translucent={false}
      />
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
export default function App() {
  return (
    <ThemeProvider>
      <AppWrapper />
    </ThemeProvider>
  );
}