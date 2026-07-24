import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DefaultTheme, MD3DarkTheme } from 'react-native-paper';

/**
 * NewsCred design system — "an editorial trust layer for everyday reading".
 * Editorial paper surfaces, ink text, ONE teal accent.
 * Verdict colors (green→amber→red) are the only loud colors.
 */

export interface ThemeColors {
  // New design tokens
  paper: string;        // page background
  card: string;         // raised surface
  line: string;         // hairline borders
  ink: string;          // primary text
  inkMuted: string;     // secondary text
  hint: string;         // placeholders
  teal: string;         // the one accent
  tealSoft: string;     // accent tint background
  onTeal: string;       // text on teal
  // Verdict scale
  good: string; goodBg: string;
  fair: string; fairBg: string;
  warn: string; warnBg: string;
  bad: string;  badBg: string;
  // Legacy keys (older screens still reference these)
  background: string;
  backgroundSecondary: string;
  text: string;
  textSecondary: string;
  border: string;
  cardDark: string;
  header: string;
  headerDark: string;
  input: string;
  inputDark: string;
  shadow: string;
  primary: string;
  accent: string;
}

const lightColors: ThemeColors = {
  paper: '#FAF7F0',
  card: '#FFFFFF',
  line: '#E5E0D4',
  ink: '#1A1A16',
  inkMuted: '#6B6858',
  hint: '#A19D8E',
  teal: '#0F6E56',
  tealSoft: '#E1F5EE',
  onTeal: '#FFFFFF',
  good: '#3B6D11', goodBg: '#EAF3DE',
  fair: '#639922', fairBg: '#EAF3DE',
  warn: '#BA7517', warnBg: '#FAEEDA',
  bad: '#A32D2D',  badBg: '#FCEBEB',
  background: '#FAF7F0',
  backgroundSecondary: '#FFFFFF',
  text: '#1A1A16',
  textSecondary: '#6B6858',
  border: '#E5E0D4',
  cardDark: '#F4F0E7',
  header: '#FAF7F0',
  headerDark: '#10141C',
  input: '#FFFFFF',
  inputDark: '#1A2029',
  shadow: '#000000',
  primary: '#0F6E56',
  accent: '#0F6E56',
};

const darkColors: ThemeColors = {
  paper: '#10141C',
  card: '#1A2029',
  line: '#2A313C',
  ink: '#F2EFE7',
  inkMuted: '#9AA0A8',
  hint: '#6C737C',
  teal: '#4CC39A',
  tealSoft: '#14332A',
  onTeal: '#04342C',
  good: '#97C459', goodBg: '#22380F',
  fair: '#97C459', fairBg: '#22380F',
  warn: '#EF9F27', warnBg: '#3A2A0A',
  bad: '#F09595',  badBg: '#3A1414',
  background: '#10141C',
  backgroundSecondary: '#1A2029',
  text: '#F2EFE7',
  textSecondary: '#9AA0A8',
  border: '#2A313C',
  cardDark: '#151A22',
  header: '#10141C',
  headerDark: '#10141C',
  input: '#1A2029',
  inputDark: '#10141C',
  shadow: '#000000',
  primary: '#4CC39A',
  accent: '#4CC39A',
};

/** Serif display face for headings — the editorial voice. */
export const displayFont = { fontFamily: 'serif' as const };

/** Map a 0–100 score to verdict colors. */
export const scoreColors = (score: number, c: ThemeColors) => {
  if (score >= 65) return { fg: c.good, bg: c.goodBg };
  if (score >= 45) return { fg: c.warn, bg: c.warnBg };
  return { fg: c.bad, bg: c.badBg };
};

export const verdictLabel = (verdict?: string) => {
  switch (verdict) {
    case 'CREDIBLE': return 'Credible';
    case 'LIKELY_CREDIBLE': return 'Likely credible';
    case 'UNSURE': return 'Unclear';
    case 'MISLEADING': return 'Misleading';
    case 'NOT_CREDIBLE': return 'Not credible';
    default: return 'Unrated';
  }
};

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
  colors: ThemeColors;
  paperTheme: any;
}

const buildPaperTheme = (dark: boolean, c: ThemeColors) => ({
  ...(dark ? MD3DarkTheme : DefaultTheme),
  colors: {
    ...(dark ? MD3DarkTheme.colors : DefaultTheme.colors),
    primary: c.teal,
    accent: c.teal,
    background: c.paper,
    surface: c.card,
    text: c.ink,
    placeholder: c.hint,
    backdrop: 'rgba(0,0,0,0.5)',
    notification: c.bad,
  },
});

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [darkMode, setDarkModeState] = useState(false); // light "paper" is the default

  useEffect(() => {
    AsyncStorage.getItem('darkMode').then((v) => {
      if (v !== null) setDarkModeState(v === 'true');
    });
  }, []);

  const setDarkMode = (value: boolean) => {
    setDarkModeState(value);
    AsyncStorage.setItem('darkMode', String(value)).catch(() => {});
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);
  const colors = darkMode ? darkColors : lightColors;

  return (
    <ThemeContext.Provider
      value={{ darkMode, toggleDarkMode, setDarkMode, colors, paperTheme: buildPaperTheme(darkMode, colors) }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
