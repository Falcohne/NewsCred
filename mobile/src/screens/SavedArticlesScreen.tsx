import React, { useState, useEffect, useCallback } from 'react';
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
  Searchbar,
  List,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const SavedArticlesScreen = ({ navigation }: any) => {
  const { darkMode } = useTheme();

  const [articles, setArticles] = useState<any[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, []);

  useEffect(() => {
    filterAndSortArticles();
  }, [articles, searchQuery, sortBy]);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (userId) {
        const response = await api.get(`/articles/user/${userId}`);
        setArticles(response.data || []);
      }
    } catch (error) {
      console.log('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadArticles();
    setRefreshing(false);
  };

  const filterAndSortArticles = () => {
    let filtered = [...articles];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((a) => 
        (a.title || '').toLowerCase().includes(query) ||
        (a.sourceName || '').toLowerCase().includes(query)
      );
    }
    
    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'score':
        filtered.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));
        break;
      case 'source':
        filtered.sort((a, b) => (a.sourceName || '').localeCompare(b.sourceName || ''));
        break;
      default:
        break;
    }
    
    setFilteredArticles(filtered);
  };

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const openAnalysisReport = (article: any) => {
    const result = {
      overallScore: article.overallScore,
      credibilityVerdict: article.credibilityVerdict,
      analysisSummary: article.analysisSummary,
      confidenceLevel: article.confidenceLevel,
      sourceReliability: article.sourceReliability,
      contentQuality: article.contentQuality,
      evidenceQuality: article.evidenceQuality,
      languageTone: article.languageTone,
      factConsistency: article.factConsistency,
      headlineAnalysis: article.headlineAnalysis,
      createdAt: article.createdAt,
      publishDate: article.publishDate,
      dateStatus: article.dateStatus,
      dateScore: article.dateScore,
      dateMessage: article.dateMessage,
      authorName: article.authorName,
      authorCredibilityScore: article.authorCredibilityScore,
      authorStatus: article.authorStatus,
      authorMessage: article.authorMessage,
      imageCount: article.imageCount,
      imageStatus: article.imageStatus,
      imageMessage: article.imageMessage,
      imageUrls: article.imageUrls,
    };
    navigation.navigate('AnalysisDetail', { result });
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

  const renderSortChip = (label: string, value: string) => (
    <Chip
      mode="flat"
      selected={sortBy === value}
      onPress={() => setSortBy(value)}
      style={[
        styles.sortChip,
        sortBy === value && styles.sortChipActive,
        darkMode && styles.sortChipDark,
      ]}
      textStyle={[
        styles.sortChipText,
        sortBy === value && styles.sortChipTextActive,
        darkMode && styles.textMuted,
      ]}
      selectedColor="#6200EE"
    >
      {label}
    </Chip>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200EE" />
          <Text style={[styles.loadingText, darkMode && styles.textMuted]}>
            Loading your articles...
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
          <Text style={[styles.headerTitle, darkMode && styles.textDark]}>Saved Articles</Text>
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
        <View style={styles.statsContainer}>
          <Text style={[styles.statsText, darkMode && styles.textMuted]}>
            {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
            {filteredArticles.length !== articles.length && ` (filtered from ${articles.length})`}
          </Text>
        </View>

        <Searchbar
          placeholder="Search articles, sources..."
          onChangeText={handleSearchChange}
          value={searchQuery}
          style={[styles.searchBar, darkMode && styles.searchBarDark]}
          inputStyle={[styles.searchInput, darkMode && styles.searchInputDark]}
          iconColor={darkMode ? '#7F8C8D' : '#7F8C8D'}
          clearIcon="close"
          onClearIconPress={() => setSearchQuery('')}
          theme={{ colors: { text: darkMode ? '#FFFFFF' : '#1A2332' } }}
        />

        <View style={styles.sortContainer}>
          <Text style={[styles.sortLabel, darkMode && styles.textMuted]}>Sort by:</Text>
          <View style={styles.sortChips}>
            {renderSortChip('Date', 'date')}
            {renderSortChip('Score', 'score')}
            {renderSortChip('Source', 'source')}
          </View>
        </View>

        {filteredArticles.length === 0 ? (
          <Card style={[styles.emptyCard, darkMode && styles.cardDark]} mode="elevated">
            <Card.Content style={styles.emptyContent}>
              <IconButton
                icon="file-document-outline"
                size={60}
                iconColor={darkMode ? '#666666' : '#CCCCCC'}
                style={styles.emptyIcon}
              />
              <Title style={[styles.emptyTitle, darkMode && styles.textDark]}>
                {searchQuery ? 'No Matching Articles' : 'No Articles Found'}
              </Title>
              <Paragraph style={[styles.emptyDesc, darkMode && styles.textMuted]}>
                {searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'Analyze articles to save them here'}
              </Paragraph>
              {!searchQuery && (
                <Button
                  mode="contained"
                  onPress={() => navigation.navigate('Home')}
                  style={styles.emptyButton}
                  labelStyle={styles.emptyButtonLabel}
                  buttonColor="#6200EE"
                >
                  Analyze an Article
                </Button>
              )}
            </Card.Content>
          </Card>
        ) : (
          <View style={styles.articleList}>
            {filteredArticles.map((article) => {
              const scoreColor = getScoreColor(article.overallScore);
              const verdictColor = getVerdictColor(article.credibilityVerdict);

              return (
                <Card
                  key={article.id}
                  style={[styles.articleCard, darkMode && styles.cardDark]}
                  mode="elevated"
                  onPress={() => {
                    if (article.url && article.url !== 'User submitted text') {
                      navigation.navigate('AnalysisDetail', { result: article });
                    } else {
                      openAnalysisReport(article);
                    }
                  }}
                  onLongPress={() => openAnalysisReport(article)}
                >
                  <Card.Content>
                    <View style={styles.articleHeader}>
                      <Text style={[styles.articleTitle, darkMode && styles.textDark]} numberOfLines={2}>
                        {article.title || 'Untitled'}
                      </Text>
                      <Badge style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                        {Math.round(article.overallScore || 0)}%
                      </Badge>
                    </View>

                    <View style={styles.articleMeta}>
                      <Text style={[styles.articleSource, darkMode && styles.textMuted]}>
                        Source: {article.sourceName || 'Unknown'}
                      </Text>
                      <Text style={[styles.articleDate, darkMode && styles.textMuted]}>
                        {article.createdAt ? new Date(article.createdAt).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>

                    <View style={[styles.articleFooter, darkMode && styles.borderDark]}>
                      <Chip
                        mode="flat"
                        style={[styles.verdictChip, { backgroundColor: verdictColor }]}
                        textStyle={styles.verdictChipText}
                      >
                        {getVerdictLabel(article.credibilityVerdict || 'UNSURE')}
                      </Chip>
                      <Button
                        mode="text"
                        onPress={() => openAnalysisReport(article)}
                        labelStyle={styles.viewReportLabel}
                        icon="file-document"
                      >
                        Report
                      </Button>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, darkMode && styles.textMuted]}>
            {filteredArticles.length} articles - Tap to open - Long press for report
          </Text>
        </View>

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
  statsContainer: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  statsText: {
    fontSize: 14,
    color: '#7F8C8D',
  },
  searchBar: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  searchBarDark: {
    backgroundColor: '#16213E',
  },
  searchInput: {
    fontSize: 15,
  },
  searchInputDark: {
    color: '#FFFFFF',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sortLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    marginRight: 10,
  },
  sortChips: {
    flexDirection: 'row',
    gap: 6,
  },
  sortChip: {
    backgroundColor: '#ECF0F1',
  },
  sortChipDark: {
    backgroundColor: '#1A2332',
  },
  sortChipActive: {
    backgroundColor: '#6200EE',
  },
  sortChipText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },
  articleList: {
    gap: 12,
  },
  articleCard: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  articleTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2332',
    marginRight: 8,
  },
  scoreBadge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  articleMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  articleSource: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  articleDate: {
    fontSize: 11,
    color: '#A0AEC0',
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  borderDark: {
    borderTopColor: '#2A3A4F',
  },
  verdictChip: {
     borderRadius: 16,
    paddingHorizontal: 4,
  },
  verdictChipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  viewReportLabel: {
    fontSize: 12,
    color: '#6200EE',
    fontWeight: '500',
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
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#A0AEC0',
  },
});

export default SavedArticlesScreen;