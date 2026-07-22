import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  TextInput as PaperInput,
  Button,
  ActivityIndicator,
  Surface,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';

const RegisterScreen = ({ navigation }: any) => {
  const { darkMode } = useTheme();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtons, setAlertButtons] = useState<any[]>([]);

  const showAlert = (title: string, message: string, buttons?: any[]) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertButtons(buttons || [{ text: 'OK' }]);
    setAlertVisible(true);
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      showAlert('Error', 'Please enter your full name');
      return false;
    }
    if (!email.trim()) {
      showAlert('Error', 'Please enter your email address');
      return false;
    }
    if (!username.trim()) {
      showAlert('Error', 'Please choose a username');
      return false;
    }
    if (!password.trim()) {
      showAlert('Error', 'Please enter a password');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert('Invalid Email Format', 'Please enter a valid email address (e.g., name@example.com)');
      return false;
    }

    if (password.length < 6) {
      showAlert('Password Too Short', 'Password must be at least 6 characters long.');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        username: username.trim(),
        password,
      });

      const { token, userId, fullName: userName } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('userId', userId);
      await AsyncStorage.setItem('userName', userName);

      showAlert(
        'Registration Successful',
        'Your account has been created. Welcome to NewsCred!',
        [
          {
            text: 'Go to Dashboard',
            onPress: () => navigation.replace('MainTabs'),
          },
        ]
      );
    } catch (error: any) {
      console.log('Registration error:', error);
      
      let errorMessage = 'Please check your information and try again.';
      let errorMessages: string[] = [];
      
      if (error.response) {
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          }
          
          if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
            errorMessages = error.response.data.errors.map((e: any) => e.defaultMessage);
          }
        }
      }
      
      if (errorMessage && errorMessage.includes('Email already registered')) {
        showAlert(
          'Email Already Registered',
          'This email address is already registered.\n\nWould you like to login instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Login', onPress: () => navigation.navigate('Login') },
          ]
        );
      } else if (errorMessage && errorMessage.includes('Username') && errorMessage.includes('already')) {
        showAlert(
          'Username Taken',
          'This username is already taken. Please choose a different one.'
        );
      } else if (error.message && error.message.includes('Network Error')) {
        showAlert(
          'Connection Error',
          'Cannot connect to the server. Please make sure the backend is running.'
        );
      } else {
        showAlert(
          'Registration Failed',
          errorMessage || 'Please check your information and try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, darkMode && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerContainer}>
          <Surface style={[styles.surface, darkMode && styles.surfaceDark]} elevation={4}>
            <View style={styles.headerContainer}>
              <Text style={[styles.logoText, darkMode && styles.textDark]}>Create Account</Text>
              <Text style={[styles.subtitle, darkMode && styles.textMuted]}>
                Join NewsCred today
              </Text>
            </View>

            <PaperInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              mode="outlined"
              left={<PaperInput.Icon icon="account" />}
              style={[styles.input, darkMode && styles.inputDark]}
              textColor={darkMode ? '#FFFFFF' : '#1A2332'}
              activeOutlineColor="#6200EE"
            />

            <PaperInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              autoCapitalize="none"
              keyboardType="email-address"
              left={<PaperInput.Icon icon="email" />}
              style={[styles.input, darkMode && styles.inputDark]}
              textColor={darkMode ? '#FFFFFF' : '#1A2332'}
              activeOutlineColor="#6200EE"
            />

            <PaperInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              autoCapitalize="none"
              left={<PaperInput.Icon icon="account-circle" />}
              style={[styles.input, darkMode && styles.inputDark]}
              textColor={darkMode ? '#FFFFFF' : '#1A2332'}
              activeOutlineColor="#6200EE"
            />

            <PaperInput
              label="Password (min 6 characters)"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={secureTextEntry}
              left={<PaperInput.Icon icon="lock" />}
              right={
                <PaperInput.Icon
                  icon={secureTextEntry ? 'eye' : 'eye-off'}
                  onPress={() => setSecureTextEntry(!secureTextEntry)}
                />
              }
              style={[styles.input, darkMode && styles.inputDark]}
              textColor={darkMode ? '#FFFFFF' : '#1A2332'}
              activeOutlineColor="#6200EE"
            />

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.registerButton}
              labelStyle={styles.registerButtonLabel}
              buttonColor="#6200EE"
            >
              Register
            </Button>

            <Button
              mode="text"
              onPress={() => navigation.navigate('Login')}
              style={styles.loginButton}
              labelStyle={[styles.loginButtonLabel, darkMode && styles.textMuted]}
            >
              Already have an account? Login
            </Button>
          </Surface>
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onClose={() => setAlertVisible(false)}
      />
    </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  innerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  surface: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  surfaceDark: {
    backgroundColor: '#16213E',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A2332',
    marginBottom: 4,
  },
  textDark: {
    color: '#FFFFFF',
  },
  textMuted: {
    color: '#7F8C8D',
  },
  subtitle: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  input: {
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  inputDark: {
    backgroundColor: 'transparent',
  },
  registerButton: {
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  registerButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  loginButton: {
    marginTop: 8,
  },
  loginButtonLabel: {
    fontSize: 14,
    color: '#6200EE',
  },
});

export default RegisterScreen;