import { VideoSegment } from './types';

// Constants
const MAX_SEGMENT_DURATION = 3600; // 1 hour in seconds (~400K tokens @ 70/frame low res)
const OVERLAP_SECONDS = 30; // Small overlap to avoid missing references at boundaries

/**
 * Calculate video segments for long videos
 * Splits videos longer than 3 hours into chunks
 */
export function calculateSegments(durationInSeconds: number): VideoSegment[] {
  // If video is short enough, return single segment
  if (durationInSeconds <= MAX_SEGMENT_DURATION) {
    return [
      {
        startOffset: 0,
        endOffset: durationInSeconds,
        index: 0,
        total: 1,
      },
    ];
  }

  // Calculate number of segments needed
  const numSegments = Math.ceil(durationInSeconds / MAX_SEGMENT_DURATION);
  const segments: VideoSegment[] = [];

  for (let i = 0; i < numSegments; i++) {
    const startOffset = i === 0 ? 0 : i * MAX_SEGMENT_DURATION - OVERLAP_SECONDS;
    const endOffset = Math.min((i + 1) * MAX_SEGMENT_DURATION, durationInSeconds);

    segments.push({
      startOffset,
      endOffset,
      index: i,
      total: numSegments,
    });
  }

  return segments;
}

/**
 * Convert custom time ranges to segments
 */
export function customRangesToSegments(
  ranges: { start: number; end: number }[]
): VideoSegment[] {
  return ranges.map((range, index) => ({
    startOffset: range.start,
    endOffset: range.end,
    index,
    total: ranges.length,
  }));
}

/**
 * Estimate token count for a video segment
 * Based on research: ~100 tokens/second for low resolution, ~300 for normal
 */
export function estimateTokens(
  durationInSeconds: number,
  resolution: 'normal' | 'low' = 'low'
): number {
  const tokensPerSecond = resolution === 'low' ? 100 : 300;
  return Math.ceil(durationInSeconds * tokensPerSecond);
}

/**
 * Format segment description for UI
 */
export function formatSegmentDescription(segment: VideoSegment): string {
  const start = formatTime(segment.startOffset);
  const end = formatTime(segment.endOffset);
  return `Segmento ${segment.index + 1}/${segment.total}: ${start} - ${end}`;
}

/**
 * Format seconds to HH:MM:SS
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
