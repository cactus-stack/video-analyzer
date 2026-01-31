// Core reference types
export interface Book {
  rawMention: string;
  fullTitle: string;
  author: string;
  year?: string;
  timestamp: string;
  confidence: 'high' | 'medium' | 'low';
  searchQuery?: string;
  sources: string[];
}

export interface Paper {
  rawMention: string;
  fullTitle: string;
  authors: string[];
  year?: string;
  journal?: string;
  timestamp: string;
  confidence: 'high' | 'medium' | 'low';
  sources: string[];
}

export interface WebSource {
  rawMention: string;
  title: string;
  url: string;
  timestamp: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface Author {
  name: string;
  context: string;
  timestamp: string;
}

// Analysis result structure
export interface AnalysisResults {
  books: Book[];
  papers: Paper[];
  webSources: WebSource[];
  authors: Author[];
}

// Storage schema for localStorage
export interface Analysis {
  id: string;
  videoId: string;
  videoUrl: string;
  videoTitle: string;
  channel: string;
  duration: number;
  analyzedAt: string;
  authMethod: 'user' | 'friends' | 'owner';
  results: AnalysisResults;
}

// API Request types
export interface AnalyzeRequest {
  videoUrl: string;
  userApiKey?: string;
  accessPassword?: string;
  analysisMode: 'transcript' | 'video' | 'raw'; // transcript (default), video (visual), raw (no step 2)
  mode: 'auto' | 'custom'; // auto segmentation or custom ranges
  segments?: { start: number; end: number }[];
  resolution?: 'normal' | 'low';
  completeReferences?: boolean; // Optional step 2 (ignored if analysisMode is 'raw')
}

// API Response types
export interface AnalyzeResponse {
  results: AnalysisResults;
  usage?: {
    hoursUsed: number;
    limit: number;
    hoursRemaining: number;
  };
  videoTitle: string;
  channel: string;
  duration: number;
  videoId: string;
}

// Raw mention from step 1
export interface RawMention {
  type: 'book' | 'paper' | 'author' | 'concept' | 'web';
  rawText: string;
  context: string;
  timestamp: string;
}

// Auth credentials
export interface AuthCredentials {
  mode: 'apikey' | 'password' | null;
  apiKey?: string;
  password?: string;
}

// Usage stats
export interface DailyStats {
  date: string;
  hours: number;
}

// Video segment
export interface VideoSegment {
  startOffset: number;
  endOffset: number;
  index: number;
  total: number;
}
