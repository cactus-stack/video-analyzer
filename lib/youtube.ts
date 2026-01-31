/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Format: youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
      return urlObj.searchParams.get('v');
    }

    // Format: youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }

    // Format: youtube.com/embed/VIDEO_ID
    if (urlObj.pathname.startsWith('/embed/')) {
      return urlObj.pathname.split('/')[2];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validate if URL is a valid YouTube URL
 */
export function validateYouTubeUrl(url: string): boolean {
  const videoId = extractVideoId(url);
  return videoId !== null && videoId.length === 11;
}

/**
 * Get video duration by fetching YouTube page and parsing metadata
 * This method doesn't require API keys
 */
export async function getVideoDuration(url: string): Promise<number | null> {
  try {
    const videoId = extractVideoId(url);
    if (!videoId) return null;

    // Fetch YouTube page HTML
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Extract duration from ytInitialPlayerResponse JSON
    const match = html.match(/"lengthSeconds":"(\d+)"/);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }

    // Fallback: try to find duration in other formats
    const durationMatch = html.match(/"approxDurationMs":"(\d+)"/);
    if (durationMatch && durationMatch[1]) {
      return Math.floor(parseInt(durationMatch[1], 10) / 1000);
    }

    return null;
  } catch (error) {
    console.error('Error getting video duration:', error);
    return null;
  }
}

/**
 * Get video title and channel using oEmbed API (no API key required)
 */
export async function getVideoMetadata(url: string): Promise<{
  title: string;
  channel: string;
} | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    );

    if (!response.ok) return null;

    const data = await response.json();
    return {
      title: data.title || 'Unknown Video',
      channel: data.author_name || 'Unknown Channel',
    };
  } catch {
    return null;
  }
}

/**
 * Format timestamp in seconds to MM:SS or HH:MM:SS
 */
export function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse timestamp string (MM:SS or HH:MM:SS) to seconds
 */
export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':').map(p => parseInt(p, 10));

  if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return 0;
}

/**
 * Generate YouTube URL with timestamp
 */
export function getYouTubeUrlWithTimestamp(videoUrl: string, timestamp: string): string {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) return videoUrl;

  const seconds = parseTimestamp(timestamp);
  return `https://www.youtube.com/watch?v=${videoId}&t=${seconds}s`;
}

