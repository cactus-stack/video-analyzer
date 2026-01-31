import { RawMention } from './types';

// Constants
const MAX_TOKENS_PER_CHUNK = 20000; // Safe limit for Gemini context
const CHARS_PER_TOKEN = 3.5; // Average for Spanish/English
const MAX_CHUNK_CHARS = MAX_TOKENS_PER_CHUNK * CHARS_PER_TOKEN; // ~70K chars
const MAX_CHUNK_CHARS_LARGE = 45000; // ~13K tokens - for transcripts >200K (memory-efficient)
const LARGE_TRANSCRIPT_THRESHOLD = 200000; // Use smaller chunks above this
const OVERLAP_CHARS = 2000; // Overlap to avoid missing references at boundaries

interface TranscriptChunk {
  text: string;
  startChar: number;
  endChar: number;
  index: number;
  total: number;
}

/**
 * Check if transcript needs chunking
 */
export function needsChunking(transcript: string): boolean {
  return transcript.length > MAX_CHUNK_CHARS;
}

/**
 * Split large transcript into overlapping chunks
 * Tries to split at sentence boundaries for better context
 */
export function chunkTranscript(transcript: string): TranscriptChunk[] {
  if (!needsChunking(transcript)) {
    return [{
      text: transcript,
      startChar: 0,
      endChar: transcript.length,
      index: 0,
      total: 1,
    }];
  }

  // Use smaller chunks for very large transcripts to reduce memory usage
  const maxChunkChars = transcript.length > LARGE_TRANSCRIPT_THRESHOLD
    ? MAX_CHUNK_CHARS_LARGE
    : MAX_CHUNK_CHARS;

  const chunks: TranscriptChunk[] = [];
  let currentPos = 0;
  let chunkIndex = 0;

  while (currentPos < transcript.length) {
    // Calculate chunk boundaries
    let endPos = Math.min(currentPos + maxChunkChars, transcript.length);

    // If not at the end, try to find a sentence boundary
    if (endPos < transcript.length) {
      // Look for sentence ending within last 2000 chars of chunk
      const searchStart = Math.max(endPos - 2000, currentPos);
      const searchText = transcript.slice(searchStart, endPos);

      // Try to find sentence boundaries (. ! ?)
      const sentenceEndings = ['. ', '.\n', '! ', '!\n', '? ', '?\n'];
      let bestBoundary = -1;

      for (const ending of sentenceEndings) {
        const lastIndex = searchText.lastIndexOf(ending);
        if (lastIndex > bestBoundary) {
          bestBoundary = lastIndex + ending.length;
        }
      }

      // If found sentence boundary, use it
      if (bestBoundary > 0) {
        endPos = searchStart + bestBoundary;
      }
    }

    // Create chunk
    chunks.push({
      text: transcript.slice(currentPos, endPos),
      startChar: currentPos,
      endChar: endPos,
      index: chunkIndex,
      total: 0, // Will be updated after all chunks are created
    });

    // Move to next chunk (with overlap)
    currentPos = endPos - OVERLAP_CHARS;
    chunkIndex++;
  }

  // Update total count
  chunks.forEach(chunk => {
    chunk.total = chunks.length;
  });

  return chunks;
}

/**
 * Deduplicate mentions from overlapping chunks
 * Keeps mentions from earlier chunks when duplicates are found
 */
export function deduplicateChunkedMentions(
  chunkedMentions: RawMention[][]
): RawMention[] {
  const seen = new Set<string>();
  const deduplicated: RawMention[] = [];

  // Process chunks in order
  chunkedMentions.forEach((chunkMentions) => {
    chunkMentions.forEach((mention) => {
      // Create unique key based on type, text, and approximate timestamp
      const key = `${mention.type}:${mention.rawText.toLowerCase()}:${mention.timestamp}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(mention);
      }
    });
  });

  return deduplicated;
}

/**
 * Format chunk info for logging
 */
export function formatChunkInfo(chunk: TranscriptChunk): string {
  const sizeMB = (chunk.text.length / 1024 / 1024).toFixed(2);
  const tokens = Math.ceil(chunk.text.length / CHARS_PER_TOKEN);
  return `Chunk ${chunk.index + 1}/${chunk.total}: ${chunk.text.length} chars (~${tokens} tokens, ${sizeMB}MB)`;
}
