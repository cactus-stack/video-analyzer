import { GoogleGenerativeAI } from '@google/generative-ai';
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
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

      // Build a prompt with the full transcript
      const prompt = `${STEP1_EXTRACTION_PROMPT}

TRANSCRIPCIÓN DEL VIDEO:
${transcript}

IMPORTANTE: Para cada mención, intenta encontrar el timestamp aproximado buscando el texto en los chunks de transcripción.`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
        },
      });

      const response = result.response;
      const text = response.text();

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
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    // Prepare video file part with media resolution control
    const videoPart: any = {
      fileData: {
        fileUri: videoUrl,
        mimeType: 'video/*',
      },
      // Set media resolution: LOW = 70 tokens/frame (~100 tokens/second video)
      // vs default = 258 tokens/frame (~300 tokens/second video)
      mediaResolution: resolution === 'low' ? 'MEDIA_RESOLUTION_LOW' : 'MEDIA_RESOLUTION_MEDIUM',
    };

    // Add video metadata for segmentation if offsets provided
    if (startOffset !== undefined && endOffset !== undefined) {
      videoPart.videoMetadata = {
        startOffset: { seconds: startOffset },
        endOffset: { seconds: endOffset },
      };
    }

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            videoPart,
            { text: STEP1_EXTRACTION_PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
      },
    });

    const response = result.response;
    const text = response.text();

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
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-3-flash-preview',
      });

      const prompt = getStep2CompletionPrompt(
        rawMention.rawText,
        rawMention.context,
        rawMention.type
      );

      // Note: Google Search grounding requires specific API configuration
      // For now, we'll use the model without grounding and rely on its knowledge
      // In production, you'd enable grounding via API settings
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3, // Lower temperature for more factual responses
        },
      });

      const response = result.response;
      const text = response.text();

      // Parse JSON response
      return parseCompletedReference(text);
    } catch (error: any) {
      lastError = error;

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
 * Complete ALL references in a single request (much faster)
 */
export async function completeAllReferencesAtOnce(
  rawMentions: RawMention[],
  apiKey: string
): Promise<Map<string, any>> {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

      // Build a mega prompt with all mentions
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

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
        },
      });

      const text = result.response.text();

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

      console.log(`✓ Completed ${results.size}/${rawMentions.length} references in single request`);
      return results;

    } catch (error: any) {
      console.error(`Error completing all references (attempt ${attempt}/${MAX_RETRIES}):`, error.message);

      if (attempt === MAX_RETRIES) {
        console.log('Falling back to batch completion...');
        return batchCompleteReferences(rawMentions, apiKey);
      }

      const delayMs = Math.pow(2, attempt) * 1500;
      console.log(`Retrying in ${delayMs / 1000}s...`);
      await sleep(delayMs);
    }
  }

  // Fallback
  return new Map();
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
  const BATCH_SIZE = 15; // Items per batch
  const PARALLEL_BATCHES = 3; // Process 3 batches simultaneously for speed
  const results = new Map<string, any>();

  // Create all batches
  const batches: RawMention[][] = [];
  for (let i = 0; i < rawMentions.length; i += BATCH_SIZE) {
    batches.push(rawMentions.slice(i, Math.min(i + BATCH_SIZE, rawMentions.length)));
  }

  console.log(`  → Processing ${batches.length} batches (${BATCH_SIZE} items each, ${PARALLEL_BATCHES} batches in parallel)`);

  // Process batches in parallel groups
  for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
    const parallelBatches = batches.slice(i, Math.min(i + PARALLEL_BATCHES, batches.length));

    // Process multiple batches in parallel
    const parallelPromises = parallelBatches.map(async (batch) => {
      const batchPromises = batch.map((mention) =>
        completeReferenceWithSearch(mention, apiKey)
          .then((data) => ({ mention, data }))
          .catch((error) => {
            console.error('Error completing reference:', error.message);
            return {
              mention,
              data: { fullTitle: mention.rawText, author: 'Unknown', sources: [] },
            };
          })
      );

      return Promise.all(batchPromises);
    });

    // Wait for all parallel batches to complete
    const parallelResults = await Promise.all(parallelPromises);

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
      await sleep(1500); // 1.5s delay between groups
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
