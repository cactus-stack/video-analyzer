import { GoogleGenAI, MediaResolution } from '@google/genai';
import { RawMention, Book, Paper, WebSource, Author } from './types';
import { STEP1_EXTRACTION_PROMPT, getStep2CompletionPrompt } from './prompt';

/**
 * Sleep utility for retry delays
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Analyze transcript text and extract raw mentions (much cheaper than video)
 */
export async function analyzeTranscript(
  transcript: string,
  transcriptChunks: Array<{ text: string; offset: number; duration: number }>,
  apiKey: string
): Promise<RawMention[]> {
  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      // Build a prompt with the full transcript
      const prompt = `${STEP1_EXTRACTION_PROMPT}

TRANSCRIPCIÓN DEL VIDEO:
${transcript}

IMPORTANTE: Para cada mención, intenta encontrar el timestamp aproximado buscando el texto en los chunks de transcripción.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [prompt],
        config: {
          temperature: 0.4,
        },
      });

      const text = result.text || '';

      // Parse JSON response
      const rawMentions = parseRawMentions(text);

      // Try to match timestamps using transcript chunks
      const mentionsWithTimestamps = rawMentions.map(mention => {
        // Find the chunk that contains this mention
        const matchingChunk = transcriptChunks.find(chunk =>
          chunk.text.toLowerCase().includes(mention.rawText.toLowerCase()) ||
          chunk.text.toLowerCase().includes(mention.context.toLowerCase())
        );

        if (matchingChunk) {
          const minutes = Math.floor(matchingChunk.offset / 60);
          const seconds = matchingChunk.offset % 60;
          return {
            ...mention,
            timestamp: `${minutes}:${seconds.toString().padStart(2, '0')}`,
          };
        }

        return mention;
      });

      return mentionsWithTimestamps;
    } catch (error: any) {
      lastError = error;
      console.error(`Error analyzing transcript (attempt ${attempt}/${MAX_RETRIES}):`, error.message);

      const isRetryable =
        error.message?.includes('fetch failed') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('timeout') ||
        error.message?.includes('429') ||
        error.message?.includes('503');

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw new Error(`Failed to analyze transcript after ${attempt} attempts: ${error.message}`);
      }

      const delayMs = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delayMs / 1000}s...`);
      await sleep(delayMs);
    }
  }

  throw new Error(`Failed to analyze transcript: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Analyze a video segment and extract raw mentions (with retry logic)
 */
export async function analyzeVideoSegment(
  videoUrl: string,
  apiKey: string,
  startOffset?: number,
  endOffset?: number,
  resolution: 'normal' | 'low' = 'low'
): Promise<RawMention[]> {
  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      // Prepare video file part with mediaResolution
      // LOW = 70 tokens/frame (~$0.18/hour), MEDIUM/HIGH = 258 tokens/frame (~$0.54/hour)
      const videoPart: any = {
        inlineData: {
          mimeType: 'video/*',
          data: videoUrl, // For YouTube URLs, the SDK handles it
        },
        mediaResolution: resolution === 'low'
          ? MediaResolution.MEDIA_RESOLUTION_LOW
          : MediaResolution.MEDIA_RESOLUTION_MEDIUM,
      };

      // Add video metadata for segmentation if offsets provided
      if (startOffset !== undefined && endOffset !== undefined) {
        videoPart.videoMetadata = {
          startOffset: { seconds: startOffset },
          endOffset: { seconds: endOffset },
        };
      }

      const result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [videoPart, STEP1_EXTRACTION_PROMPT],
        config: {
          temperature: 0.4,
        },
      });

      const text = result.text || '';

      // Parse JSON response
      return parseRawMentions(text);
    } catch (error: any) {
      lastError = error;
      console.error(`Error analyzing video segment (attempt ${attempt}/${MAX_RETRIES}):`, error.message);

      // Check if it's a retryable error
      const isRetryable =
        error.message?.includes('fetch failed') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('timeout') ||
        error.message?.includes('429') ||
        error.message?.includes('503');

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw new Error(`Failed to analyze video after ${attempt} attempts: ${error.message}`);
      }

      // Exponential backoff: 2s, 4s, 8s
      const delayMs = Math.pow(2, attempt) * 1000;
      console.log(`Retrying in ${delayMs / 1000}s...`);
      await sleep(delayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error(`Failed to analyze video: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Complete a reference with Google Search grounding (with retry logic)
 */
export async function completeReferenceWithSearch(
  rawMention: RawMention,
  apiKey: string
): Promise<any> {
  const MAX_RETRIES = 3;
  const REQUEST_TIMEOUT = 45000; // 45 seconds timeout per request
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const prompt = getStep2CompletionPrompt(
        rawMention.rawText,
        rawMention.context,
        rawMention.type
      );

      console.log(`[completeReference] Attempting: "${rawMention.rawText}" (attempt ${attempt}/${MAX_RETRIES})`);

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), REQUEST_TIMEOUT);
      });

      // Race between actual request and timeout
      const result = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [prompt],
          config: {
            temperature: 0.3, // Lower temperature for more factual responses
            // TODO: Re-enable grounding once we verify the format
            // tools: [{ googleSearch: {} }],
          },
        }),
        timeoutPromise,
      ]) as any;

      const text = result.text || '';
      console.log(`[completeReference] ✓ Success: "${rawMention.rawText}"`);

      // Parse JSON response
      return parseCompletedReference(text);
    } catch (error: any) {
      lastError = error;
      console.error(`[completeReference] ✗ Error on "${rawMention.rawText}":`, error.message);

      // Check if it's a retryable error
      const isRetryable =
        error.message?.includes('503') ||
        error.message?.includes('overloaded') ||
        error.message?.includes('429') ||
        error.message?.includes('Service Unavailable') ||
        error.message?.includes('fetch failed');

      if (!isRetryable || attempt === MAX_RETRIES) {
        console.error(`Error completing reference after ${attempt} attempts:`, error.message);
        // Return fallback data
        return {
          fullTitle: rawMention.rawText,
          author: 'Unknown',
          sources: [],
        };
      }

      // Exponential backoff: 3s, 6s, 12s
      const delayMs = Math.pow(2, attempt) * 1500;
      console.log(`Retrying reference completion in ${delayMs / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`);
      await sleep(delayMs);
    }
  }

  // Fallback
  return {
    fullTitle: rawMention.rawText,
    author: 'Unknown',
    sources: [],
  };
}

/**
 * Complete a batch of references in a single mega-request
 */
async function completeBatchMegaRequest(
  rawMentions: RawMention[],
  apiKey: string,
  batchIndex: number
): Promise<Map<string, any>> {
  const MAX_RETRIES = 2;
  const REQUEST_TIMEOUT = 60000; // 60 seconds for mega-requests

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      // Build mega prompt with all mentions in this batch
      const mentionsText = rawMentions.map((m, idx) =>
        `${idx + 1}. "${m.rawText}" (${m.type}) - Contexto: ${m.context}`
      ).join('\n');

      const prompt = `Completa la información de TODAS estas referencias mencionadas en un video:

${mentionsText}

Para cada referencia, proporciona:
- Título completo (si es libro/paper)
- Autor(es)
- Año (si aplica)
- Fuentes de verificación (URLs reales si es posible)

Retorna SOLO un objeto JSON con este formato exacto:
{
  "references": [
    {
      "index": 0,
      "fullTitle": "Título completo",
      "author": "Autor principal",
      "authors": ["Autor 1", "Autor 2"],
      "year": "Año",
      "journal": "Nombre de la revista (solo para papers)",
      "sources": ["url1", "url2"]
    }
  ]
}

IMPORTANTE: Incluye TODAS las referencias (${rawMentions.length} en total), no te saltes ninguna.`;

      console.log(`  [mega-batch ${batchIndex}] Attempting ${rawMentions.length} references (attempt ${attempt}/${MAX_RETRIES})...`);

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Mega-request timeout')), REQUEST_TIMEOUT);
      });

      // Race between actual request and timeout
      const result = await Promise.race([
        ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [prompt],
          config: {
            temperature: 0.3,
            // TODO: Re-enable grounding once we verify the format
            // tools: [{ googleSearch: {} }],
          },
        }),
        timeoutPromise,
      ]) as any;

      const text = result.text || '';

      // Parse the mega response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const results = new Map<string, any>();

      // Map results back to mentions
      parsed.references?.forEach((ref: any) => {
        const mention = rawMentions[ref.index];
        if (mention) {
          results.set(JSON.stringify(mention), ref);
        }
      });

      console.log(`  [mega-batch ${batchIndex}] ✓ Completed ${results.size}/${rawMentions.length} references`);
      return results;

    } catch (error: any) {
      console.error(`  [mega-batch ${batchIndex}] ✗ Error (attempt ${attempt}/${MAX_RETRIES}):`, error.message);

      if (attempt === MAX_RETRIES) {
        // Fallback: process individually
        console.log(`  [mega-batch ${batchIndex}] Falling back to individual processing...`);
        const fallbackResults = new Map<string, any>();

        for (const mention of rawMentions) {
          try {
            const data = await completeReferenceWithSearch(mention, apiKey);
            fallbackResults.set(JSON.stringify(mention), data);
          } catch (err) {
            fallbackResults.set(JSON.stringify(mention), {
              fullTitle: mention.rawText,
              author: 'Unknown',
              sources: [],
            });
          }
        }

        return fallbackResults;
      }

      const delayMs = Math.pow(2, attempt) * 1000;
      await sleep(delayMs);
    }
  }

  return new Map();
}

/**
 * INTELLIGENT BATCHING: Complete references using optimal mega-request batching
 * Scales from 10 to 200+ references efficiently
 */
export async function batchCompleteReferencesIntelligent(
  rawMentions: RawMention[],
  apiKey: string,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, any>> {
  const MEGA_BATCH_SIZE = 18; // Optimal: 15-20 mentions per mega-request
  const PARALLEL_MEGA_BATCHES = 2; // Process 2 mega-requests in parallel
  const results = new Map<string, any>();

  // Create mega-batches
  const megaBatches: RawMention[][] = [];
  for (let i = 0; i < rawMentions.length; i += MEGA_BATCH_SIZE) {
    megaBatches.push(rawMentions.slice(i, Math.min(i + MEGA_BATCH_SIZE, rawMentions.length)));
  }

  console.log(`  → Intelligent batching: ${megaBatches.length} mega-batches (${MEGA_BATCH_SIZE} items each, ${PARALLEL_MEGA_BATCHES} in parallel)`);

  // Process mega-batches in parallel groups
  for (let i = 0; i < megaBatches.length; i += PARALLEL_MEGA_BATCHES) {
    const parallelMegaBatches = megaBatches.slice(i, Math.min(i + PARALLEL_MEGA_BATCHES, megaBatches.length));
    const groupIndex = Math.floor(i / PARALLEL_MEGA_BATCHES) + 1;
    const totalGroups = Math.ceil(megaBatches.length / PARALLEL_MEGA_BATCHES);

    console.log(`[intelligentBatch] Processing group ${groupIndex}/${totalGroups} (${parallelMegaBatches.length} mega-batches in parallel)`);

    // Process multiple mega-batches in parallel
    const parallelPromises = parallelMegaBatches.map((megaBatch, idx) =>
      completeBatchMegaRequest(megaBatch, apiKey, i + idx + 1)
    );

    // Wait for all parallel mega-batches to complete
    const parallelResults = await Promise.all(parallelPromises);

    // Merge results
    parallelResults.forEach((batchResults) => {
      batchResults.forEach((value, key) => {
        results.set(key, value);
      });
    });

    // Update progress
    if (onProgress) {
      const completed = Math.min((i + PARALLEL_MEGA_BATCHES) * MEGA_BATCH_SIZE, rawMentions.length);
      onProgress(completed, rawMentions.length);
    }

    // Small delay between groups
    if (i + PARALLEL_MEGA_BATCHES < megaBatches.length) {
      await sleep(1500);
    }
  }

  console.log(`✓ Intelligent batching completed: ${results.size}/${rawMentions.length} references`);
  return results;
}

/**
 * Complete ALL references in a single request (only for small videos)
 * @deprecated Use batchCompleteReferencesIntelligent for better reliability
 */
export async function completeAllReferencesAtOnce(
  rawMentions: RawMention[],
  apiKey: string
): Promise<Map<string, any>> {
  console.log(`  → Single mega-request for ${rawMentions.length} references...`);
  return completeBatchMegaRequest(rawMentions, apiKey, 1);
}

/**
 * Batch complete multiple references with parallel batch processing
 * Optimized for large videos: processes multiple batches simultaneously
 */
export async function batchCompleteReferences(
  rawMentions: RawMention[],
  apiKey: string,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, any>> {
  const BATCH_SIZE = 10; // Items per batch (reduced from 15)
  const PARALLEL_BATCHES = 2; // Process 2 batches simultaneously (reduced from 3 to avoid rate limiting)
  const results = new Map<string, any>();

  // Create all batches
  const batches: RawMention[][] = [];
  for (let i = 0; i < rawMentions.length; i += BATCH_SIZE) {
    batches.push(rawMentions.slice(i, Math.min(i + BATCH_SIZE, rawMentions.length)));
  }

  console.log(`  → Processing ${batches.length} batches (${BATCH_SIZE} items each, ${PARALLEL_BATCHES} batches in parallel, staggered requests)`);

  // Process batches in parallel groups
  for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
    const parallelBatches = batches.slice(i, Math.min(i + PARALLEL_BATCHES, batches.length));
    const batchGroupIndex = Math.floor(i / PARALLEL_BATCHES) + 1;
    const totalBatchGroups = Math.ceil(batches.length / PARALLEL_BATCHES);

    console.log(`[batchComplete] Processing batch group ${batchGroupIndex}/${totalBatchGroups} (${parallelBatches.length} batches in parallel)`);

    // Process multiple batches in parallel
    const parallelPromises = parallelBatches.map(async (batch, batchIndex) => {
      console.log(`  [batch ${i + batchIndex + 1}] Starting ${batch.length} references...`);

      // Process items in batch with slight delay to avoid rate limiting
      const batchPromises = batch.map((mention, idx) =>
        sleep(idx * 200) // Stagger requests by 200ms each
          .then(() => completeReferenceWithSearch(mention, apiKey))
          .then((data) => ({ mention, data }))
          .catch((error) => {
            console.error(`  [batch ${i + batchIndex + 1}] Error on "${mention.rawText}":`, error.message);
            return {
              mention,
              data: { fullTitle: mention.rawText, author: 'Unknown', sources: [] },
            };
          })
      );

      const results = await Promise.all(batchPromises);
      console.log(`  [batch ${i + batchIndex + 1}] ✓ Completed ${results.length} references`);
      return results;
    });

    // Wait for all parallel batches to complete
    console.log(`  [batchComplete] Waiting for ${parallelPromises.length} parallel batches...`);
    const parallelResults = await Promise.all(parallelPromises);
    console.log(`  [batchComplete] ✓ Batch group ${batchGroupIndex} completed`);

    // Flatten and store results
    parallelResults.flat().forEach(({ mention, data }) => {
      results.set(JSON.stringify(mention), data);
    });

    // Update progress
    if (onProgress) {
      const completed = Math.min((i + PARALLEL_BATCHES) * BATCH_SIZE, rawMentions.length);
      onProgress(completed, rawMentions.length);
    }

    // Small delay between parallel batch groups to avoid overwhelming API
    if (i + PARALLEL_BATCHES < batches.length) {
      await sleep(2000); // 2s delay between groups to avoid rate limiting
    }
  }

  return results;
}

/**
 * Parse raw mentions from JSON response
 */
function parseRawMentions(text: string): RawMention[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', text);
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.rawMentions || !Array.isArray(parsed.rawMentions)) {
      console.error('Invalid structure:', parsed);
      return [];
    }

    return parsed.rawMentions;
  } catch (error) {
    console.error('Error parsing raw mentions:', error, text);
    return [];
  }
}

/**
 * Parse completed reference from JSON response
 */
function parseCompletedReference(text: string): any {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in completion response:', text);
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error parsing completed reference:', error, text);
    return null;
  }
}

/**
 * Merge raw mentions with completed data
 */
export function mergeReferences(
  rawMentions: RawMention[],
  completedData: Map<string, any>
): {
  books: Book[];
  papers: Paper[];
  webSources: WebSource[];
  authors: Author[];
} {
  const books: Book[] = [];
  const papers: Paper[] = [];
  const webSources: WebSource[] = [];
  const authors: Author[] = [];

  rawMentions.forEach((mention) => {
    const key = JSON.stringify(mention);
    const completed = completedData.get(key);

    if (!completed) return;

    // Determine confidence based on completion quality
    const confidence = determineConfidence(completed);

    if (mention.type === 'book') {
      books.push({
        rawMention: mention.rawText,
        fullTitle: completed.fullTitle || mention.rawText,
        author: completed.author || 'Unknown',
        year: completed.year,
        timestamp: mention.timestamp,
        confidence,
        sources: completed.sources || [],
      });
    } else if (mention.type === 'paper') {
      papers.push({
        rawMention: mention.rawText,
        fullTitle: completed.fullTitle || mention.rawText,
        authors: completed.authors || ['Unknown'],
        year: completed.year,
        journal: completed.journal,
        timestamp: mention.timestamp,
        confidence,
        sources: completed.sources || [],
      });
    } else if (mention.type === 'web') {
      webSources.push({
        rawMention: mention.rawText,
        title: completed.title || mention.rawText,
        url: completed.url || '',
        timestamp: mention.timestamp,
        confidence,
      });
    } else if (mention.type === 'author' || mention.type === 'concept') {
      authors.push({
        name: completed.fullName || mention.rawText,
        context: mention.context,
        timestamp: mention.timestamp,
      });
    }
  });

  return { books, papers, webSources, authors };
}

/**
 * Determine confidence level based on completed data quality
 */
function determineConfidence(completed: any): 'high' | 'medium' | 'low' {
  if (!completed) return 'low';

  const hasSources = completed.sources && completed.sources.length > 0;
  const hasYear = completed.year && completed.year !== 'Unknown';
  const hasAuthor = completed.author && completed.author !== 'Unknown';

  if (hasSources && hasYear && hasAuthor) return 'high';
  if (hasSources || (hasYear && hasAuthor)) return 'medium';

  return 'low';
}
