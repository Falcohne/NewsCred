import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Share,
  Alert,
  Dimensions,
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
  Menu,
  Button,
} from 'react-native-paper';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

interface AnalysisResult {
  overallScore: number;
  credibilityVerdict: string;
  analysisSummary: string;
  confidenceLevel: string;
  sourceReliability: 'HIGH' | 'MEDIUM' | 'LOW';
  contentQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  evidenceQuality: 'HIGH' | 'MEDIUM' | 'LOW';
  languageTone: 'HIGH' | 'MEDIUM' | 'LOW';
  factConsistency: 'HIGH' | 'MEDIUM' | 'LOW';
  headlineAnalysis: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt?: string;
  summary?: string;
  publishDate?: string;
  dateStatus?: string;
  dateScore?: number;
  dateMessage?: string;
  authorName?: string;
  authorCredibilityScore?: number;
  authorStatus?: string;
  authorMessage?: string;
  imageCount?: number;
  imageStatus?: string;
  imageMessage?: string;
  imageUrls?: string[];
  title?: string;
  sourceName?: string;
  url?: string;
}

/**
 * Analysis detail screen with share functionality and read full article
 */
const AnalysisDetailScreen = ({ route, navigation }: any) => {
  const { result } = route.params as { result: AnalysisResult };
  const { darkMode } = useTheme();
  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const [scoreMenuVisible, setScoreMenuVisible] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);

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

  const getIndicatorLabel = (value: string): string => {
    switch (value) {
      case 'HIGH': return 'High';
      case 'MEDIUM': return 'Moderate';
      case 'LOW': return 'Low';
      default: return value;
    }
  };

  const getIndicatorColor = (value: string): string => {
    switch (value) {
      case 'HIGH': return '#4CAF50';
      case 'MEDIUM': return '#FFA726';
      case 'LOW': return '#EF5350';
      default: return '#78909C';
    }
  };

  const getIndicatorScore = (level: string): number => {
    switch (level) {
      case 'HIGH': return 85;
      case 'MEDIUM': return 60;
      case 'LOW': return 35;
      default: return 50;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'RECENT': return '#4CAF50';
      case 'MODERATELY_OLD': return '#FFA726';
      case 'OUTDATED': return '#EF5350';
      case 'DATE_UNKNOWN': return '#78909C';
      case 'TRUSTED': return '#4CAF50';
      case 'REPUTABLE_ORG': return '#4CAF50';
      case 'UNKNOWN_AUTHOR': return '#FFA726';
      case 'UNKNOWN': return '#78909C';
      case 'VERIFIED': return '#4CAF50';
      case 'NO_IMAGES': return '#78909C';
      case 'STOCK_PHOTOS': return '#FFA726';
      case 'AI_GENERATED': return '#FFA726';
      case 'MANIPULATED': return '#EF5350';
      case 'NEEDS_REVIEW': return '#FFA726';
      default: return '#78909C';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'RECENT': return 'check-circle';
      case 'MODERATELY_OLD': return 'alert-circle';
      case 'OUTDATED': return 'close-circle';
      case 'DATE_UNKNOWN': return 'help-circle';
      case 'TRUSTED': return 'check-circle';
      case 'REPUTABLE_ORG': return 'check-circle';
      case 'UNKNOWN_AUTHOR': return 'alert-circle';
      case 'UNKNOWN': return 'help-circle';
      case 'VERIFIED': return 'check-circle';
      case 'NO_IMAGES': return 'help-circle';
      case 'STOCK_PHOTOS': return 'alert-circle';
      case 'AI_GENERATED': return 'robot';
      case 'MANIPULATED': return 'close-circle';
      case 'NEEDS_REVIEW': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const getStatusLabel = (status: string): string => {
    return status?.replace('_', ' ') || 'Unknown';
  };

  const handleReadFullArticle = () => {
    if (result.url && result.url !== 'User submitted text' && result.url !== 'Unknown') {
      navigation.navigate('ArticleWebView', {
        url: result.url,
        title: result.title || 'Article',
      });
    } else {
      Alert.alert(
        'No URL Available',
        'This article was submitted as text, not from a URL. You can read the summary in the report above.',
        [{ text: 'OK' }]
      );
    }
  };

  const generateShareText = (): string => {
    const articleTitle = result.title || 'Article Analysis';
    const sourceName = result.sourceName || 'Unknown Source';
    const score = Math.round(result.overallScore);
    const verdict = getVerdictLabel(result.credibilityVerdict);
    const summary = result.summary || result.analysisSummary || '';
    const confidence = result.confidenceLevel || 'Medium';
    const date = result.createdAt ? new Date(result.createdAt).toLocaleDateString() : 'N/A';

    let shareText = `NewsCred Analysis Report\n`;
    shareText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    shareText += `Article: ${articleTitle}\n`;
    shareText += `Source: ${sourceName}\n`;
    shareText += `Analyzed: ${date}\n\n`;
    shareText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    shareText += `Credibility Score: ${score}%\n`;
    shareText += `Verdict: ${verdict}\n`;
    shareText += `Confidence: ${confidence}\n\n`;
    shareText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    shareText += `Summary:\n${summary}\n\n`;
    shareText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    shareText += `Credibility Indicators:\n`;

    const indicators = [
      { key: 'sourceReliability', label: 'Source Reliability' },
      { key: 'contentQuality', label: 'Content Quality' },
      { key: 'evidenceQuality', label: 'Evidence and References' },
      { key: 'languageTone', label: 'Language and Tone' },
      { key: 'factConsistency', label: 'Fact Consistency' },
      { key: 'headlineAnalysis', label: 'Headline Analysis' },
    ];

    indicators.forEach((item) => {
      const value = result[item.key as keyof AnalysisResult] as string;
      if (value) {
        const label = getIndicatorLabel(value);
        shareText += `   - ${item.label}: ${label}\n`;
      }
    });

    shareText += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    shareText += `NewsCred - Trusted News Analysis\n`;
    shareText += `Download the app: https://newscred.app\n`;

    return shareText;
  };

  const handleShare = async (closeMenu: () => void) => {
    try {
      setShareLoading(true);
      const shareText = generateShareText();
      
      const result = await Share.share({
        message: shareText,
        title: 'NewsCred Analysis Report',
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          console.log('Shared via:', result.activityType);
        } else {
          console.log('Shared successfully');
        }
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error: any) {
      Alert.alert('Share Error', error.message || 'Failed to share report');
    } finally {
      setShareLoading(false);
      closeMenu();
    }
  };

  const handleShareEmail = async (closeMenu: () => void) => {
    try {
      setShareLoading(true);
      const shareText = generateShareText();
      const subject = `NewsCred Analysis: ${result.title || 'Article Report'}`;
      
      await Share.share({
        message: shareText,
        title: subject,
        subject: subject,
      });
    } catch (error: any) {
      Alert.alert('Share Error', error.message || 'Failed to share via email');
    } finally {
      setShareLoading(false);
      closeMenu();
    }
  };

  const handleShareFile = async (closeMenu: () => void) => {
    try {
      setShareLoading(true);
      const shareText = generateShareText();
      const fileName = `NewsCred_Analysis_${Date.now()}.txt`;
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Not Available', 'File sharing is not available on this device');
        return;
      }

      await Share.share({
        message: shareText,
        title: fileName,
      });
    } catch (error: any) {
      Alert.alert('Share Error', error.message || 'Failed to share file');
    } finally {
      setShareLoading(false);
      closeMenu();
    }
  };

  const renderShareMenu = (visible: boolean, setVisible: (val: boolean) => void, anchor: any) => (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={anchor}
      style={[styles.menu, darkMode && styles.menuDark]}
      contentStyle={[styles.menuContent, darkMode && styles.menuContentDark]}
    >
      <Menu.Item
        onPress={() => handleShare(() => setVisible(false))}
        title="Share as Text"
        leadingIcon="share-variant"
        titleStyle={[styles.menuItemText, darkMode && styles.textDark]}
        disabled={shareLoading}
      />
      <Menu.Item
        onPress={() => handleShareEmail(() => setVisible(false))}
        title="Share via Email"
        leadingIcon="email"
        titleStyle={[styles.menuItemText, darkMode && styles.textDark]}
        disabled={shareLoading}
      />
      <Divider style={[styles.divider, darkMode && styles.dividerDark]} />
      <Menu.Item
        onPress={() => handleShareFile(() => setVisible(false))}
        title="Export as File"
        leadingIcon="file-document"
        titleStyle={[styles.menuItemText, darkMode && styles.textDark]}
        disabled={shareLoading}
      />
      {shareLoading && (
        <View style={styles.shareLoading}>
          <ActivityIndicator size="small" color="#6200EE" />
        </View>
      )}
    </Menu>
  );

  const renderScoreSection = () => (
    <Card style={[styles.card, darkMode && styles.cardDark]} mode="elevated">
      <Card.Content>
        <View style={styles.scoreHeader}>
          <Text style={[styles.scoreLabel, darkMode && styles.textMuted]}>Credibility Score</Text>
          {renderShareMenu(
            scoreMenuVisible,
            setScoreMenuVisible,
            <IconButton
              icon="share-variant"
              size={20}
              onPress={() => setScoreMenuVisible(true)}
              iconColor={darkMode ? '#FFFFFF' : '#1A2332'}
              disabled={shareLoading}
              style={styles.shareIconSmall}
            />
          )}
        </View>
        
        <View style={styles.scoreRow}>
          <Text style={[styles.scoreValue, { color: getScoreColor(result.overallScore) }]}>
            {Math.round(result.overallScore)}%
          </Text>
          <Badge style={[styles.scoreBadge, darkMode && styles.scoreBadgeDark]}>
            {Math.round(result.overallScore)} / 100
          </Badge>
        </View>

        <ProgressBar
          progress={result.overallScore / 100}
          color={getScoreColor(result.overallScore)}
          style={styles.progressBar}
        />

        {result.summary && (
          <Surface style={[styles.summarySurface, darkMode && styles.summarySurfaceDark]}>
            <Text style={[styles.summaryLabel, darkMode && styles.textDark]}>Article Summary</Text>
            <Text style={[styles.summaryText, darkMode && styles.textMuted]}>{result.summary}</Text>
          </Surface>
        )}

        <Chip
          style={[styles.verdictChip, { backgroundColor: getVerdictColor(result.credibilityVerdict) }]}
          textStyle={styles.verdictChipText}
        >
          {getVerdictLabel(result.credibilityVerdict)}
        </Chip>

        <Text style={[styles.verdictDesc, darkMode && styles.textMuted]}>{result.analysisSummary}</Text>
        
        <View style={styles.confidenceRow}>
          <Text style={[styles.confidenceText, darkMode && styles.textMuted]}>
            Confidence Level:
          </Text>
          <Chip mode="flat" style={styles.confidenceChip}>
            {result.confidenceLevel}
          </Chip>
        </View>

        <Text style={[styles.indicatorCount, darkMode && styles.textMuted]}>
          Based on analysis of 12 key credibility indicators
        </Text>
      </Card.Content>
    </Card>
  );

  const renderIndicatorsSection = () => (
    <Card style={[styles.card, darkMode && styles.cardDark]} mode="elevated">
      <Card.Content>
        <Title style={[styles.sectionTitle, darkMode && styles.textDark]}>Credibility Indicators</Title>

        {[
          { key: 'sourceReliability', label: 'Source Reliability', desc: 'Reputation and trustworthiness' },
          { key: 'contentQuality', label: 'Content Quality', desc: 'Writing quality and structure' },
          { key: 'evidenceQuality', label: 'Evidence and References', desc: 'Supporting evidence and citations' },
          { key: 'languageTone', label: 'Language and Tone', desc: 'Sensationalism and emotional bias' },
          { key: 'factConsistency', label: 'Fact Consistency', desc: 'Consistency with known facts' },
          { key: 'headlineAnalysis', label: 'Headline Analysis', desc: 'Headline accuracy and clickbait' },
        ].map((item, index) => {
          const value = result[item.key as keyof AnalysisResult] as string;
          const score = getIndicatorScore(value);
          const color = getIndicatorColor(value);
          const label = getIndicatorLabel(value);

          return (
            <View key={item.key}>
              <View style={styles.indicatorItem}>
                <View style={styles.indicatorHeader}>
                  <Text style={[styles.indicatorName, darkMode && styles.textDark]}>{item.label}</Text>
                  <View style={styles.indicatorChipWrapper}>
                    <Chip
                      mode="flat"
                      style={[styles.indicatorChip, { backgroundColor: color }]}
                      textStyle={styles.indicatorChipText}
                    >
                      {label}
                    </Chip>
                  </View>
                </View>
                <Text style={[styles.indicatorDesc, darkMode && styles.textMuted]}>{item.desc}</Text>
                <View style={styles.indicatorBarContainer}>
                  <View style={[styles.indicatorBar, { width: `${score}%`, backgroundColor: color }]} />
                </View>
              </View>
              {index < 5 && <Divider style={[styles.divider, darkMode && styles.dividerDark]} />}
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );

  const renderAdvancedSection = () => {
    if (!result.dateStatus && !result.authorName && !result.imageStatus) {
      return (
        <Card style={[styles.card, darkMode && styles.cardDark]} mode="elevated">
          <Card.Content>
            <Title style={[styles.sectionTitle, darkMode && styles.textDark]}>Advanced Analysis</Title>
            <View style={styles.emptyContainer}>
              <IconButton
                icon="magnify"
                size={50}
                iconColor={darkMode ? '#666666' : '#CCCCCC'}
              />
              <Text style={[styles.emptyText, darkMode && styles.textMuted]}>
                No advanced verification data available
              </Text>
              <Text style={[styles.emptySubText, darkMode && styles.textMuted]}>
                This article may not have enough metadata for advanced analysis.
              </Text>
            </View>
          </Card.Content>
        </Card>
      );
    }

    return (
      <Card style={[styles.card, darkMode && styles.cardDark]} mode="elevated">
        <Card.Content>
          <Title style={[styles.sectionTitle, darkMode && styles.textDark]}>Advanced Analysis</Title>

          {result.dateStatus && (
            <>
              <List.Item
                title="Date Verification"
                titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
                description={result.dateMessage || 'No date information available'}
                descriptionStyle={[styles.listItemDesc, darkMode && styles.textMuted]}
                left={() => (
                  <List.Icon
                    icon={getStatusIcon(result.dateStatus)}
                    color={getStatusColor(result.dateStatus)}
                  />
                )}
                right={() => (
                  <View style={styles.advancedRight}>
                    <Chip
                      mode="flat"
                      style={[styles.statusChip, { backgroundColor: getStatusColor(result.dateStatus) }]}
                      textStyle={styles.statusChipText}
                    >
                      {getStatusLabel(result.dateStatus)}
                    </Chip>
                    {result.dateScore !== undefined && (
                      <Badge style={styles.scoreBadgeSmall}>
                        {Math.round(result.dateScore * 100)}%
                      </Badge>
                    )}
                  </View>
                )}
              />
              {result.publishDate && (
                <Text style={[styles.advancedSubText, darkMode && styles.textMuted]}>
                  Published: {result.publishDate}
                </Text>
              )}
              <Divider style={[styles.divider, darkMode && styles.dividerDark]} />
            </>
          )}

          {result.authorName && (
            <>
              <List.Item
                title="Author Credibility"
                titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
                description={result.authorMessage || 'No author information available'}
                descriptionStyle={[styles.listItemDesc, darkMode && styles.textMuted]}
                left={() => (
                  <List.Icon
                    icon="account"
                    color={getStatusColor(result.authorStatus || '')}
                  />
                )}
                right={() => (
                  <View style={styles.advancedRight}>
                    <Chip
                      mode="flat"
                      style={[styles.statusChip, { backgroundColor: getStatusColor(result.authorStatus || '') }]}
                      textStyle={styles.statusChipText}
                    >
                      {getStatusLabel(result.authorStatus || '')}
                    </Chip>
                    {result.authorCredibilityScore !== undefined && (
                      <Badge style={styles.scoreBadgeSmall}>
                        {Math.round(result.authorCredibilityScore * 100)}%
                      </Badge>
                    )}
                  </View>
                )}
              />
              <Text style={[styles.advancedSubText, darkMode && styles.textMuted]}>
                Author: {result.authorName}
              </Text>
              <Divider style={[styles.divider, darkMode && styles.dividerDark]} />
            </>
          )}

          {result.imageStatus && (
            <>
              <List.Item
                title="Image Verification"
                titleStyle={[styles.listItemTitle, darkMode && styles.textDark]}
                description={result.imageMessage || 'No image information available'}
                descriptionStyle={[styles.listItemDesc, darkMode && styles.textMuted]}
                left={() => (
                  <List.Icon
                    icon="image"
                    color={getStatusColor(result.imageStatus)}
                  />
                )}
                right={() => (
                  <View style={styles.advancedRight}>
                    <Chip
                      mode="flat"
                      style={[styles.statusChip, { backgroundColor: getStatusColor(result.imageStatus) }]}
                      textStyle={styles.statusChipText}
                    >
                      {getStatusLabel(result.imageStatus)}
                    </Chip>
                    <Badge style={styles.scoreBadgeSmall}>
                      {result.imageCount || 0}
                    </Badge>
                  </View>
                )}
              />
              {result.imageUrls && result.imageUrls.length > 0 && (
                <Text style={[styles.advancedSubText, darkMode && styles.textMuted]}>
                  {result.imageUrls.length} image(s) extracted
                </Text>
              )}
              <Divider style={[styles.divider, darkMode && styles.dividerDark]} />
            </>
          )}
        </Card.Content>
      </Card>
    );
  };

  const renderSourceSection = () => (
    <Card style={[styles.card, darkMode && styles.cardDark]} mode="elevated">
      <Card.Content>
        <Title style={[styles.sectionTitle, darkMode && styles.textDark]}>Source Reliability</Title>
        
        <View style={styles.sourceHeader}>
          <Text style={[styles.sourceName, darkMode && styles.textDark]}>
            {result.sourceName || 'Unknown Source'}
          </Text>
          <Chip mode="flat" style={styles.verifiedChip} textStyle={styles.verifiedChipText} compact>
            Verified
          </Chip>
        </View>

        <Text style={[styles.sourceDesc, darkMode && styles.textMuted]}>
          This source has a {result.sourceReliability?.toLowerCase() || 'unknown'} reputation for accurate reporting and fact-based journalism.
        </Text>

        <View style={[styles.sourceScoreRow, darkMode && styles.borderDark]}>
          <Text style={[styles.sourceScoreLabel, darkMode && styles.textMuted]}>Reliability Score</Text>
          <Badge style={styles.sourceScoreValue}>
            {result.sourceReliability === 'HIGH' ? '85%' : 
             result.sourceReliability === 'MEDIUM' ? '60%' : 
             result.sourceReliability === 'LOW' ? '35%' : 'Unknown'}
          </Badge>
        </View>
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
          <Text style={[styles.headerTitle, darkMode && styles.textDark]}>Analysis Report</Text>
          {renderShareMenu(
            headerMenuVisible,
            setHeaderMenuVisible,
            <IconButton
              icon="share-variant"
              size={24}
              onPress={() => setHeaderMenuVisible(true)}
              iconColor={darkMode ? '#FFFFFF' : '#1A2332'}
              disabled={shareLoading}
            />
          )}
        </View>
      </Surface>

      <ScrollView
        style={[styles.scrollView, darkMode && styles.scrollViewDark]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {renderScoreSection()}
        {renderIndicatorsSection()}
        {renderAdvancedSection()}
        {renderSourceSection()}

        {result.url && result.url !== 'User submitted text' && result.url !== 'Unknown' && (
          <Card style={[styles.readArticleCard, darkMode && styles.cardDark]} mode="elevated">
            <Card.Content>
              <Button
                mode="contained"
                onPress={handleReadFullArticle}
                style={styles.readArticleButton}
                labelStyle={styles.readArticleButtonLabel}
                buttonColor="#6200EE"
                icon="web"
              >
                Read Full Article
              </Button>
            </Card.Content>
          </Card>
        )}

        <View style={styles.footer}>
          <Text style={[styles.footerText, darkMode && styles.textMuted]}>
            Analyzed on: {result.createdAt ? new Date(result.createdAt).toLocaleString() : 'N/A'}
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
  card: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  cardDark: {
    backgroundColor: '#16213E',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A2332',
    marginBottom: 8,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreBadge: {
    backgroundColor: '#E8F0FE',
    color: '#1A2332',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  scoreBadgeDark: {
    backgroundColor: '#1A2332',
    color: '#FFFFFF',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  summarySurface: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F7FA',
    marginVertical: 12,
  },
  summarySurfaceDark: {
    backgroundColor: '#1A2332',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1A2332',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#34495E',
    lineHeight: 20,
  },
  verdictChip: {
    alignSelf: 'center',
    marginVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verdictChipText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 4,
    paddingHorizontal: 8,
    lineHeight: 20,
  },
  verdictDesc: {
    fontSize: 13,
    color: '#34495E',
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 4,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 4,
  },
  confidenceText: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  confidenceChip: {
    backgroundColor: '#E8F0FE',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  indicatorCount: {
    fontSize: 11,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 4,
  },
  indicatorItem: {
    paddingVertical: 8,
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
    flex: 1,
    marginRight: 8,
  },
  indicatorChipWrapper: {
    flexShrink: 0,
  },
  indicatorChip: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  indicatorChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  indicatorDesc: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  indicatorBarContainer: {
    height: 4,
    backgroundColor: '#E8ECF1',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  indicatorBar: {
    height: '100%',
    borderRadius: 2,
  },
  divider: {
    backgroundColor: '#F0F0F0',
  },
  dividerDark: {
    backgroundColor: '#2A3A4F',
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
  advancedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  statusChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  scoreBadgeSmall: {
    backgroundColor: '#6200EE',
    color: '#FFFFFF',
    fontSize: 10,
  },
  advancedSubText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
    paddingLeft: 16,
  },
  sourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sourceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A2332',
    flex: 1,
  },
  verifiedChip: {
    backgroundColor: '#4CAF50',
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  verifiedChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  sourceDesc: {
    fontSize: 13,
    color: '#34495E',
    lineHeight: 18,
    marginBottom: 12,
  },
  sourceScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  borderDark: {
    borderTopColor: '#2A3A4F',
  },
  sourceScoreLabel: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  sourceScoreValue: {
    backgroundColor: '#6200EE',
    color: '#FFFFFF',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  footer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: '#A0AEC0',
  },
  menu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  menuDark: {
    backgroundColor: '#16213E',
    borderWidth: 1,
    borderColor: '#333333',
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  menuContentDark: {
    backgroundColor: '#16213E',
  },
  menuItemText: {
    fontSize: 14,
    color: '#1A2332',
  },
  shareLoading: {
    padding: 8,
    alignItems: 'center',
  },
  shareIconSmall: {
    margin: 0,
    padding: 0,
  },
  readArticleCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  readArticleButton: {
    borderRadius: 8,
    paddingVertical: 4,
  },
  readArticleButtonLabel: {
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    marginTop: 8,
  },
  emptySubText: {
    fontSize: 13,
    color: '#A0AEC0',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default AnalysisDetailScreen;