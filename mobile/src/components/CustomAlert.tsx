import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel';
  }>;
  onClose: () => void;
}

/**
 * Custom alert component with dark mode support
 * Replaces the default React Native Alert
 */
const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons,
  onClose,
}) => {
  const { darkMode } = useTheme();

  const handleButtonPress = (onPress?: () => void) => {
    onClose();
    if (onPress) {
      setTimeout(onPress, 300);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={[
          styles.alertContainer,
          darkMode && styles.alertContainerDark
        ]}>
          <Text style={[
            styles.title,
            darkMode && styles.titleDark
          ]}>
            {title}
          </Text>
          <Text style={[
            styles.message,
            darkMode && styles.messageDark
          ]}>
            {message}
          </Text>
          <View style={styles.buttonContainer}>
            {buttons && buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.buttonWrapper,
                  button.style === 'cancel' && styles.cancelButtonWrapper,
                ]}
                onPress={() => handleButtonPress(button.onPress)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.button,
                  button.style === 'cancel' && styles.cancelButton,
                  darkMode && styles.buttonDark,
                  button.style === 'cancel' && darkMode && styles.cancelButtonDark,
                ]}>
                  <Text
                    style={[
                      styles.buttonText,
                      button.style === 'cancel' && styles.cancelButtonText,
                      darkMode && styles.buttonTextDark,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  >
                    {button.text}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
            {!buttons && (
              <TouchableOpacity
                style={styles.buttonWrapper}
                onPress={() => handleButtonPress()}
                activeOpacity={0.7}
              >
                <View style={[styles.button, darkMode && styles.buttonDark]}>
                  <Text style={[styles.buttonText, darkMode && styles.buttonTextDark]}>OK</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: width * 0.85,
    maxWidth: 340,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  alertContainerDark: {
    backgroundColor: '#16213E',
    shadowColor: '#000000',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A2332',
    marginBottom: 8,
    textAlign: 'center',
  },
  titleDark: {
    color: '#FFFFFF',
  },
  message: {
    fontSize: 15,
    color: '#4A5568',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 4,
  },
  messageDark: {
    color: '#A0AEC0',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  buttonWrapper: {
    flex: 1,
    minWidth: 80,
    maxWidth: 140,
  },
  cancelButtonWrapper: {
    flex: 1,
    minWidth: 80,
    maxWidth: 140,
  },
  button: {
    backgroundColor: '#6200EE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    width: '100%',
  },
  buttonDark: {
    backgroundColor: '#7C4DFF',
  },
  cancelButton: {
    backgroundColor: '#EF5350',
  },
  cancelButtonDark: {
    backgroundColor: '#D32F2F',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextDark: {
    color: '#FFFFFF',
  },
  cancelButtonText: {
    color: '#FFFFFF',
  },
});

export default CustomAlert;