import { Analysis, AuthCredentials } from './types';

// Keys for localStorage
const HISTORY_KEY = 'youtube-analyzer-history';
const AUTH_KEY = 'youtube-analyzer-auth';

/**
 * Save an analysis to localStorage
 */
export function saveAnalysis(analysis: Analysis): void {
  if (typeof window === 'undefined') return;

  try {
    const history = getHistory();
    history.unshift(analysis); // Add to beginning

    // Keep only last 50 analyses
    const trimmed = history.slice(0, 50);

    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Error saving analysis:', error);
  }
}

/**
 * Get all analyses from history
 */
export function getHistory(): Analysis[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];

    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
}

/**
 * Search history by query (searches in video title, channel, book titles, authors)
 */
export function searchHistory(query: string): Analysis[] {
  const history = getHistory();
  if (!query.trim()) return history;

  const lowerQuery = query.toLowerCase();

  return history.filter((analysis) => {
    // Search in video metadata
    if (
      analysis.videoTitle.toLowerCase().includes(lowerQuery) ||
      analysis.channel.toLowerCase().includes(lowerQuery)
    ) {
      return true;
    }

    // Search in books
    const inBooks = analysis.results.books.some(
      (book) =>
        book.fullTitle.toLowerCase().includes(lowerQuery) ||
        book.author.toLowerCase().includes(lowerQuery) ||
        book.rawMention.toLowerCase().includes(lowerQuery)
    );

    if (inBooks) return true;

    // Search in papers
    const inPapers = analysis.results.papers.some(
      (paper) =>
        paper.fullTitle.toLowerCase().includes(lowerQuery) ||
        paper.authors.some((author) => author.toLowerCase().includes(lowerQuery))
    );

    if (inPapers) return true;

    // Search in web sources
    const inWebSources = analysis.results.webSources.some(
      (source) =>
        source.title.toLowerCase().includes(lowerQuery) ||
        source.rawMention.toLowerCase().includes(lowerQuery)
    );

    if (inWebSources) return true;

    // Search in authors
    const inAuthors = analysis.results.authors.some((author) =>
      author.name.toLowerCase().includes(lowerQuery)
    );

    return inAuthors;
  });
}

/**
 * Delete an analysis by ID
 */
export function deleteAnalysis(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const history = getHistory();
    const filtered = history.filter((a) => a.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting analysis:', error);
  }
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}

/**
 * Get stored auth credentials
 */
export function getAuthCredentials(): AuthCredentials {
  if (typeof window === 'undefined') {
    return { mode: null };
  }

  try {
    const stored = localStorage.getItem(AUTH_KEY);
    if (!stored) return { mode: null };

    return JSON.parse(stored);
  } catch (error) {
    console.error('Error getting auth credentials:', error);
    return { mode: null };
  }
}

/**
 * Save auth credentials
 */
export function saveAuthCredentials(creds: AuthCredentials): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(AUTH_KEY, JSON.stringify(creds));
  } catch (error) {
    console.error('Error saving auth credentials:', error);
  }
}

/**
 * Clear auth credentials
 */
export function clearAuthCredentials(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (error) {
    console.error('Error clearing auth credentials:', error);
  }
}

/**
 * Get a specific analysis by ID
 */
export function getAnalysisById(id: string): Analysis | null {
  const history = getHistory();
  return history.find((a) => a.id === id) || null;
}
