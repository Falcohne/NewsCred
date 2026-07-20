import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  TextInput as PaperInput,
  Button,
  ActivityIndicator,
  Card,
  Surface,
  Chip,
  Divider,
  Avatar,
  Badge,
  List,
  IconButton,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';

const DashboardScreen = ({ navigation }: any) => {
  const { darkMode, colors } = useTheme();

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

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

  useEffect(() => {
    loadUserData();
    loadHistory();
    loadNotificationCount();
    loadProfileImage();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfileImage();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadUserData = async () => {
    try {
      const name = await AsyncStorage.getItem('userName');
      const email = await AsyncStorage.getItem('userEmail');
      const premium = await AsyncStorage.getItem('isPremium');
      const count = await AsyncStorage.getItem('analysisCount');
      
      setUserName(name || 'User');
      setUserEmail(email || '');
      setIsPremium(premium === 'true');
      setAnalysisCount(parseInt(count || '0'));
    } catch (error) {
      console.log('Error loading user data:', error);
    }
  };

  const loadProfileImage = async () => {
    try {
      const image = await AsyncStorage.getItem('profileImage');
      setProfileImage(image);
    } catch (error) {
      console.log('Error loading profile image:', error);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const response = await api.get(`/articles/user/${userId}`);
        setHistory(response.data || []);
      }
    } catch (error) {
      console.log('Error loading history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const loadNotificationCount = async () => {
    try {
      const count = await AsyncStorage.getItem('notificationCount');
      setNotificationCount(count ? parseInt(count) : 0);
    } catch (error) {
      console.log('Error loading notification count:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!isPremium && analysisCount >= 3) {
      showAlert(
        'Free Limit Reached',
        'You have used all 3 free analyses. Upgrade to Premium for unlimited analyses.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade Now', onPress: () => handleUpgrade() },
        ]
      );
      return;
    }

    if (!content && !url) {
      showAlert('Error', 'Please enter an article URL or paste article text.');
      return;
    }

    if (url && url.trim()) {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(url.trim())) {
        showAlert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
        return;
      }
    }

    if (content && content.trim() && content.trim().length < 20) {
      showAlert('Content Too Short', 'Please paste at least 20 characters for analysis.');
      return;
    }

    setLoading(true);
    setShowResult(false);
    try {
      const userId = await AsyncStorage.getItem('userId');
      const response = await api.post('/articles/analyze', {
        userId,
        url: url || '',
        content: content || '',
      });
      
      if (response.data.error) {
        showAlert('Error', response.data.message);
        setLoading(false);
        return;
      }
      
      setAnalysisResult(response.data);
      setShowResult(true);
      setContent('');
      setUrl('');
      
      const newCount = analysisCount + 1;
      setAnalysisCount(newCount);
      await AsyncStorage.setItem('analysisCount', String(newCount));
      await loadHistory();
    } catch (error: any) {
      showAlert('Analysis Failed', error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    showAlert(
      'Upgrade to Premium',
      'Get unlimited analyses, detailed reports and advanced features.\n\nUnlimited article analyses\nDetailed credibility reports\nAdvanced source verification\nPriority support\n\nOnly $4.99/month',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Upgrade Now', onPress: () => confirmUpgrade() },
      ]
    );
  };

  const confirmUpgrade = () => {
    showAlert('Processing Payment', 'Please wait...', []);
    setTimeout(async () => {
      await AsyncStorage.setItem('isPremium', 'true');
      setIsPremium(true);
      showAlert('Success', 'You are now a Premium member.', [{ text: 'OK' }]);
    }, 2000);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    await loadUserData();
    await loadNotificationCount();
    await loadProfileImage();
    setRefreshing(false);
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'CREDIBLE': return '#4CAF50';
      case 'LIKELY_CREDIBLE': return '#66BB6A';
      case 'UNSURE': return '#FFA726';
      case 'MISLEADING': return '#EF5350';
      case 'NOT_CREDIBLE': return '#D32F2F';
      default: return '#78909C';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return '#4CAF50';
    if (score >= 50) return '#FFA726';
    return '#EF5350';
  };

  const getNumericScore = (score: any): number => {
    if (typeof score === 'number') return score;
    if (typeof score === 'string') return parseFloat(score) || 0;
    return 0;
  };

  const getIndicatorLabel = (value: string) => {
    switch (value) {
      case 'HIGH': return 'High';
      case 'MEDIUM': return 'Moderate';
      case 'LOW': return 'Low';
      default: return value;
    }
  };

  const getIndicatorColor = (value: string) => {
    switch (value) {
      case 'HIGH': return '#4CAF50';
      case 'MEDIUM': return '#FFA726';
      case 'LOW': return '#EF5350';
      default: return '#78909C';
    }
  };

  const getIndicatorScore = (level: string) => {
    switch (level) {
      case 'HIGH': return '85';
      case 'MEDIUM': return '60';
      case 'LOW': return '35';
      default: return '50';
    }
  };

  const handleNotificationPress = () => {
    showAlert('Notifications', 'You have ' + notificationCount + ' notifications.');
    setNotificationCount(0);
    AsyncStorage.setItem('notificationCount', '0');
  };

  const handleSettingsPress = () => {
    navigation.navigate('Profile');
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const handleReadArticle = (item: any) => {
    if (item.url && item.url !== 'User submitted text' && item.url !== 'Unknown') {
      navigation.navigate('ArticleWebView', {
        url: item.url,
        title: item.title || 'Article',
      });
    } else {
      showAlert(
        'No URL Available',
        'This article was submitted as text, not from a URL.'
      );
    }
  };

  const renderProfileAvatar = () => {
    if (profileImage) {
      return (
        <Image 
          source={{ uri: profileImage }} 
          style={styles.profileAvatarImage}
          resizeMode="cover"
        />
      );
    }
    return (
      <Avatar.Icon 
        size={50} 
        icon="account" 
        style={styles.avatar}
        color="#6200EE"
      />
    );
  };

  const renderHistorySection = () => {
    if (isLoadingHistory) {
      return (
        <Card style={[styles.historyCard, darkMode && styles.cardDark]} mode="elevated">
          <Card.Content>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6200EE" />
              <Text style={[styles.loadingText, darkMode && styles.textMuted]}>
                Loading your history...
              </Text>
            </View>
          </Card.Content>
        </Card>
      );
    }

    if (history.length === 0) {
      return (
        <Card style={[styles.historyCard, darkMode && styles.cardDark]} mode="elevated">
          <Card.Content>
            <View style={styles.emptyContainer}>
              <IconButton
                icon="file-document-outline"
                size={60}
                iconColor={darkMode ? '#666666' : '#CCCCCC'}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyTitle, darkMode && styles.textDark]}>
                No Articles Yet
              </Text>
              <Text style={[styles.emptyDescription, darkMode && styles.textMuted]}>
                Analyze your first article to see it here.
              </Text>
              <Button
                mode="contained"
                onPress={() => {
                  // Scroll to input section
                }}
                style={styles.emptyButton}
                labelStyle={styles.emptyButtonLabel}
                buttonColor="#6200EE"
              >
                Analyze an Article
              </Button>
            </View>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={[styles.historyCard, darkMode && styles.cardDark]} mode="elevated">
        <Card.Content>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, darkMode && styles.textDark]}>Recent Activity</Text>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('History')}
              labelStyle={styles.viewAllLabel}
            >
              View All
            </Button>
          </View>

          {history.slice(0, 3).map((item) => {
            const hasValidUrl = item.url && item.url !== 'User submitted text' && item.url !== 'Unknown';
            
            return (
              <List.Item
                key={item.id}
                title={item.title || 'Untitled'}
                titleStyle={[styles.historyItemTitle, darkMode && styles.textDark]}
                description={new Date(item.createdAt).toLocaleDateString()}
                descriptionStyle={[styles.historyItemDate, darkMode && styles.textMuted]}
                left={() => (
                  <View style={styles.historyLeft}>
                    {hasValidUrl && (
                      <TouchableOpacity 
                        onPress={() => handleReadArticle(item)}
                        style={styles.historyLinkButton}
                      >
                        <IconButton
                          icon="web"
                          size={18}
                          iconColor="#FFFFFF"
                          style={styles.historyLinkIcon}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                right={() => (
                  <View style={styles.historyRight}>
                    <Badge style={[styles.historyBadge, { backgroundColor: getScoreColor(getNumericScore(item.overallScore)) }]}>
                      {Math.round(getNumericScore(item.overallScore))}%
                    </Badge>
                  </View>
                )}
                onPress={() => { 
                  setAnalysisResult(item); 
                  setShowResult(true); 
                }}
                style={[styles.historyListItem, darkMode && styles.historyListItemDark]}
              />
            );
          })}
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      <View style={[styles.header, darkMode && styles.headerDark]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, darkMode && styles.textDark]}>NewsCred</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleNotificationPress} style={styles.headerIconButton}>
            <IconButton
              icon="bell"
              size={24}
              iconColor={darkMode ? '#FFFFFF' : '#1A2332'}
              style={styles.iconButton}
            />
            {notificationCount > 0 && (
              <Badge style={styles.notificationBadge}>{notificationCount}</Badge>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSettingsPress} style={styles.headerIconButton}>
            <IconButton
              icon="cog"
              size={24}
              iconColor={darkMode ? '#FFFFFF' : '#1A2332'}
              style={styles.iconButton}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={[styles.scrollView, darkMode && styles.scrollViewDark]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={darkMode ? '#ffffff' : undefined}
            colors={['#6200EE']}
            progressBackgroundColor={darkMode ? '#1a2332' : '#ffffff'}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          <Card style={[styles.welcomeCard, darkMode && styles.cardDark]} mode="elevated">
            <Card.Content>
              <View style={styles.welcomeHeader}>
                <View>
                  <Text style={[styles.welcomeGreeting, darkMode && styles.textMuted]}>
                    Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!
                  </Text>
                  <Text style={[styles.welcomeTitle, darkMode && styles.textDark]}>
                    Welcome back, {userName}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleProfilePress}>
                  {renderProfileAvatar()}
                </TouchableOpacity>
              </View>
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, darkMode && styles.textDark]}>
                    {history.length}
                  </Text>
                  <Text style={[styles.statLabel, darkMode && styles.textMuted]}>Articles</Text>
                </View>
                <Divider style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, darkMode && styles.textDark]}>
                    {isPremium ? 'Unlimited' : Math.max(0, 3 - analysisCount)}
                  </Text>
                  <Text style={[styles.statLabel, darkMode && styles.textMuted]}>Remaining</Text>
                </View>
                <Divider style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Chip 
                    icon={isPremium ? 'star' : 'lock-open'}
                    mode="flat"
                    style={[styles.statusChip, isPremium ? styles.premiumChip : styles.freeChip]}
                    textStyle={styles.statusChipText}
                  >
                    {isPremium ? 'Premium' : 'Free'}
                  </Chip>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Card style={[styles.inputCard, darkMode && styles.cardDark]} mode="elevated">
            <Card.Content>
              <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Analyze Article</Text>
              <Text style={[styles.sectionSubtitle, darkMode && styles.textMuted]}>
                Paste article URL or upload article text
              </Text>

              <PaperInput
                label="Article URL"
                value={url}
                onChangeText={setUrl}
                mode="outlined"
                left={<PaperInput.Icon icon="link" />}
                style={[styles.input, darkMode && styles.inputDark]}
                textColor={darkMode ? '#FFFFFF' : '#1A2332'}
                activeOutlineColor="#6200EE"
                placeholder="https://example-news-site.com/article..."
              />

              <PaperInput
                label="Article Text"
                value={content}
                onChangeText={setContent}
                mode="outlined"
                multiline
                numberOfLines={4}
                left={<PaperInput.Icon icon="text-box" />}
                style={[styles.input, styles.textArea, darkMode && styles.inputDark]}
                textColor={darkMode ? '#FFFFFF' : '#1A2332'}
                activeOutlineColor="#6200EE"
                placeholder="Or paste article text here..."
              />

              <Button
                mode="contained"
                onPress={handleAnalyze}
                loading={loading}
                disabled={loading || (!isPremium && analysisCount >= 3)}
                style={[styles.analyzeButton, (!isPremium && analysisCount >= 3) && styles.analyzeButtonDisabled]}
                labelStyle={styles.analyzeButtonLabel}
                buttonColor={(!isPremium && analysisCount >= 3) ? '#9E9E9E' : '#6200EE'}
              >
                {!isPremium && analysisCount >= 3 ? 'Upgrade to Analyze More' : 'Analyze Now'}
              </Button>
            </Card.Content>
          </Card>

          {analysisResult && showResult && (
            <Card style={[styles.resultCard, darkMode && styles.cardDark]} mode="elevated">
              <Card.Content>
                <View style={styles.resultHeader}>
                  <View style={styles.scoreContainer}>
                    <Text style={[styles.scoreLabel, darkMode && styles.textMuted]}>Credibility Score</Text>
                    <Text style={[styles.scoreValue, { color: getScoreColor(getNumericScore(analysisResult.overallScore)) }]}>
                      {Math.round(getNumericScore(analysisResult.overallScore))}%
                    </Text>
                  </View>
                  <Chip 
                    style={[styles.verdictChip, { backgroundColor: getVerdictColor(analysisResult.credibilityVerdict) }]}
                    textStyle={styles.verdictChipText}
                  >
                    {analysisResult.credibilityVerdict?.replace('_', ' ') || 'UNSURE'}
                  </Chip>
                </View>

                <View style={[styles.scoreBarContainer, darkMode && styles.barDark]}>
                  <View style={[styles.scoreBar, { 
                    width: `${Math.min(getNumericScore(analysisResult.overallScore), 100)}%`, 
                    backgroundColor: getScoreColor(getNumericScore(analysisResult.overallScore)) 
                  }]} />
                </View>

                {analysisResult.summary && (
                  <Surface style={[styles.summarySurface, darkMode && styles.summarySurfaceDark]}>
                    <Text style={[styles.summaryLabel, darkMode && styles.textDark]}>Summary</Text>
                    <Text style={[styles.summaryText, darkMode && styles.textMuted]}>
                      {analysisResult.summary}
                    </Text>
                  </Surface>
                )}

                <Text style={[styles.confidenceText, darkMode && styles.textMuted]}>
                  Confidence Level: {analysisResult.confidenceLevel}
                </Text>

                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('AnalysisDetail', { result: analysisResult })}
                  style={styles.detailButton}
                  labelStyle={styles.detailButtonLabel}
                  buttonColor="#4CAF50"
                  icon="arrow-right"
                >
                  View Detailed Report
                </Button>
              </Card.Content>
            </Card>
          )}

          {analysisResult && showResult && (
            <Card style={[styles.indicatorsCard, darkMode && styles.cardDark]} mode="elevated">
              <Card.Content>
                <Text style={[styles.sectionTitle, darkMode && styles.textDark]}>Credibility Indicators</Text>
                <Text style={[styles.sectionSubtitle, darkMode && styles.textMuted]}>
                  6 key indicators analyzed
                </Text>

                {[
                  { key: 'sourceReliability', label: 'Source Reliability', desc: 'Reputation and trustworthiness' },
                  { key: 'contentQuality', label: 'Content Quality', desc: 'Writing quality and structure' },
                  { key: 'evidenceQuality', label: 'Evidence & References', desc: 'Supporting evidence and citations' },
                  { key: 'languageTone', label: 'Language & Tone', desc: 'Sensationalism and emotional bias' },
                  { key: 'factConsistency', label: 'Fact Consistency', desc: 'Consistency with known facts' },
                  { key: 'headlineAnalysis', label: 'Headline Analysis', desc: 'Headline accuracy and clickbait' },
                ].map((item) => (
                  <View key={item.key} style={styles.indicatorItem}>
                    <View style={styles.indicatorHeader}>
                      <Text style={[styles.indicatorName, darkMode && styles.textDark]}>{item.label}</Text>
                      <Chip 
                        mode="flat"
                        style={[styles.indicatorChip, { backgroundColor: getIndicatorColor(analysisResult[item.key] || 'MEDIUM') }]}
                        textStyle={styles.indicatorChipText}
                      >
                        {getIndicatorLabel(analysisResult[item.key] || 'MEDIUM')}
                      </Chip>
                    </View>
                    <Text style={[styles.indicatorDesc, darkMode && styles.textMuted]}>{item.desc}</Text>
                  </View>
                ))}
              </Card.Content>
            </Card>
          )}

          {renderHistorySection()}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        buttons={alertButtons}
        onClose={() => setAlertVisible(false)}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerDark: {
    backgroundColor: '#16213E',
    borderBottomColor: '#333333',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A2332',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    position: 'relative',
    marginLeft: 4,
  },
  iconButton: {
    margin: 0,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF5350',
    color: '#FFFFFF',
    fontSize: 9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewDark: {
    backgroundColor: '#0A0A1A',
  },
  scrollContent: {
    flexGrow: 1,
  },
  mainContent: {
    padding: 16,
    paddingBottom: 40,
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
  welcomeCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeGreeting: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A2332',
  },
  profileAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#6200EE',
  },
  avatar: {
    backgroundColor: '#F3E5F5',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A2332',
  },
  statLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  statDivider: {
    height: 30,
    width: 1,
    backgroundColor: '#E8ECF1',
  },
  statusChip: {
    height: 28,
  },
  premiumChip: {
    backgroundColor: '#FFF3E0',
  },
  freeChip: {
    backgroundColor: '#E8F5E9',
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  inputCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A2332',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#7F8C8D',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  inputDark: {
    backgroundColor: 'transparent',
  },
  textArea: {
    minHeight: 80,
  },
  analyzeButton: {
    borderRadius: 8,
    marginTop: 4,
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  resultCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  verdictChip: {
    borderRadius: 20,
    paddingHorizontal: 4,
  },
  verdictChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scoreBarContainer: {
    height: 6,
    backgroundColor: '#E8ECF1',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barDark: {
    backgroundColor: '#2A3A4F',
  },
  scoreBar: {
    height: '100%',
    borderRadius: 3,
  },
  summarySurface: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    marginVertical: 8,
  },
  summarySurfaceDark: {
    backgroundColor: '#1A2332',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A2332',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#34495E',
    lineHeight: 20,
  },
  confidenceText: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 4,
  },
  detailButton: {
    borderRadius: 8,
    marginTop: 12,
  },
  detailButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 4,
  },
  indicatorsCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  indicatorItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  indicatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  indicatorName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2332',
  },
  indicatorChip: {
    height: 26,
    borderRadius: 12,
  },
  indicatorChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  indicatorDesc: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  historyCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A2332',
  },
  viewAllLabel: {
    color: '#6200EE',
    fontSize: 13,
    fontWeight: '500',
  },
  historyListItem: {
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  historyListItemDark: {
    backgroundColor: 'transparent',
  },
  historyItemTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyItemDate: {
    fontSize: 11,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  historyLinkButton: {
    backgroundColor: '#6200EE',
    borderRadius: 6,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLinkIcon: {
    margin: 0,
    padding: 0,
    width: 18,
    height: 18,
  },
  historyRight: {
    justifyContent: 'center',
  },
  historyBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    paddingHorizontal: 8,
  },
  loadingContainer: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7F8C8D',
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A2332',
    marginBottom: 4,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyButton: {
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  emptyButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DashboardScreen;