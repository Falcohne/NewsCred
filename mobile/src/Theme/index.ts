import { DefaultTheme } from 'react-native-paper';

// Light theme for React Native Paper
export const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200EE',
    accent: '#7C4DFF',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    text: '#1A2332',
    disabled: '#9E9E9E',
    placeholder: '#9E9E9E',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#F44336',
  },
};

// Dark theme for React Native Paper
export const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#BB86FC',
    accent: '#7C4DFF',
    background: '#0A0A1A',
    surface: '#16213E',
    text: '#FFFFFF',
    disabled: '#666666',
    placeholder: '#666666',
    backdrop: 'rgba(0, 0, 0, 0.7)',
    notification: '#EF5350',
  },
};