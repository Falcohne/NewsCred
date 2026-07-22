import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import {
  Surface,
  IconButton,
  Button,
  ActivityIndicator as PaperActivityIndicator,
} from 'react-native-paper';

interface ArticleWebViewScreenProps {
  route: any;
  navigation: any;
}

/**
 * Screen to display the full article content in an in-app WebView
 * Users can read the original article without leaving the app
 * Supports dark/light mode and includes navigation controls
 */
const ArticleWebViewScreen = ({ route, navigation }: ArticleWebViewScreenProps) => {
  const { darkMode } = useTheme();
  const { url, title } = route.params || {};
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);

  const handleLoadStart = () => {
    setLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = (errorEvent: any) => {
    setLoading(false);
    setError('Failed to load the article. Please try again.');
    console.log('WebView error:', errorEvent);
  };

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
  };

  const goBack = () => {
    if (webViewRef.current) {
      webViewRef.current.goBack();
    }
  };

  const goForward = () => {
    if (webViewRef.current) {
      webViewRef.current.goForward();
    }
  };

  const reload = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const openInBrowser = async () => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        setError('Cannot open this URL in browser.');
      }
    } catch (error) {
      console.log('Error opening in browser:', error);
      setError('Failed to open in browser.');
    }
  };

  const renderWebView = () => (
    <WebView
      ref={webViewRef}
      source={{ uri: url }}
      style={[styles.webView, darkMode && styles.webViewDark]}
      onLoadStart={handleLoadStart}
      onLoadEnd={handleLoadEnd}
      onError={handleError}
      onNavigationStateChange={handleNavigationStateChange}
      startInLoadingState={true}
      renderLoading={() => (
        <View style={[styles.loadingContainer, darkMode && styles.loadingContainerDark]}>
          <PaperActivityIndicator size="large" color="#6200EE" />
          <Text style={[styles.loadingText, darkMode && styles.textDark]}>
            Loading article...
          </Text>
        </View>
      )}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowsInlineMediaPlayback={true}
      scalesPageToFit={true}
      contentInsetAdjustmentBehavior="automatic"
      pullToRefreshEnabled={true}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={true}
      injectedJavaScript={`
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
          document.body.style.backgroundColor = '#0A0A1A';
          document.body.style.color = '#FFFFFF';
        }
        true;
      `}
    />
  );

  const renderError = () => (
    <View style={[styles.errorContainer, darkMode && styles.errorContainerDark]}>
      <IconButton
        icon="alert-circle"
        size={60}
        iconColor={darkMode ? '#EF5350' : '#D32F2F'}
      />
      <Text style={[styles.errorTitle, darkMode && styles.textDark]}>
        Unable to Load Article
      </Text>
      <Text style={[styles.errorMessage, darkMode && styles.textMuted]}>
        {error || 'The article could not be loaded. Please try again.'}
      </Text>
      <View style={styles.errorButtons}>
        <Button
          mode="contained"
          onPress={reload}
          style={styles.errorButton}
          buttonColor="#6200EE"
          labelStyle={styles.errorButtonLabel}
        >
          Try Again
        </Button>
        <Button
          mode="outlined"
          onPress={openInBrowser}
          style={[styles.errorButton, styles.errorButtonOutline]}
          labelStyle={[styles.errorButtonOutlineLabel, darkMode && styles.textDark]}
        >
          Open in Browser
        </Button>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      <View style={styles.statusBarSpacer} />
      <Surface style={[styles.header, darkMode && styles.headerDark]} elevation={2}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            iconColor={darkMode ? '#FFFFFF' : '#1A2332'}
          />
          <Text style={[styles.headerTitle, darkMode && styles.textDark]} numberOfLines={1}>
            {title || 'Article'}
          </Text>
          <View style={styles.headerRight}>
            <IconButton
              icon="reload"
              size={24}
              onPress={reload}
              iconColor={darkMode ? '#FFFFFF' : '#1A2332'}
            />
            <IconButton
              icon="open-in-new"
              size={24}
              onPress={openInBrowser}
              iconColor={darkMode ? '#FFFFFF' : '#1A2332'}
            />
          </View>
        </View>
        <View style={[styles.navBar, darkMode && styles.navBarDark]}>
          <IconButton
            icon="chevron-left"
            size={20}
            onPress={goBack}
            disabled={!canGoBack}
            iconColor={canGoBack ? (darkMode ? '#FFFFFF' : '#1A2332') : '#666666'}
          />
          <IconButton
            icon="chevron-right"
            size={20}
            onPress={goForward}
            disabled={!canGoForward}
            iconColor={canGoForward ? (darkMode ? '#FFFFFF' : '#1A2332') : '#666666'}
          />
          <Text style={[styles.navText, darkMode && styles.textMuted]}>
            {loading ? 'Loading...' : 'Ready'}
          </Text>
        </View>
      </Surface>

      {error ? renderError() : renderWebView()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  containerDark: {
    backgroundColor: '#0A0A1A',
  },
  statusBarSpacer: {
    height: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: 'transparent',
  },
  header: {
    backgroundColor: '#FFFFFF',
  },
  headerDark: {
    backgroundColor: '#16213E',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A2332',
    marginHorizontal: 8,
  },
  textDark: {
    color: '#FFFFFF',
  },
  textMuted: {
    color: '#7F8C8D',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  navBarDark: {
    borderTopColor: '#333333',
  },
  navText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginLeft: 8,
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  webViewDark: {
    backgroundColor: '#1A2332',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingContainerDark: {
    backgroundColor: '#1A2332',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#7F8C8D',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  errorContainerDark: {
    backgroundColor: '#16213E',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A2332',
    marginTop: 12,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  errorButton: {
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  errorButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorButtonOutline: {
    borderColor: '#6200EE',
  },
  errorButtonOutlineLabel: {
    color: '#6200EE',
  },
});

export default ArticleWebViewScreen;