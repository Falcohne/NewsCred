import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  Card,
  Title,
  Paragraph,
  Chip,
  Badge,
  Divider,
  Surface,
  IconButton,
  List,
  ProgressBar,
  ActivityIndicator,
  Button,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import CustomAlert from '../components/CustomAlert';

interface StatisticsData {
  totalArticles: number;
  averageScore: number;
  totalSources: number;
  isPremium: boolean;
  scoreDistribution: Record<string, number>;
  topSources: Array<{ name: string; count: number; averageScore: number }>;
  recentActivity: Array<{
    id: string;
    title: string;
    score: number;
    verdict: string;
    date: string;
  }>;
}

const StatisticsScreen = ({ navigation }: any) => {
  const { darkMode } = useTheme();

  const [stats, setStats] = useState<StatisticsData>({
    totalArticles: 0,
    averageScore: 0,
    totalSources: 0,
    isPremium: false,
    scoreDistribution: {
      CREDIBLE: 0,
      LIKELY_CREDIBLE: 0,
      UNSURE: 0,
      MISLEADING: 0,
      NOT_CREDIBLE: 0,
    },
    topSources: [],
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      const isPremium = await AsyncStorage.getItem('isPremium');
      const premium = isPremium === 'true';
      
      if (userId) {
        const response = await api.get(`/articles/user/${userId}`);
        const articles = response.data || [];
        
        const totalArticles = articles.length;
        const totalScore = articles.reduce((sum: number, a: any) => sum + (a.overallScore || 0), 0);
        const averageScore = totalArticles > 0 ? Math.round(totalScore / totalArticles) : 0;
        
        const distribution: Record<string, number> = {
          CREDIBLE: 0,
          LIKELY_CREDIBLE: 0,
          UNSURE: 0,
          MISLEADING: 0,
          NOT_CREDIBLE: 0,
        };
        
        articles.forEach((a: any) => {
          const verdict = a.credibilityVerdict || 'UNSURE';
          if (distribution[verdict] !== undefined) {
            distribution[verdict]++;
          }
        });
        
        const sourceMap: Record<string, any> = {};
        articles.forEach((a: any) => {
          const domain = a.sourceName || 'Unknown';
          if (!sourceMap[domain]) {
            sourceMap[domain] = { count: 0, totalScore: 0 };
          }
          sourceMap[domain].count++;
          sourceMap[domain].totalScore += a.overallScore || 0;
        });
        
        const topSources = Object.entries(sourceMap)
          .map(([name, data]: [string, any]) => ({
            name,
            count: data.count,
            averageScore: Math.round(data.totalScore / data.count),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        const recentActivity = articles
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map((a: any) => ({
            id: a.id,
            title: a.title || 'Untitled',
            score: Math.round(a.overallScore || 0),
            verdict: a.credibilityVerdict || 'UNSURE',
            date: a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'N/A',
          }));
        
        setStats({
          totalArticles,
          averageScore,
          totalSources: Object.keys(sourceMap).length,
          isPremium: premium,
          scoreDistribution: distribution,
          topSources,
          recentActivity,
        });
      }
    } catch (error) {
      console.log('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatistics();
    setRefreshing(false);
  };

  const getVerdictColor = (verdict: string): string => {
    switch (verdict) {
      case 'CREDIBLE': return '#4CAF50';
      case 'LIKELY_CREDIBLE': return '#66BB6A';
      case 'UNSURE': return '#FFA726';
      case 'MISLEADING': return '#EF5350';
      case 'NOT_CREDIBLE': return '#D32F2F';
      default: return '#78909C';
    }
  };

  const getVerdictLabel = (verdict: string): string => {
    return verdict.replace('_', ' ');
  };

  const getScoreColor = (score: number): string => {
    if (score >= 70) return '#4CAF50';
    if (score >= 50) return '#FFA726';
    return '#EF5350';
  };

  const handleUpgrade = () => {
    showAlert(
      'Upgrade to Premium',
      'Get unlimited analyses, detailed reports and advanced features.\n\nUnlimited article analyses\nDetailed credibility reports\nAdvanced source verification\nPriority support\n\nOnly $4.99/month',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Upgrade Now ($4.99)',
          onPress: () => handleConfirmUpgrade()
        },
      ]
    );
  };

  const handleConfirmUpgrade = () => {
    showAlert('Processing Payment', 'Please wait while we process your payment...', []);
    setTimeout(async () => {
      await AsyncStorage.setItem('isPremium', 'true');
      setStats(prev => ({
        ...prev,
        isPremium: true,
      }));
      showAlert('Success', 'You are now a Premium member.', [
        { 
          text: 'OK', 
          onPress: () => {
            loadStatistics();
          }
        }
      ]);
    }, 2000);
  };

  const handleGoToSettings = () => {
    navigation.navigate('Settings');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={[styles.loadingText, darkMode && styles.textMuted]}>
            Loading your statistics...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const hasData = stats.totalArticles > 0;

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
          <Text style={[styles.headerTitle, darkMode && styles.textDark]}>Statistics</Text>
          <IconButton
            icon="refresh"
            size={24}
            onPress={onRefresh}
            iconColor={darkMode ? '#FFFFFF' : '#6200EE'}
          />
        </View>
      </Surface>

      <ScrollView
        style={[styles.scrollView, darkMode && styles.scrollViewDark]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={darkMode ? '#FFFFFF' : undefined}
            colors={['#6200EE']}
            progressBackgroundColor={darkMode ? '#1A2332' : '#FFFFFF'}
          />
        }
      >
        {!hasData ? (
          <Card style={[styles.emptyCard, darkMode && styles.cardDark]} mode="elevated">
            <Card.Content style={styles.emptyContent}>
              <IconButton
                icon="chart-bar"
                size={60}
                iconColor={darkMode ? '#666666' : '#CCCCCC'}
                style={styles.emptyIcon}
              />
              <Title style={[styles.emptyTitle, darkMode && styles.textDark]}>No Statistics Yet</Title>
              <Paragraph style={[styles.emptyDesc, darkMode && styles.textMuted]}>
                Analyze articles to see your credibility statistics.
              </Paragraph>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Home')}
                style={styles.emptyButton}
                labelStyle={styles.emptyButtonLabel}
                buttonColor="#6200EE"
              >
                Analyze an Article
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <>
            <View style={styles.summaryGrid}>
              <Card style={[styles.summaryCard, darkMode && styles.cardDark]} mode="elevated">
                <Card.Content style={styles.summaryCardContent}>
                  <Text style={[styles.summaryNumber, darkMode && styles.textDark]}>{stats.totalArticles}</Text>
                  <Text style={[styles.summaryLabel, darkMode && styles.textMuted]}>Articles</Text>
                </Card.Content>
              </Card>
              <Card style={[styles.summaryCard, darkMode && styles.cardDark]} mode="elevated">
                <Card.Content style={styles.summaryCardContent}>
                  <Text style={[styles.summaryNumber, { color: getScoreColor(stats.averageScore) }]}>
                    {stats.averageScore}%
                  </Text>
                  <Text style={[styles.summaryLabel, darkMode && styles.textMuted]}>Avg Score</Text>
                </Card.Content>
              </Card>
              <Card style={[styles.summaryCard, darkMode && styles.cardDark]} mode="elevated">
                <Card.Content style={styles.summaryCardContent}>
                  <Text style={[styles.summaryNumber, darkMode && styles.textDark]}>{stats.totalSources}</Text>
                  <Text style={[styles.summaryLabel, darkMode && styles.textMuted]}>Sources</Text>
                </Card.Content>
              </Card>
              <Card style={[styles.summaryCard, darkMode && styles.cardDark]} mode="elevated">
                <Card.Content style={styles.summaryCardContent}>
                  <Chip
                    icon={stats.isPremium ? 'star' : 'lock-open'}
                    mode="flat"
                    style={[styles.planChip, stats.isPremium ? styles.premiumChip : styles.freeChip]}
                    textStyle={styles.planChipText}
                  >
                    {stats.isPremium ? 'Premium' : 'Free'}
                  </Chip>
                  <Text style={[styles.summaryLabel, darkMode && styles.textMuted]}>Plan</Text>
                </Card.Content>
              </Card>
            </View>

            <Card style={[styles.card, darkMode && styles.cardDark]} mode="elevated">
              <Card.Content>
                <Title style={[styles.sectionTitle, darkMode && styles.textDark]}>Score Distribution</Title>
                {Object.entries(stats.scoreDistribution).map(([verdict, count]) => (
                  count > 0 && (
                    <View key={verdict} style={styles.distributionItem}>
                      <View style={styles.distributionHeader}>
                        <Text style={[styles.distributionLabel, { color: getVerdictColor(verdict) }]}>
                          {getVerdictLabel(verdict)}
                        </Text>
                        <Text style={[styles.distributionCount, darkMode && styles.textMuted]}>{count}</Text>
                      </View>
                      <ProgressBar
                        progress={stats.totalArticles > 0 ? count / stats.totalArticles : 0}
                        color={getVerdictColor(verdict)}
                        style={styles.distributionBar}
                      />
                    </View>
                  )
                ))}
              </Card.Content>
            </Card>

            <Card style={[styles.card, darkMode && styles.cardDark]} mode="elevated">
              <Card.Content>
                <Title style={[styles.sectionTitle, darkMode && styles.textDark]}>Top Sources</Title>
                {stats.topSources.length === 0 ? (
                  <Paragraph style={[styles.emptyText, darkMode && styles.textMuted]}>
                    No sources analyzed yet
                  </Paragraph>
                ) : (
                  stats.topSources.map((source: any, index: number) => (
                    <List.Item
                      key={index}
                      title={source.name}
                      titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
                      description={`${source.count} article${source.count !== 1 ? 's' : ''}`}
                      descriptionStyle={[styles.listItemDesc, darkMode && styles.textMuted]}
                      left={() => (
                        <View style={styles.rankContainer}>
                          <Badge style={styles.rankBadge}>{index + 1}</Badge>
                        </View>
                      )}
                      right={() => (
                        <Text style={[styles.sourceScore, { color: getScoreColor(source.averageScore) }]}>
                          {source.averageScore}%
                        </Text>
                      )}
                      style={[styles.listItem, darkMode && styles.listItemDark]}
                    />
                  ))
                )}
              </Card.Content>
            </Card>

            <Card style={[styles.card, darkMode && styles.cardDark]} mode="elevated">
              <Card.Content>
                <Title style={[styles.sectionTitle, darkMode && styles.textDark]}>Recent Activity</Title>
                {stats.recentActivity.length === 0 ? (
                  <Paragraph style={[styles.emptyText, darkMode && styles.textMuted]}>
                    No recent activity
                  </Paragraph>
                ) : (
                  stats.recentActivity.map((activity: any) => (
                    <List.Item
                      key={activity.id}
                      title={activity.title}
                      titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
                      description={activity.date}
                      descriptionStyle={[styles.listItemDesc, darkMode && styles.textMuted]}
                      right={() => (
                        <View style={styles.activityRight}>
                          <Text style={[styles.activityScore, { color: getScoreColor(activity.score) }]}>
                            {activity.score}%
                          </Text>
                          <Chip
                            mode="flat"
                            style={[styles.activityChip, { backgroundColor: getVerdictColor(activity.verdict) }]}
                            textStyle={styles.activityChipText}
                          >
                            {getVerdictLabel(activity.verdict)}
                          </Chip>
                        </View>
                      )}
                      style={[styles.listItem, darkMode && styles.listItemDark]}
                    />
                  ))
                )}
              </Card.Content>
            </Card>
          </>
        )}

        {!stats.isPremium && (
          <Card style={[styles.premiumCard, darkMode && styles.cardDark]} mode="elevated">
            <Card.Content style={styles.premiumContent}>
              <Text style={styles.premiumIcon}>Star</Text>
              <Title style={[styles.premiumTitle, darkMode && styles.textDark]}>Upgrade to Premium</Title>
              <Paragraph style={[styles.premiumDesc, darkMode && styles.textMuted]}>
                Get unlimited analyses and access to advanced features.
              </Paragraph>
              <View style={styles.premiumButtonsRow}>
                <Button
                  mode="outlined"
                  onPress={handleGoToSettings}
                  style={styles.premiumSettingsButton}
                  labelStyle={styles.premiumSettingsLabel}
                >
                  Settings
                </Button>
                <Button
                  mode="contained"
                  onPress={handleUpgrade}
                  style={styles.premiumUpgradeButton}
                  labelStyle={styles.premiumUpgradeLabel}
                  buttonColor="#FFA726"
                >
                  Upgrade Now
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        <View style={{ height: 40 }} />
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
  scrollView: {
    flex: 1,
  },
  scrollViewDark: {
    backgroundColor: '#0A0A1A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7F8C8D',
  },
  cardDark: {
    backgroundColor: '#16213E',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  summaryCardContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A2332',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  planChip: {
    height: 28,
    marginBottom: 4,
  },
  premiumChip: {
    backgroundColor: '#FFF3E0',
  },
  freeChip: {
    backgroundColor: '#E8F5E9',
  },
  planChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A2332',
    marginBottom: 12,
  },
  distributionItem: {
    marginBottom: 10,
  },
  distributionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distributionLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  distributionCount: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  distributionBar: {
    height: 6,
    borderRadius: 3,
  },
  listItem: {
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  listItemDark: {
    backgroundColor: 'transparent',
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A2332',
  },
  listItemDesc: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  rankContainer: {
    justifyContent: 'center',
    marginRight: 8,
  },
  rankBadge: {
    backgroundColor: '#6200EE',
    color: '#FFFFFF',
    fontSize: 10,
    paddingHorizontal: 6,
  },
  sourceScore: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activityRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  activityScore: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  activityChip: {
    height: 20,
    borderRadius: 10,
  },
  activityChipText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    paddingVertical: 20,
  },
  emptyCard: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 20,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A2332',
  },
  emptyDesc: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  emptyButton: {
    borderRadius: 8,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  emptyButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  premiumCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  premiumContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  premiumIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  premiumTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A2332',
  },
  premiumDesc: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginVertical: 8,
    paddingHorizontal: 20,
  },
  premiumButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  premiumSettingsButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#6200EE',
  },
  premiumSettingsLabel: {
    color: '#6200EE',
    fontSize: 14,
    fontWeight: '600',
  },
  premiumUpgradeButton: {
    flex: 1,
    borderRadius: 8,
  },
  premiumUpgradeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default StatisticsScreen;