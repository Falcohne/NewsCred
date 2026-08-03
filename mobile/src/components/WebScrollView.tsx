import React from 'react';
import { View, Platform, ViewStyle } from 'react-native';

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

// This is a web-only <div> style bag (CSS properties like 100vh/overflowY
// have no RN ViewStyle equivalent), so it's typed as `any` rather than run
// through RN's StyleSheet.create, which only accepts ViewStyle/TextStyle/ImageStyle.
const styles: { webScroll: any } = {
  webScroll: {
    height: '100vh',
    overflowY: 'auto',
    overflowX: 'hidden',
    backgroundColor: '#f5f5f5',
  },
};

export default WebScrollView;