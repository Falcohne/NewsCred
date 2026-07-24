import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from "react-native-safe-area-context"
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

interface Source {
  name: string;
  totalScore: number;
  count: number;
  averageScore: number;
  mostCommonVerdict: string;
  verdicts: Record<string, number>;
}

const SourceDatabaseScreen = ({ navigation }: any) => {
  const { darkMode } = useTheme();

  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const response = await api.get(`/articles/user/${userId}`);
        const articles = response.data;
        
        const sourceMap: Record<string, any> = {};
        articles.forEach((article: any) => {
          const domain = article.sourceName || 'Unknown';
          if (!sourceMap[domain]) {
            sourceMap[domain] = {
              name: domain,
              totalScore: 0,
              count: 0,
              verdicts: {},
            };
          }
          sourceMap[domain].totalScore += article.overallScore || 0;
          sourceMap[domain].count += 1;
          const verdict = article.credibilityVerdict || 'UNKNOWN';
          sourceMap[domain].verdicts[verdict] = (sourceMap[domain].verdicts[verdict] || 0) + 1;
        });
        
        const sourceList = Object.values(sourceMap).map((source: any) => ({
          ...source,
          averageScore: Math.round(source.totalScore / source.count),
          mostCommonVerdict: getMostCommonVerdict(source.verdicts),
        }));
        
        sourceList.sort((a: any, b: any) => b.averageScore - a.averageScore);
        setSources(sourceList);
      }
    } catch (error) {
      console.log('Error loading sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSources();
    setRefreshing(false);
  };

  const getMostCommonVerdict = (verdicts: Record<string, number>): string => {
    let maxCount = 0;
    let mostCommon = 'UNKNOWN';
    for (const [verdict, count] of Object.entries(verdicts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = verdict;
      }
    }
    return mostCommon;
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

  const totalArticles = sources.reduce((sum, s) => sum + s.count, 0);
  const averageScore = sources.length > 0 
    ? Math.round(sources.reduce((sum, s) => sum + s.averageScore, 0) / sources.length) 
    : 0;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={[styles.loadingText, darkMode && styles.textMuted]}>
            Loading source database...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={[styles.headerTitle, darkMode && styles.textDark]}>Source Database</Text>
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
          />
        }
      >
        <View style={styles.statsGrid}>
          <Card style={[styles.statsCard, darkMode && styles.cardDark]} mode="elevated">
            <Card.Content style={styles.statsCardContent}>
              <Text style={[styles.statsNumber, darkMode && styles.textDark]}>{sources.length}</Text>
              <Text style={[styles.statsLabel, darkMode && styles.textMuted]}>Sources</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statsCard, darkMode && styles.cardDark]} mode="elevated">
            <Card.Content style={styles.statsCardContent}>
              <Text style={[styles.statsNumber, darkMode && styles.textDark]}>{totalArticles}</Text>
              <Text style={[styles.statsLabel, darkMode && styles.textMuted]}>Articles</Text>
            </Card.Content>
          </Card>
          <Card style={[styles.statsCard, darkMode && styles.cardDark]} mode="elevated">
            <Card.Content style={styles.statsCardContent}>
              <Text style={[styles.statsNumber, { color: getScoreColor(averageScore) }]}>
                {averageScore}%
              </Text>
              <Text style={[styles.statsLabel, darkMode && styles.textMuted]}>Avg Score</Text>
            </Card.Content>
          </Card>
        </View>

        {sources.length === 0 ? (
          <Card style={[styles.emptyCard, darkMode && styles.cardDark]} mode="elevated">
            <Card.Content style={styles.emptyContent}>
              <IconButton
                icon="database-outline"
                size={60}
                iconColor={darkMode ? '#666666' : '#CCCCCC'}
                style={styles.emptyIcon}
              />
              <Title style={[styles.emptyTitle, darkMode && styles.textDark]}>No Sources Yet</Title>
              <Paragraph style={[styles.emptyDesc, darkMode && styles.textMuted]}>
                Analyze articles to build your source database.
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
          <View style={styles.sourceList}>
            {sources.map((source, index) => {
              const scoreColor = getScoreColor(source.averageScore);
              const verdictColor = getVerdictColor(source.mostCommonVerdict);

              return (
                <Card key={index} style={[styles.sourceCard, darkMode && styles.cardDark]} mode="elevated">
                  <Card.Content>
                    <View style={styles.sourceHeader}>
                      <View style={styles.sourceNameContainer}>
                        <Badge style={styles.sourceRank}>{index + 1}</Badge>
                        <Text style={[styles.sourceName, darkMode && styles.textDark]} numberOfLines={1}>
                          {source.name}
                        </Text>
                      </View>
                      <Text style={[styles.sourceScore, { color: scoreColor }]}>
                        {source.averageScore}%
                      </Text>
                    </View>

                    <View style={styles.sourceInfo}>
                      <Text style={[styles.sourceCount, darkMode && styles.textMuted]}>
                        {source.count} article{source.count !== 1 ? 's' : ''}
                      </Text>
                      <Chip
                        mode="flat"
                        style={[styles.verdictChip, { backgroundColor: verdictColor }]}
                        textStyle={styles.verdictChipText}
                      >
                        {getVerdictLabel(source.mostCommonVerdict)}
                      </Chip>
                    </View>

                    <View style={styles.progressContainer}>
                      <ProgressBar
                        progress={source.averageScore / 100}
                        color={scoreColor}
                        style={styles.progressBar}
                      />
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  statsCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  statsCardContent: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  statsNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A2332',
  },
  statsLabel: {
    fontSize: 11,
    color: '#7F8C8D',
    marginTop: 2,
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
  sourceList: {
    gap: 12,
  },
  sourceCard: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  sourceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sourceRank: {
    backgroundColor: '#6200EE',
    color: '#FFFFFF',
    fontSize: 10,
    marginRight: 10,
    paddingHorizontal: 8,
  },
  sourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2332',
    flex: 1,
  },
  sourceScore: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sourceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  sourceCount: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  verdictChip: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verdictChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
});

export default SourceDatabaseScreen;