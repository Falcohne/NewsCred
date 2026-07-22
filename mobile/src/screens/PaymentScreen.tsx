import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  Card,
  Title,
  Paragraph,
  TextInput,
  Button,
  Surface,
  IconButton,
  Snackbar,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PaymentScreen = ({ navigation }: any) => {
  const { darkMode } = useTheme();
  
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [processing, setProcessing] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    if (chunks) {
      return chunks.join(' ');
    }
    return cleaned;
  };

  const handlePayment = async () => {
    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length < 16) {
      showSnackbar('Please enter a valid card number (16 digits)');
      return;
    }
    
    if (expiryDate.length < 5) {
      showSnackbar('Please enter a valid expiry date (MM/YY)');
      return;
    }
    
    if (cvv.length < 3) {
      showSnackbar('Please enter a valid CVV (3 digits)');
      return;
    }
    
    if (cardHolder.length < 3) {
      showSnackbar('Please enter the card holder name');
      return;
    }

    setProcessing(true);

    setTimeout(async () => {
      await AsyncStorage.setItem('isPremium', 'true');
      
      setProcessing(false);
      showSnackbar('Payment successful! Welcome to Premium!');
      
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    }, 2500);
  };

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
          <Text style={[styles.headerTitle, darkMode && styles.textDark]}>Premium Upgrade</Text>
          <View style={{ width: 48 }} />
        </View>
      </Surface>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Card style={[styles.planCard, darkMode && styles.cardDark]} mode="elevated">
            <Card.Content>
              <View style={styles.planHeader}>
                <Text style={[styles.planTitle, darkMode && styles.textDark]}>Premium Plan</Text>
                <Text style={[styles.planPrice, darkMode && styles.textDark]}>GH₵ 60.00</Text>
              </View>
              <Text style={[styles.planPeriod, darkMode && styles.textMuted]}>per month</Text>
              <View style={styles.planFeatures}>
                <Text style={[styles.featureText, darkMode && styles.textMuted]}>Unlimited article analyses</Text>
                <Text style={[styles.featureText, darkMode && styles.textMuted]}>Detailed credibility reports</Text>
                <Text style={[styles.featureText, darkMode && styles.textMuted]}>Advanced source verification</Text>
                <Text style={[styles.featureText, darkMode && styles.textMuted]}>Priority support</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.paymentCard, darkMode && styles.cardDark]} mode="elevated">
            <Card.Content>
              <Title style={[styles.paymentTitle, darkMode && styles.textDark]}>Payment Details</Title>
              <Paragraph style={[styles.sandboxNote, darkMode && styles.textMuted]}>
                Sandbox Mode: Use test card 4242 4242 4242 4242
              </Paragraph>

              <TextInput
                label="Card Number"
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                mode="outlined"
                keyboardType="numeric"
                maxLength={19}
                style={[styles.input, darkMode && styles.inputDark]}
                textColor={darkMode ? '#FFFFFF' : '#1A2332'}
                activeOutlineColor="#6200EE"
                placeholder="4242 4242 4242 4242"
              />

              <View style={styles.row}>
                <TextInput
                  label="Expiry Date"
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  mode="outlined"
                  placeholder="MM/YY"
                  maxLength={5}
                  style={[styles.input, styles.halfInput, darkMode && styles.inputDark]}
                  textColor={darkMode ? '#FFFFFF' : '#1A2332'}
                  activeOutlineColor="#6200EE"
                />
                <TextInput
                  label="CVV"
                  value={cvv}
                  onChangeText={setCvv}
                  mode="outlined"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                  style={[styles.input, styles.halfInput, darkMode && styles.inputDark]}
                  textColor={darkMode ? '#FFFFFF' : '#1A2332'}
                  activeOutlineColor="#6200EE"
                  placeholder="123"
                />
              </View>

              <TextInput
                label="Card Holder Name"
                value={cardHolder}
                onChangeText={setCardHolder}
                mode="outlined"
                style={[styles.input, darkMode && styles.inputDark]}
                textColor={darkMode ? '#FFFFFF' : '#1A2332'}
                activeOutlineColor="#6200EE"
                placeholder="John Doe"
              />

              <Button
                mode="contained"
                onPress={handlePayment}
                loading={processing}
                disabled={processing}
                style={styles.payButton}
                labelStyle={styles.payButtonLabel}
                buttonColor="#6200EE"
              >
                {processing ? 'Processing...' : 'Pay GH₵ 60.00'}
              </Button>

              <Text style={[styles.sandboxInfo, darkMode && styles.textMuted]}>
                This is a sandbox payment. No real money will be charged.
              </Text>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={styles.snackbar}
      >
        <Text style={styles.snackbarText}>{snackbarMessage}</Text>
      </Snackbar>
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A2332',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textMuted: {
    color: '#7F8C8D',
  },
  cardDark: {
    backgroundColor: '#16213E',
  },
  inputDark: {
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  planCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A2332',
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  planPeriod: {
    fontSize: 14,
    color: '#7F8C8D',
    marginBottom: 12,
  },
  planFeatures: {
    marginTop: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 6,
  },
  paymentCard: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  paymentTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A2332',
    marginBottom: 4,
  },
  sandboxNote: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  payButton: {
    borderRadius: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  payButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  sandboxInfo: {
    fontSize: 12,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 12,
  },
  snackbar: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    marginBottom: 16,
  },
  snackbarText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default PaymentScreen;