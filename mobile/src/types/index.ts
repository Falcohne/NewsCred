/**
 * NewsCred TypeScript Interfaces
 * Central location for all type definitions
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  username: string;
  premium: boolean;
  analysisCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthRequest {
  email: string;
  password: string;
  fullName?: string;
  username?: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  fullName: string;
  premium: boolean;
  analysisCount: number;
}

export type ReliabilityLevel = 'HIGH' | 'MEDIUM' | 'LOW';
export type ConfidenceLevel = 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
export type CredibilityVerdict = 'CREDIBLE' | 'LIKELY_CREDIBLE' | 'UNSURE' | 'MISLEADING' | 'NOT_CREDIBLE';
export type DateStatus = 'RECENT' | 'MODERATELY_OLD' | 'OUTDATED' | 'DATE_UNKNOWN';
export type AuthorStatus = 'TRUSTED' | 'REPUTABLE_ORG' | 'UNKNOWN_AUTHOR' | 'UNKNOWN';
export type ImageStatus = 'VERIFIED' | 'NO_IMAGES' | 'STOCK_PHOTOS' | 'AI_GENERATED' | 'MANIPULATED' | 'NEEDS_REVIEW';

export interface Article {
  id: string;
  title: string;
  content: string;
  url?: string;
  sourceName: string;
  sourceReliability: ReliabilityLevel;
  contentQuality: ReliabilityLevel;
  evidenceQuality: ReliabilityLevel;
  languageTone: ReliabilityLevel;
  factConsistency: ReliabilityLevel;
  headlineAnalysis: ReliabilityLevel;
  overallScore: number;
  confidenceLevel: ConfidenceLevel;
  credibilityVerdict: CredibilityVerdict;
  analysisSummary: string;
  summary?: string;
  userId: string;
  publishDate?: string;
  dateStatus?: DateStatus;
  dateScore?: number;
  dateMessage?: string;
  authorName?: string;
  authorCredibilityScore?: number;
  authorStatus?: AuthorStatus;
  authorMessage?: string;
  imageCount?: number;
  imageScore?: number;
  imageStatus?: ImageStatus;
  imageMessage?: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ArticleAnalysisRequest {
  userId: string;
  url?: string;
  content?: string;
}

export interface ArticleAnalysisResponse {
  error: boolean;
  message?: string;
  articleId?: string;
  overallScore: number;
  confidenceLevel: ConfidenceLevel;
  credibilityVerdict: CredibilityVerdict;
  analysisSummary: string;
  summary?: string;
  sourceReliability: ReliabilityLevel;
  contentQuality: ReliabilityLevel;
  evidenceQuality: ReliabilityLevel;
  languageTone: ReliabilityLevel;
  factConsistency: ReliabilityLevel;
  headlineAnalysis: ReliabilityLevel;
  imageCount?: number;
  createdAt?: string;
  publishDate?: string;
  dateStatus?: DateStatus;
  dateScore?: number;
  dateMessage?: string;
  authorName?: string;
  authorCredibilityScore?: number;
  authorStatus?: AuthorStatus;
  authorMessage?: string;
  imageStatus?: ImageStatus;
  imageMessage?: string;
  imageUrls?: string[];
}

export interface SourceStats {
  name: string;
  totalScore: number;
  count: number;
  averageScore: number;
  mostCommonVerdict: CredibilityVerdict;
  verdicts: Record<CredibilityVerdict, number>;
}

export interface SourceDatabaseResponse {
  sources: SourceStats[];
  totalSources: number;
  totalArticles: number;
  averageScore: number;
}

export interface ScoreDistribution {
  CREDIBLE: number;
  LIKELY_CREDIBLE: number;
  UNSURE: number;
  MISLEADING: number;
  NOT_CREDIBLE: number;
}

export interface TopSource {
  name: string;
  count: number;
  averageScore: number;
}

export interface RecentActivity {
  id: string;
  title: string;
  score: number;
  verdict: CredibilityVerdict;
  date: string;
}

export interface StatisticsData {
  totalArticles: number;
  averageScore: number;
  totalSources: number;
  isPremium: boolean;
  scoreDistribution: ScoreDistribution;
  topSources: TopSource[];
  recentActivity: RecentActivity[];
}

export interface CustomAlertProps {
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

export interface SidebarProps {
  activeTab: string;
  onTabPress: (tab: string) => void;
  onUpgradePress?: () => void;
}

export interface WebScrollViewProps {
  children: React.ReactNode;
  style?: any;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Dashboard: undefined;
  Settings: undefined;
  SourceDatabase: undefined;
  Statistics: undefined;
  SavedArticles: undefined;
  AnalysisDetail: {
    result: ArticleAnalysisResponse;
  };
};

export interface ApiErrorResponse {
  message: string;
  status?: number;
  errors?: string[];
}

export interface ApiSuccessResponse<T = any> {
  data: T;
  message?: string;
  status: number;
}

export interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
}

export type VerdictColorMap = {
  [key in CredibilityVerdict]: string;
};

export type ScoreColorMap = {
  [key: number]: string;
};

export type IndicatorScoreMap = {
  [key in ReliabilityLevel]: number;
};

export const VERDICT_COLORS: VerdictColorMap = {
  CREDIBLE: '#2ecc71',
  LIKELY_CREDIBLE: '#27ae60',
  UNSURE: '#f39c12',
  MISLEADING: '#e67e22',
  NOT_CREDIBLE: '#e74c3c',
};

export const INDICATOR_SCORES: IndicatorScoreMap = {
  HIGH: 85,
  MEDIUM: 60,
  LOW: 35,
};

export const INDICATOR_LABELS: Record<ReliabilityLevel, string> = {
  HIGH: 'High',
  MEDIUM: 'Moderate',
  LOW: 'Low',
};

export const STATUS_ICONS: Record<string, string> = {
  RECENT: 'Recent',
  MODERATELY_OLD: 'Moderately Old',
  OUTDATED: 'Outdated',
  DATE_UNKNOWN: 'Unknown',
  TRUSTED: 'Trusted',
  REPUTABLE_ORG: 'Reputable',
  UNKNOWN_AUTHOR: 'Unknown Author',
  UNKNOWN: 'Unknown',
  VERIFIED: 'Verified',
  NO_IMAGES: 'No Images',
  STOCK_PHOTOS: 'Stock Photos',
  AI_GENERATED: 'AI Generated',
  MANIPULATED: 'Manipulated',
  NEEDS_REVIEW: 'Needs Review',
};

export const STATUS_COLORS: Record<string, string> = {
  RECENT: '#2ecc71',
  MODERATELY_OLD: '#f39c12',
  OUTDATED: '#e74c3c',
  DATE_UNKNOWN: '#95a5a6',
  TRUSTED: '#2ecc71',
  REPUTABLE_ORG: '#2ecc71',
  UNKNOWN_AUTHOR: '#f39c12',
  UNKNOWN: '#95a5a6',
  VERIFIED: '#2ecc71',
  NO_IMAGES: '#95a5a6',
  STOCK_PHOTOS: '#f39c12',
  AI_GENERATED: '#e67e22',
  MANIPULATED: '#e74c3c',
  NEEDS_REVIEW: '#f39c12',
};

export const getVerdictColor = (verdict: CredibilityVerdict): string => {
  return VERDICT_COLORS[verdict] || '#7f8c8d';
};

export const getScoreColor = (score: number): string => {
  if (score >= 70) return '#2ecc71';
  if (score >= 50) return '#f39c12';
  return '#e74c3c';
};

export const getIndicatorLabel = (level: ReliabilityLevel): string => {
  return INDICATOR_LABELS[level] || level;
};

export const getIndicatorScore = (level: ReliabilityLevel): number => {
  return INDICATOR_SCORES[level] || 50;
};

export const getStatusIcon = (status: string): string => {
  return STATUS_ICONS[status] || 'Unknown';
};

export const getStatusColor = (status: string): string => {
  return STATUS_COLORS[status] || '#95a5a6';
};