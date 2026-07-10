import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  Card,
  Title,
  Paragraph,
  List,
  Switch,
  Button,
  TextInput,
  Avatar,
  Badge,
  Divider,
  Surface,
  Modal,
  Portal,
  ActivityIndicator,
  IconButton,
  Snackbar,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from '../components/CustomAlert';
import api from '../services/api';

const SettingsScreen = ({ navigation }: any) => {
  const { darkMode, toggleDarkMode, colors } = useTheme();
  
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarColor, setSnackbarColor] = useState('#4CAF50');

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertButtons, setAlertButtons] = useState<any[]>([]);

  // Ref for processing alert timeout
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showSnackbar = (message: string, isError: boolean = false) => {
    setSnackbarMessage(message);
    setSnackbarColor(isError ? '#EF5350' : '#4CAF50');
    setSnackbarVisible(true);
  };

  const showAlert = (title: string, message: string, buttons?: any[]) => {
    // Clear any existing processing alert first
    if (title !== 'Processing' && title !== 'Processing Payment') {
      setAlertVisible(false);
    }
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertButtons(buttons || [{ text: 'OK' }]);
    setAlertVisible(true);
  };

  const closeAlert = () => {
    setAlertVisible(false);
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    loadUserData();
    loadProfileImage();
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      const email = await AsyncStorage.getItem('userEmail');
      const premium = await AsyncStorage.getItem('isPremium');
      const notif = await AsyncStorage.getItem('notifications');
      
      setUserName(name || 'User');
      setUserEmail(email || '');
      setIsPremium(premium === 'true');
      setNotifications(notif !== 'false');
      setNewName(name || 'User');
    } catch (error) {
      console.log('Error loading settings:', error);
    }
  };

  const loadProfileImage = async () => {
    setIsLoadingProfile(true);
    try {
      const image = await AsyncStorage.getItem('profileImage');
      if (image) {
        setProfileImage(image);
      }
    } catch (error) {
      console.log('Error loading profile image:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const saveProfileImage = async (imageUri: string) => {
    try {
      await AsyncStorage.setItem('profileImage', imageUri);
      setProfileImage(imageUri);
      showSnackbar('Profile picture updated.');
    } catch (error) {
      console.log('Error saving profile image:', error);
      showSnackbar('Failed to save profile picture.', true);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showSnackbar('Permission to access gallery is required.', true);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0].uri;
        await saveProfileImage(selectedImage);
      }
    } catch (error) {
      console.log('Error picking image:', error);
      showSnackbar('Failed to select image.', true);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showSnackbar('Permission to access camera is required.', true);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const capturedImage = result.assets[0].uri;
        await saveProfileImage(capturedImage);
      }
    } catch (error) {
      console.log('Error taking photo:', error);
      showSnackbar('Failed to take photo.', true);
    }
  };

  const showImagePickerOptions = () => {
    showAlert(
      'Profile Picture',
      'Choose an option below:',
      [
        { 
          text: 'Choose from Gallery', 
          onPress: pickImage,
          style: 'default'
        },
        { 
          text: 'Take Photo', 
          onPress: takePhoto,
          style: 'default'
        },
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
      ]
    );
  };

  const saveUserName = async () => {
    if (newName.trim().length < 2) {
      showSnackbar('Name must be at least 2 characters long.', true);
      return;
    }
    
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      
      await api.put(`/users/${userId}`, {
        fullName: newName.trim(),
      });
      
      await AsyncStorage.setItem('userName', newName.trim());
      setUserName(newName.trim());
      setEditingName(false);
      
      showSnackbar('Profile updated successfully.');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to update profile. Please try again.';
      showSnackbar(message, true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDarkMode = (value: boolean) => {
    toggleDarkMode();
    showSnackbar(value ? 'Dark mode enabled.' : 'Light mode enabled.');
  };

  const toggleNotifications = async (value: boolean) => {
    setNotifications(value);
    await AsyncStorage.setItem('notifications', String(value));
    showSnackbar(value ? 'Notifications enabled.' : 'Notifications disabled.');
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showSnackbar('Please fill in all password fields.', true);
      return;
    }

    if (newPassword.length < 6) {
      showSnackbar('New password must be at least 6 characters long.', true);
      return;
    }

    if (newPassword !== confirmPassword) {
      showSnackbar('New passwords do not match.', true);
      return;
    }

    setPasswordLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      
      await api.put(`/users/${userId}/password`, {
        currentPassword,
        newPassword,
      });
      
      showSnackbar('Password changed successfully.');
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalVisible(false);
      
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to change password. Please try again.';
      showSnackbar(message, true);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleManageSubscription = () => {
    if (isPremium) {
      showAlert(
        'Manage Subscription',
        'You are currently on the Premium plan.\n\nMonthly: $4.99\nNext billing date: Coming soon\n\nWould you like to cancel your subscription?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Cancel Subscription',
            style: 'cancel',
            onPress: () => {
              showAlert(
                'Cancel Subscription',
                'Are you sure you want to cancel your premium subscription? You will lose access to premium features.',
                [
                  { text: 'Keep Premium', style: 'cancel' },
                  { 
                    text: 'Cancel Anyway',
                    onPress: async () => {
                      await AsyncStorage.setItem('isPremium', 'false');
                      setIsPremium(false);
                      showSnackbar('Your premium subscription has been cancelled.');
                    }
                  }
                ]
              );
            }
          }
        ]
      );
    } else {
      showAlert(
        'Upgrade to Premium',
        'Get unlimited analyses, detailed reports and advanced features.\n\nUnlimited article analyses\nDetailed credibility reports\nAdvanced source verification\nPriority support\n\nOnly $4.99/month',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Upgrade Now ($4.99)',
            onPress: () => {
              // Show processing alert
              showAlert(
                'Processing',
                'Please wait while we process your payment...',
                []
              );
              
              // Auto-dismiss processing alert after 2 seconds
              processingTimeoutRef.current = setTimeout(async () => {
                // Close the processing alert
                setAlertVisible(false);
                
                // Complete the upgrade
                await AsyncStorage.setItem('isPremium', 'true');
                setIsPremium(true);
                showSnackbar('You are now a Premium member.');
                
                // Clear the timeout reference
                processingTimeoutRef.current = null;
              }, 2000);
            }
          }
        ]
      );
    }
  };

  const handleExportData = async () => {
    try {
      showSnackbar('Preparing your data...');
      
      setTimeout(() => {
        showAlert(
          'Data Export',
          `Your data has been prepared.\n\nUser: ${userName}\nEmail: ${userEmail}\nPremium: ${isPremium ? 'Yes' : 'No'}\n\nIn a production app, you would receive a downloadable file.`,
          [{ text: 'OK' }]
        );
      }, 1500);
      
    } catch (error) {
      showSnackbar('Failed to export data. Please try again.', true);
    }
  };

  const handleDeleteAccount = () => {
    showAlert(
      'Delete Account',
      'Are you sure you want to delete your account?\n\nThis action is PERMANENT and cannot be undone.\n\nAll your data will be removed:\nAccount information\nAll analyzed articles\nSaved preferences',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue',
          onPress: () => showDeleteConfirmation()
        }
      ]
    );
  };

  const showDeleteConfirmation = () => {
    Alert.alert(
      'Confirm Deletion',
      'To confirm, type "DELETE" below:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: () => showPasswordPrompt()
        }
      ]
    );
  };

  const showPasswordPrompt = () => {
    Alert.prompt(
      'Enter Password',
      'Please enter your password to confirm account deletion:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async (password) => {
            if (!password) {
              showSnackbar('Password is required.', true);
              return;
            }
            await performDeleteAccount(password);
          }
        }
      ],
      'secure-text'
    );
  };

  const performDeleteAccount = async (password: string) => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      
      setLoading(true);
      
      await api.delete(`/users/${userId}`, {
        data: {
          password: password,
          confirmation: 'DELETE'
        }
      });
      
      await AsyncStorage.clear();
      
      showAlert(
        'Account Deleted',
        'Your account has been permanently deleted.\n\nWe are sorry to see you go.',
        [
          { 
            text: 'OK',
            onPress: () => navigation.replace('Login')
          }
        ]
      );
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to delete account. Please try again.';
      showSnackbar(message, true);
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacySecurity = () => {
    showAlert(
      'Privacy and Security',
      'Manage your privacy and security settings:\n\nYour data is encrypted\nWe never share your personal information\nYou can request data deletion\n\nWant to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Account',
          style: 'cancel',
          onPress: handleDeleteAccount
        }
      ]
    );
  };

  const handleLanguageSelect = () => {
    showAlert(
      'Select Language',
      'Choose your preferred language:\n\nEnglish (Default)\nSpanish (Coming Soon)\nFrench (Coming Soon)\nGerman (Coming Soon)\nChinese (Coming Soon)',
      [{ text: 'OK' }]
    );
  };

  const handleLogout = async () => {
    showAlert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.replace('Login');
          }
        },
      ]
    );
  };

  const renderProfileSection = () => (
    <Card style={[styles.card, darkMode && styles.cardDark]} mode="elevated">
      <Card.Content>
        <Title style={[styles.sectionTitle, darkMode && styles.textDark]}>Profile</Title>
        
        <View style={styles.profileRow}>
          <TouchableOpacity onPress={showImagePickerOptions} activeOpacity={0.8}>
            {isLoadingProfile ? (
              <View style={[styles.profileImage, styles.loadingAvatar]}>
                <ActivityIndicator size="small" color="#6200EE" />
              </View>
            ) : profileImage ? (
              <Image 
                source={{ uri: profileImage }} 
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <Avatar.Text 
                size={70} 
                label={userName.charAt(0).toUpperCase()} 
                style={styles.avatar}
                color="#FFFFFF"
              />
            )}
            <View style={styles.cameraIconContainer}>
              <IconButton
                icon="camera"
                size={16}
                iconColor="#FFFFFF"
                style={styles.cameraIcon}
              />
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            {editingName ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  mode="outlined"
                  value={newName}
                  onChangeText={setNewName}
                  style={[styles.nameInput, darkMode && styles.inputDark]}
                  textColor={darkMode ? '#FFFFFF' : '#1A2332'}
                  activeOutlineColor="#6200EE"
                  dense
                  disabled={loading}
                />
                <View style={styles.editButtons}>
                  <Button 
                    mode="contained" 
                    onPress={saveUserName} 
                    loading={loading}
                    disabled={loading}
                    style={styles.saveButton}
                    labelStyle={styles.saveButtonLabel}
                    buttonColor="#4CAF50"
                  >
                    Save
                  </Button>
                  <Button 
                    mode="outlined" 
                    onPress={() => setEditingName(false)}
                    style={styles.cancelButton}
                    labelStyle={styles.cancelButtonLabel}
                  >
                    Cancel
                  </Button>
                </View>
              </View>
            ) : (
              <>
                <Text style={[styles.userName, darkMode && styles.textDark]}>{userName}</Text>
                <Text style={[styles.userEmail, darkMode && styles.textMuted]}>{userEmail}</Text>
                {isPremium && (
                  <Badge style={styles.premiumBadge}>Premium</Badge>
                )}
                <Button 
                  mode="text" 
                  onPress={() => setEditingName(true)}
                  labelStyle={styles.editLink}
                  icon="pencil"
                >
                  Edit Profile
                </Button>
              </>
            )}
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderPreferencesSection = () => (
    <Card style={[styles.card, darkMode && styles.cardDark]} mode="elevated">
      <Card.Content>
        <Title style={[styles.sectionTitle, darkMode && styles.textDark]}>Preferences</Title>
        
        <List.Item
          title="Dark Mode"
          description="Switch theme (global)"
          titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
          descriptionStyle={[styles.listItemDesc, darkMode && styles.textMuted]}
          right={() => (
            <Switch
              value={darkMode}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: '#767577', true: '#6200EE' }}
              thumbColor={darkMode ? '#FFFFFF' : '#F4F3F4'}
            />
          )}
        />

        <Divider style={[styles.divider, darkMode && styles.dividerDark]} />

        <List.Item
          title="Notifications"
          description="Receive alerts and updates"
          titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
          descriptionStyle={[styles.listItemDesc, darkMode && styles.textMuted]}
          right={() => (
            <Switch
              value={notifications}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#767577', true: '#6200EE' }}
              thumbColor={notifications ? '#FFFFFF' : '#F4F3F4'}
            />
          )}
        />

        <Divider style={[styles.divider, darkMode && styles.dividerDark]} />

        <List.Item
          title="Language"
          description="Change app language"
          titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
          descriptionStyle={[styles.listItemDesc, darkMode && styles.textMuted]}
          right={() => (
            <Text style={[styles.rightText, darkMode && styles.textMuted]}>English</Text>
          )}
          onPress={handleLanguageSelect}
        />
      </Card.Content>
    </Card>
  );

  const renderAccountSection = () => (
    <Card style={[styles.card, darkMode && styles.cardDark]} mode="elevated">
      <Card.Content>
        <Title style={[styles.sectionTitle, darkMode && styles.textDark]}>Account</Title>
        
        <List.Item
          title="Change Password"
          titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
          right={() => <List.Icon icon="chevron-right" color={darkMode ? '#7F8C8D' : '#7F8C8D'} />}
          onPress={() => setPasswordModalVisible(true)}
        />

        <Divider style={[styles.divider, darkMode && styles.dividerDark]} />

        <List.Item
          title="Privacy and Security"
          titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
          right={() => <List.Icon icon="chevron-right" color={darkMode ? '#7F8C8D' : '#7F8C8D'} />}
          onPress={handlePrivacySecurity}
        />

        <Divider style={[styles.divider, darkMode && styles.dividerDark]} />

        <List.Item
          title={isPremium ? 'Manage Subscription' : 'Upgrade to Premium'}
          titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
          right={() => <List.Icon icon="chevron-right" color={darkMode ? '#7F8C8D' : '#7F8C8D'} />}
          onPress={handleManageSubscription}
        />

        <Divider style={[styles.divider, darkMode && styles.dividerDark]} />

        <List.Item
          title="Export Data"
          titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
          right={() => <List.Icon icon="chevron-right" color={darkMode ? '#7F8C8D' : '#7F8C8D'} />}
          onPress={handleExportData}
        />

        <Divider style={[styles.divider, darkMode && styles.dividerDark]} />

        <List.Item
          title="Logout"
          titleStyle={[styles.listItemTitle, styles.logoutText]}
          right={() => <List.Icon icon="logout" color="#EF5350" />}
          onPress={handleLogout}
        />
      </Card.Content>
    </Card>
  );

  const renderAboutSection = () => (
    <Card style={[styles.card, darkMode && styles.cardDark]} mode="elevated">
      <Card.Content>
        <Title style={[styles.sectionTitle, darkMode && styles.textDark]}>About</Title>
        
        <List.Item
          title="Version 1.0.0"
          titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
          right={() => <List.Icon icon="chevron-right" color={darkMode ? '#7F8C8D' : '#7F8C8D'} />}
          onPress={() => showAlert(
            'About NewsCred', 
            'NewsCred v1.0.0\n\nIntelligent News Credibility Platform\n\nDeveloped with care\nCopyright 2026 NewsCred Inc.'
          )}
        />

        <Divider style={[styles.divider, darkMode && styles.dividerDark]} />

        <List.Item
          title="Terms of Service"
          titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
          right={() => <List.Icon icon="chevron-right" color={darkMode ? '#7F8C8D' : '#7F8C8D'} />}
          onPress={() => showAlert(
            'Terms of Service', 
            'Terms of Service\n\nBy using NewsCred, you agree to:\nUse the app responsibly\nNot misuse the analysis features\nRespect intellectual property\n\nFull terms available on our website.'
          )}
        />

        <Divider style={[styles.divider, darkMode && styles.dividerDark]} />

        <List.Item
          title="Privacy Policy"
          titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
          right={() => <List.Icon icon="chevron-right" color={darkMode ? '#7F8C8D' : '#7F8C8D'} />}
          onPress={() => showAlert(
            'Privacy Policy', 
            'Privacy Policy\n\nWe value your privacy:\nYour data is encrypted\nWe do not sell your information\nYou can delete your data anytime\n\nFull policy available on our website.'
          )}
        />
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      <Surface style={[styles.header, darkMode && styles.headerDark]} elevation={2}>
        <View style={styles.headerContent}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={() => navigation.goBack()}
            iconColor={darkMode ? '#FFFFFF' : '#1A2332'}
          />
          <Text style={[styles.headerTitle, darkMode && styles.textDark]}>Settings</Text>
          <View style={{ width: 48 }} />
        </View>
      </Surface>

      <ScrollView 
        style={[styles.scrollView, darkMode && styles.scrollViewDark]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderProfileSection()}
        {renderPreferencesSection()}
        {renderAccountSection()}
        {renderAboutSection()}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      <Portal>
        <Modal
          visible={passwordModalVisible}
          onDismiss={() => setPasswordModalVisible(false)}
          contentContainerStyle={[styles.modalContainer, darkMode && styles.modalContainerDark]}
        >
          <Text style={[styles.modalTitle, darkMode && styles.textDark]}>Change Password</Text>
          
          <TextInput
            mode="outlined"
            label="Current Password"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            style={[styles.modalInput, darkMode && styles.inputDark]}
            textColor={darkMode ? '#FFFFFF' : '#1A2332'}
            activeOutlineColor="#6200EE"
            left={<TextInput.Icon icon="lock" />}
          />

          <TextInput
            mode="outlined"
            label="New Password (min 6 chars)"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            style={[styles.modalInput, darkMode && styles.inputDark]}
            textColor={darkMode ? '#FFFFFF' : '#1A2332'}
            activeOutlineColor="#6200EE"
            left={<TextInput.Icon icon="lock-plus" />}
          />

          <TextInput
            mode="outlined"
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            style={[styles.modalInput, darkMode && styles.inputDark]}
            textColor={darkMode ? '#FFFFFF' : '#1A2332'}
            activeOutlineColor="#6200EE"
            left={<TextInput.Icon icon="lock-check" />}
          />

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => {
                setPasswordModalVisible(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              style={styles.modalCancelButton}
              labelStyle={styles.modalCancelLabel}
            >
              Cancel
            </Button>

            <Button
              mode="contained"
              onPress={handleChangePassword}
              loading={passwordLoading}
              disabled={passwordLoading}
              style={styles.modalSaveButton}
              labelStyle={styles.modalSaveLabel}
              buttonColor="#6200EE"
            >
              Update
            </Button>
          </View>
        </Modal>
      </Portal>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onClose={closeAlert}
      />

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2500}
        style={[styles.snackbar, { backgroundColor: snackbarColor }]}
        wrapperStyle={styles.snackbarWrapper}
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
  scrollView: {
    flex: 1,
  },
  scrollViewDark: {
    backgroundColor: '#0A0A1A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  cardDark: {
    backgroundColor: '#16213E',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A2332',
    marginBottom: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#6200EE',
  },
  loadingAvatar: {
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#6200EE',
    marginRight: 0,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#6200EE',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraIcon: {
    margin: 2,
    width: 24,
    height: 24,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A2332',
  },
  userEmail: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2,
  },
  premiumBadge: {
    backgroundColor: '#FFA726',
    color: '#FFFFFF',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  editLink: {
    color: '#6200EE',
    fontSize: 13,
    marginTop: 4,
  },
  editNameContainer: {
    width: '100%',
  },
  nameInput: {
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  inputDark: {
    backgroundColor: 'transparent',
  },
  editButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
  },
  saveButtonLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
  },
  cancelButtonLabel: {
    fontSize: 12,
    color: '#6200EE',
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A2332',
  },
  listItemDesc: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  rightText: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  divider: {
    backgroundColor: '#F0F0F0',
  },
  dividerDark: {
    backgroundColor: '#2A3A4F',
  },
  logoutText: {
    color: '#EF5350',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    margin: 24,
    padding: 24,
    borderRadius: 16,
    maxWidth: 400,
    alignSelf: 'center',
    width: '90%',
  },
  modalContainerDark: {
    backgroundColor: '#16213E',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A2332',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    borderRadius: 8,
  },
  modalCancelLabel: {
    color: '#6200EE',
  },
  modalSaveButton: {
    flex: 1,
    borderRadius: 8,
  },
  modalSaveLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  snackbar: {
    marginBottom: 16,
    borderRadius: 8,
  },
  snackbarWrapper: {
    marginBottom: 20,
  },
  snackbarText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
});

export default SettingsScreen;