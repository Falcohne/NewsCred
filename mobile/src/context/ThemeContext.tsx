import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme } from 'react-native-paper';

interface ThemeColors {
  background: string;
  backgroundSecondary: string;
  text: string;
  textSecondary: string;
  border: string;
  card: string;
  cardDark: string;
  header: string;
  headerDark: string;
  input: string;
  inputDark: string;
  shadow: string;
  primary: string;
  accent: string;
}

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
  colors: ThemeColors;
  paperTheme: any;
}

const lightColors: ThemeColors = {
  background: '#F5F7FA',
  backgroundSecondary: '#FFFFFF',
  text: '#1A2332',
  textSecondary: '#7F8C8D',
  border: '#E8ECF1',
  card: '#FFFFFF',
  cardDark: '#F8F9FA',
  header: '#FFFFFF',
  headerDark: '#16213E',
  input: '#FFFFFF',
  inputDark: '#1A1A2E',
  shadow: '#000000',
  primary: '#6200EE',
  accent: '#7C4DFF',
};

const darkColors: ThemeColors = {
  background: '#0A0A1A',
  backgroundSecondary: '#1A1A2E',
  text: '#FFFFFF',
  textSecondary: '#A0AEC0',
  border: '#333333',
  card: '#16213E',
  cardDark: '#1A1A2E',
  header: '#0D1117',
  headerDark: '#0A0A1A',
  input: '#1A1A2E',
  inputDark: '#0A0A1A',
  shadow: '#000000',
  primary: '#BB86FC',
  accent: '#7C4DFF',
};

const lightPaperTheme = {
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

const darkPaperTheme = {
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

const ThemeContext = createContext<ThemeContextType>({
  darkMode: false,
  toggleDarkMode: () => {},
  setDarkMode: () => {},
  colors: lightColors,
  paperTheme: lightPaperTheme,
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  return context;
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [colors, setColors] = useState<ThemeColors>(lightColors);
  const [paperTheme, setPaperTheme] = useState(lightPaperTheme);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const dark = await AsyncStorage.getItem('darkMode');
      const isDark = dark === 'true';
      setDarkMode(isDark);
      setColors(isDark ? darkColors : lightColors);
      setPaperTheme(isDark ? darkPaperTheme : lightPaperTheme);
    } catch (error) {
      console.log('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    setColors(newValue ? darkColors : lightColors);
    setPaperTheme(newValue ? darkPaperTheme : lightPaperTheme);
    AsyncStorage.setItem('darkMode', String(newValue));
  };

  const setDarkModeValue = (value: boolean) => {
    setDarkMode(value);
    setColors(value ? darkColors : lightColors);
    setPaperTheme(value ? darkPaperTheme : lightPaperTheme);
    AsyncStorage.setItem('darkMode', String(value));
  };

  // Return loading state if still loading
  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        darkMode,
        toggleDarkMode,
        setDarkMode: setDarkModeValue,
        colors,
        paperTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;