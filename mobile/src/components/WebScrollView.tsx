import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';

interface WebScrollViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Platform-specific scroll view component
 * Uses native scroll behavior on mobile and div scrolling on web
 */
const WebScrollView = ({ children, style }: WebScrollViewProps) => {
  if (Platform.OS === 'web') {
    return (
      <div style={styles.webScroll as any}>
        {children}
      </div>
    );
  }
  return <View style={style}>{children}</View>;
};

const styles = StyleSheet.create({
  webScroll: {
    height: '100vh',
    overflowY: 'auto' as any,
    overflowX: 'hidden' as any,
    backgroundColor: '#f5f5f5',
  },
});

export default WebScrollView;