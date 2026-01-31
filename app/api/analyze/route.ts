import { NextRequest, NextResponse } from 'next/server';
import { AnalyzeRequest, AnalyzeResponse } from '@/lib/types';
import { validateYouTubeUrl, getVideoMetadata, extractVideoId, getVideoDuration } from '@/lib/youtube';
import { getVideoTranscript } from '@/lib/youtube-transcript';
import { calculateSegments, customRangesToSegments } from '@/lib/video-splitter';
import {
  analyzeVideoSegment,
  analyzeTranscript,
  completeAllReferencesAtOnce,
  batchCompleteReferencesIntelligent,
  mergeReferences,
} from '@/lib/gemini';
import { checkDailyLimit, trackUsage, isRedisAvailable } from '@/lib/usage-tracker';

// Configure Vercel timeout - requires Pro plan for >60s
// Free/Hobby: 10s, Pro: up to 300s (5 minutes)
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  // Check if client disconnected
  const checkClientConnected = () => {
    if (request.signal.aborted) {
      throw new Error('Client disconnected');
    }
  };

  try {
    const body: AnalyzeRequest = await request.json();
    const {
      videoUrl,
      userApiKey,
      accessPassword,
      analysisMode = 'transcript', // default to transcript mode (cheapest)
      mode,
      segments,
      resolution = 'low',
      completeReferences = true
    } = body;

    // Check connection before starting
    checkClientConnected();

    // Validate YouTube URL
    if (!validateYouTubeUrl(videoUrl)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    // Step 1: Authentication (3 levels)
    let authLevel: 'user' | 'friends' | 'owner' | null = null;
    let apiKey: string;

    if (userApiKey) {
      // Level 1: User's own API key
      authLevel = 'user';
      apiKey = userApiKey;
    } else if (accessPassword) {
      // Level 2 or 3: Password authentication
      const friendsPassword = process.env.FRIENDS_PASSWORD;
      const ownerPassword = process.env.OWNER_PASSWORD;

      if (accessPassword === friendsPassword) {
        authLevel = 'friends';
        apiKey = process.env.GEMINI_API_KEY!;
      } else if (accessPassword === ownerPassword) {
        authLevel = 'owner';
        apiKey = process.env.GEMINI_API_KEY!;
      } else {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Authentication required: provide API key or password' },
        { status: 401 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Restrict ONLY friends (not owner) to Económico and Rápido modes
    if (authLevel === 'friends' && analysisMode === 'video') {
      return NextResponse.json(
        {
          error: 'El modo Premium (video completo) no está disponible con la contraseña de amigos. Usa modo Económico (transcripción + IA) o Rápido (solo menciones). Si eres el dueño, usa tu contraseña especial.',
          availableModes: ['transcript', 'raw']
        },
        { status: 403 }
      );
    }

    // Step 2: Check usage limits (only for friends)
    let usageInfo;
    if (authLevel === 'friends' && isRedisAvailable()) {
      const limitCheck = await checkDailyLimit('friends');

      if (!limitCheck.allowed) {
        return NextResponse.json(
          {
            error: 'Daily limit exceeded',
            usage: {
              hoursUsed: limitCheck.hoursUsed,
              limit: 8,
              hoursRemaining: 0,
            },
          },
          { status: 429 }
        );
      }

      usageInfo = {
        hoursUsed: limitCheck.hoursUsed,
        limit: 8,
        hoursRemaining: limitCheck.hoursRemaining,
      };
    }

    // Step 3: Get video metadata and duration
    const metadata = await getVideoMetadata(videoUrl);
    const videoTitle = metadata?.title || 'Unknown Video';
    const channel = metadata?.channel || 'Unknown Channel';

    // Get actual video duration
    const videoDuration = await getVideoDuration(videoUrl);
    const duration = videoDuration || 1800; // Default to 30 min if can't detect

    // Step 4: Analyze based on mode
    const step1Start = Date.now();
    let allRawMentions: any[] = [];

    if (analysisMode === 'transcript') {
      // TRANSCRIPT MODE: Cheapest and fastest (95% cost reduction)
      console.log(`[analyze] Step 1: TRANSCRIPT mode`, {
        videoId: extractVideoId(videoUrl),
        videoUrl,
      });

      const transcriptData = await getVideoTranscript(videoUrl);
      if (!transcriptData) {
        console.error('[analyze] TRANSCRIPT mode: getVideoTranscript returned null', {
          videoId: extractVideoId(videoUrl),
          videoUrl,
        });
        return NextResponse.json(
          { error: 'No se pudo obtener la transcripción del video. Puede que no tenga subtítulos disponibles.' },
          { status: 400 }
        );
      }

      console.log(`✓ Transcript fetched: ${transcriptData.text.length} characters`);
      checkClientConnected(); // Check before expensive operation
      allRawMentions = await analyzeTranscript(transcriptData.text, transcriptData.chunks, apiKey);
      console.log(`✓ Step 1 (transcript analysis) completed in ${((Date.now() - step1Start) / 1000).toFixed(1)}s`);
      checkClientConnected(); // Check after Step 1

    } else if (analysisMode === 'video') {
      // VIDEO MODE: Full video analysis for visual content
      console.log(`Step 1: Analyzing VIDEO (premium mode)...`);

      const MAX_DURATION_SECONDS = 3600; // 1 hour
      let videoSegments;

      if (mode === 'custom' && segments) {
        videoSegments = customRangesToSegments(segments);
      } else if (duration > MAX_DURATION_SECONDS) {
        videoSegments = calculateSegments(duration);
        console.log(`Video is ${(duration / 3600).toFixed(1)}h long, segmenting into ${videoSegments.length} parts`);
      } else {
        videoSegments = [{
          startOffset: 0,
          endOffset: duration,
          index: 0,
          total: 1,
        }];
      }

      console.log(`Starting parallel analysis of ${videoSegments.length} segment(s)...`);

      const segmentPromises = videoSegments.map(async (segment) => {
        console.log(`Starting segment ${segment.index + 1}/${segment.total}: ${segment.startOffset}s - ${segment.endOffset}s`);
        const segmentStart = Date.now();

        const rawMentions = await analyzeVideoSegment(
          videoUrl,
          apiKey,
          segment.startOffset,
          segment.endOffset,
          resolution
        );

        console.log(`✓ Segment ${segment.index + 1} completed in ${((Date.now() - segmentStart) / 1000).toFixed(1)}s, found ${rawMentions.length} mentions`);
        return rawMentions;
      });

      const segmentResults = await Promise.all(segmentPromises);
      allRawMentions = segmentResults.flat();
      console.log(`✓ Step 1 (video analysis) completed in ${((Date.now() - step1Start) / 1000).toFixed(1)}s total`);

    } else if (analysisMode === 'raw') {
      // RAW MODE: Transcript only, no Step 2 (fastest, cheapest, raw mentions)
      console.log(`[analyze] Step 1: RAW mode (transcript-based)`, {
        videoId: extractVideoId(videoUrl),
        videoUrl,
      });

      const transcriptData = await getVideoTranscript(videoUrl);
      if (!transcriptData) {
        console.error('[analyze] RAW mode: getVideoTranscript returned null', {
          videoId: extractVideoId(videoUrl),
          videoUrl,
        });
        return NextResponse.json(
          { error: 'No se pudo obtener la transcripción del video. Puede que no tenga subtítulos disponibles.' },
          { status: 400 }
        );
      }

      console.log(`✓ Transcript fetched: ${transcriptData.text.length} characters`);
      allRawMentions = await analyzeTranscript(transcriptData.text, transcriptData.chunks, apiKey);
      console.log(`✓ Step 1 (raw transcript analysis) completed in ${((Date.now() - step1Start) / 1000).toFixed(1)}s`);
    }

    // Deduplicate raw mentions
    const uniqueMentions = deduplicateMentions(allRawMentions);
    console.log(`Found ${uniqueMentions.length} unique mentions after deduplication`);

    // Step 6: Complete references (Step 2 - Intelligent batching strategy, skipped in raw mode)
    let completedData = new Map<string, any>();

    if (analysisMode === 'raw') {
      // Raw mode: no Step 2
      console.log('⊘ Step 2 skipped (raw mode - no reference completion)');
    } else if (completeReferences) {
      checkClientConnected(); // Check before expensive Step 2
      const step2Start = Date.now();
      const SINGLE_REQUEST_THRESHOLD = 15; // Use single request only for very small videos

      if (uniqueMentions.length <= SINGLE_REQUEST_THRESHOLD) {
        // Very small video: Single mega-request
        console.log(`Step 2: Completing ${uniqueMentions.length} references with SINGLE MEGA-REQUEST...`);
        completedData = await completeAllReferencesAtOnce(uniqueMentions, apiKey);
      } else {
        // Medium to large videos: Intelligent batching (scales from 15 to 200+ references)
        console.log(`Step 2: Completing ${uniqueMentions.length} references with INTELLIGENT BATCHING...`);
        completedData = await batchCompleteReferencesIntelligent(uniqueMentions, apiKey, (current, total) => {
          console.log(`  Progress: ${current}/${total} references completed`);
        });
      }

      console.log(`✓ Step 2 (reference completion) completed in ${((Date.now() - step2Start) / 1000).toFixed(1)}s`);
    } else {
      console.log('⊘ Step 2 skipped (completeReferences = false)');
    }

    // Step 7: Merge results
    const results = mergeReferences(uniqueMentions, completedData);
    console.log(`Final results: ${results.books.length} books, ${results.papers.length} papers, ${results.webSources.length} web sources, ${results.authors.length} authors`);

    // Step 8: Track usage (only for friends)
    if (authLevel === 'friends' && isRedisAvailable()) {
      await trackUsage('friends', duration);
    }

    // Step 9: Return response
    const response: AnalyzeResponse = {
      results,
      videoTitle,
      channel,
      duration,
      videoId: extractVideoId(videoUrl) || '',
      usage: usageInfo,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    // Check if client disconnected
    if (error.message === 'Client disconnected') {
      console.log('⚠️  Client disconnected, stopping processing');
      return NextResponse.json(
        { error: 'Request cancelled by client' },
        { status: 499 } // Non-standard but commonly used for client closed request
      );
    }

    console.error('Error in analyze route:', error);

    // Check if it's a token limit error
    if (error.message?.includes('token count exceeds')) {
      return NextResponse.json(
        {
          error: 'El video es demasiado largo. Por favor prueba con un video más corto (<2 horas) o espera a que implementemos la segmentación automática con YouTube Data API.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Deduplicate mentions based on rawText and timestamp
 */
function deduplicateMentions(mentions: any[]): any[] {
  const seen = new Set<string>();
  return mentions.filter((mention) => {
    const key = `${mention.type}:${mention.rawText.toLowerCase()}:${mention.timestamp}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
