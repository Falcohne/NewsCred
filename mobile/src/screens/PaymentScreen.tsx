import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Surface,
  IconButton,
  Snackbar,
  List,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

interface Plan {
  name: string;
  amountDisplay: string;
  features: string[];
}

/**
 * Premium upgrade via Paystack.
 *
 * We NEVER collect card or Mobile Money details in the app.
 * Payment happens on Paystack's secure checkout page (WebView),
 * and premium is granted only after the backend verifies the
 * transaction directly with Paystack.
 */
const PaymentScreen = ({ navigation }: any) => {
  const { darkMode } = useTheme();
  const { t } = useTranslation();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [starting, setStarting] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  useEffect(() => {
    api
      .get('/payments/plan')
      .then((res) => setPlan(res.data))
      .catch(() => setSnackbar(t('payment.planLoadFailed')))
      .finally(() => setLoadingPlan(false));
  }, []);

  const startPayment = async () => {
    setStarting(true);
    try {
      const res = await api.post('/payments/initialize');
      setReference(res.data.reference);
      setCheckoutUrl(res.data.authorizationUrl);
    } catch (error: any) {
      const msg =
        error.response?.data?.message || t('payment.startFailed');
      setSnackbar(msg);
    } finally {
      setStarting(false);
    }
  };

  const verifyPayment = async (ref: string) => {
    setCheckoutUrl(null);
    setVerifying(true);
    try {
      const res = await api.get(`/payments/verify/${ref}`);
      if (res.data.premium) {
        await AsyncStorage.setItem('isPremium', 'true');
        setSnackbar(t('payment.successMessage'));
        setTimeout(() => navigation.goBack(), 1600);
      } else {
        setSnackbar(t('payment.notConfirmed'));
      }
    } catch {
      setSnackbar(t('payment.notCompleted'));
    } finally {
      setVerifying(false);
    }
  };

  // Paystack redirects to a callback URL when checkout finishes.
  const handleNavChange = (navState: any) => {
    const url: string = navState.url || '';
    if (
      reference &&
      (url.includes('callback') ||
        url.includes('trxref=') ||
        url.includes('reference='))
    ) {
      verifyPayment(reference);
    }
  };

  // --- Checkout mode: show Paystack's page ---
  if (checkoutUrl) {
    return (
      <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
        <View style={styles.checkoutHeader}>
          <IconButton icon="close" onPress={() => setCheckoutUrl(null)} />
          <Text style={[styles.checkoutTitle, darkMode && styles.textDark]}>
            {t('payment.checkoutTitle')}
          </Text>
        </View>
        <WebView
          source={{ uri: checkoutUrl }}
          onNavigationStateChange={handleNavChange}
          startInLoadingState
          renderLoading={() => (
            <ActivityIndicator style={StyleSheet.absoluteFill} size="large" />
          )}
        />
        <Button mode="text" onPress={() => reference && verifyPayment(reference)}>
          {t('payment.completedVerifyButton')}
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Surface style={[styles.hero, darkMode && styles.heroDark]}>
          <IconButton icon="crown" size={44} iconColor="#BA7517" />
          <Title style={[styles.heroTitle, darkMode && styles.textDark]}>
            {t('payment.heroTitle')}
          </Title>
          {loadingPlan ? (
            <ActivityIndicator />
          ) : (
            <Text style={styles.price}>{plan?.amountDisplay ?? ''} {t('payment.priceSuffix')}</Text>
          )}
        </Surface>

        <Card style={[styles.card, darkMode && styles.cardDark]}>
          <Card.Content>
            <Title style={darkMode ? styles.textDark : undefined}>
              {t('payment.whatYouGet')}
            </Title>
            {(plan?.features ?? []).map((f, i) => (
              <List.Item
                key={i}
                title={f}
                titleNumberOfLines={2}
                titleStyle={darkMode ? styles.textDark : undefined}
                left={(props) => (
                  <List.Icon {...props} icon="check-circle" color="#4CAF50" />
                )}
              />
            ))}
          </Card.Content>
        </Card>

        <Paragraph style={[styles.secureNote, darkMode && styles.textMutedDark]}>
          {t('payment.secureNote')}
        </Paragraph>

        <Button
          mode="contained"
          onPress={startPayment}
          loading={starting || verifying}
          disabled={starting || verifying || loadingPlan}
          style={styles.payButton}
          contentStyle={{ paddingVertical: 8 }}
        >
          {verifying ? t('payment.verifyingPayment') : t('payment.upgradeButton')}
        </Button>
      </ScrollView>

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3500}
      >
        {snackbar}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F0' },
  containerDark: { backgroundColor: '#10141C' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E0D4',
  },
  heroDark: { backgroundColor: '#1A2029', borderColor: '#2A313C' },
  heroTitle: { fontSize: 24, fontWeight: '700' },
  price: { fontSize: 20, fontWeight: '700', color: '#0F6E56', marginTop: 4 },
  card: { borderRadius: 20, marginBottom: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E0D4' },
  cardDark: { backgroundColor: '#1A2029', borderColor: '#2A313C' },
  secureNote: { textAlign: 'center', fontSize: 12, marginBottom: 16, color: '#666' },
  textMutedDark: { color: '#AAA' },
  textDark: { color: '#FFFFFF' },
  payButton: { borderRadius: 30 },
  checkoutHeader: { flexDirection: 'row', alignItems: 'center' },
  checkoutTitle: { fontSize: 16, fontWeight: '600' },
});

export default PaymentScreen;
