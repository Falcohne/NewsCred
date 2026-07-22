import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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

const LoginScreen = ({ navigation }: any) => {
  const { darkMode } = useTheme();

  const [email, setEmail] = useState('');
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

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, userId, fullName } = response.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('userId', userId);
      await AsyncStorage.setItem('userName', fullName);

      showAlert('Success', 'Logged in successfully!');
      setTimeout(() => {
        navigation.replace('MainTabs');
      }, 500);
    } catch (error: any) {
      console.log('Login error:', error);
      
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (error.response) {
        if (error.response.data) {
          if (typeof error.response.data === 'string') {
            errorMessage = error.response.data;
          } else if (error.response.data.message) {
            errorMessage = error.response.data.message;
          }
        }
        
        if (error.response.status === 401) {
          errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.response.status === 400) {
          if (errorMessage.includes('User not found')) {
            showAlert(
              'Account Not Found',
              'The email address you entered is not registered.\n\nWould you like to create an account?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Register', onPress: () => navigation.navigate('Register') },
              ]
            );
            setLoading(false);
            return;
          }
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to the server.\n\nPlease make sure the backend is running.';
      }
      
      showAlert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, darkMode && styles.containerDark]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.innerContainer}>
        <Surface style={[styles.surface, darkMode && styles.surfaceDark]} elevation={4}>
          <View style={styles.headerContainer}>
            <Text style={[styles.logoText, darkMode && styles.textDark]}>NewsCred</Text>
            <Text style={[styles.subtitle, darkMode && styles.textMuted]}>
              Intelligent News Credibility Assessment
            </Text>
          </View>

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
            label="Password"
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
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
            labelStyle={styles.loginButtonLabel}
            buttonColor="#6200EE"
          >
            Login
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Register')}
            style={styles.registerButton}
            labelStyle={[styles.registerButtonLabel, darkMode && styles.textMuted]}
          >
            Don't have an account? Register
          </Button>
        </Surface>
      </View>

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
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
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
    marginBottom: 32,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A2332',
    marginBottom: 8,
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
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  inputDark: {
    backgroundColor: 'transparent',
  },
  loginButton: {
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  registerButton: {
    marginTop: 12,
  },
  registerButtonLabel: {
    fontSize: 14,
    color: '#6200EE',
  },
});

export default LoginScreen;