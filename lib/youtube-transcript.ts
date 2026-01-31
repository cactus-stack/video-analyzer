/**
 * Server-only: YouTube transcript fetching
 * Multi-strategy: Innertube ANDROID (2025 guide) + yt-dlp fallback
 * No external transcript libs - implements from scratch for 2025-2026 compatibility
 */
import { extractVideoId } from '@/lib/youtube';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// XML format: <text start="X" dur="Y">content</text>
const RE_XML = /<text start="([^"]*)" dur="([^"]*)">([^<]*)<\/text>/g;

interface Chunk {
  text: string;
  offset: number;
  duration: number;
}

/**
 * Strategy 1: Innertube API with ANDROID client
 * @see https://medium.com/@aqib-2/extract-youtube-transcripts-using-innertube-api-2025-javascript-guide-dc417b762f49
 */
async function fetchViaInnertube(videoId: string): Promise<{ text: string; chunks: Chunk[] } | null> {
  try {
    // Step 1: Get API key from video page
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const html = await pageRes.text();

    const apiKeyMatch =
      html.match(/"INNERTUBE_API_KEY":"([^"]+)"/) || html.match(/INNERTUBE_API_KEY\\":\\"([^\\"]+)\\"/);
    if (!apiKeyMatch?.[1]) {
      console.log('[transcript] Innertube: No API key found in page');
      return null;
    }
    const apiKey = apiKeyMatch[1];

    // Step 2: Call player API as ANDROID client
    const playerRes = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': USER_AGENT,
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'ANDROID',
              clientVersion: '20.10.38',
            },
          },
          videoId,
        }),
      }
    );

    if (!playerRes.ok) {
      console.log('[transcript] Innertube: Player API', playerRes.status);
      return null;
    }

    const playerData = (await playerRes.json()) as {
      captions?: {
        playerCaptionsTracklistRenderer?: {
          captionTracks?: Array<{ baseUrl: string; languageCode?: string }>;
        };
      };
    };

    const tracks =
      playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks?.length) {
      console.log('[transcript] Innertube: No caption tracks');
      return null;
    }

    // Prefer en/es, fallback to first
    const track =
      tracks.find((t) => ['en', 'es'].includes(t.languageCode || '')) ||
      tracks[0];
    let baseUrl = track.baseUrl?.replace(/&fmt=\w+$/, '') || track.baseUrl;
    if (!baseUrl) return null;

    // Step 3: Fetch transcript - try json3 first (append to baseUrl)
    const sep = baseUrl.includes('?') ? '&' : '?';
    const jsonUrl = `${baseUrl}${sep}fmt=json3`;
    const transcriptRes = await fetch(jsonUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });

    let body: string;
    if (transcriptRes.ok) {
      body = await transcriptRes.text();
    } else {
      // Try without fmt=json3 (some tracks return XML by default)
      const plainRes = await fetch(baseUrl, { headers: { 'User-Agent': USER_AGENT } });
      if (!plainRes.ok) {
        console.log('[transcript] Innertube: Transcript fetch failed', transcriptRes.status);
        return null;
      }
      body = await plainRes.text();
    }
    if (!body || body.trim().length === 0) {
      console.log('[transcript] Innertube: Empty transcript body');
      return null;
    }

    // Try json3 parse first
    if (body.trim().startsWith('{')) {
      try {
        const data = JSON.parse(body) as {
          events?: Array<{
            tStartMs?: number;
            dDurationMs?: number;
            segs?: Array<{ utf8?: string }>;
          }>;
        };
        const events = data?.events?.filter((e) => e?.segs) ?? [];
        if (events.length > 0) {
          const chunks: Chunk[] = events.map((e) => {
            const text = (e.segs ?? [])
              .map((s) => s.utf8 ?? '')
              .join('')
              .replace(/\n/g, ' ')
              .trim();
            return {
              text,
              offset: Math.floor((e.tStartMs ?? 0) / 1000),
              duration: Math.floor((e.dDurationMs ?? 0) / 1000),
            };
          });
          return { text: chunks.map((c) => c.text).join(' '), chunks };
        }
      } catch {
        /* fall through to XML */
      }
    }

    // Fallback: XML format
    const xmlMatches = [...body.matchAll(RE_XML)];
    if (xmlMatches.length === 0) {
      console.log('[transcript] Innertube: No json3 or XML matches');
      return null;
    }
    const chunks: Chunk[] = xmlMatches.map((m) => ({
      text: (m[3] || '').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim(),
      offset: Math.floor(parseFloat(m[1] || '0')),
      duration: Math.floor(parseFloat(m[2] || '0')),
    }));
    return { text: chunks.map((c) => c.text).join(' '), chunks };
  } catch (err) {
    console.error('[transcript] Innertube error:', err);
    return null;
  }
}

/**
 * Strategy 2: yt-dlp (if installed) - most reliable, writes to temp file
 */
async function fetchViaYtDlp(videoId: string): Promise<{ text: string; chunks: Chunk[] } | null> {
  const { execSync } = await import('child_process');
  const { mkdtempSync, readFileSync, rmSync } = await import('fs');
  const { join } = await import('path');
  const { tmpdir } = await import('os');
  let tmpDir: string | null = null;
  try {
    tmpDir = mkdtempSync(join(tmpdir(), 'yt-transcript-'));
    const outPath = join(tmpDir, '%(id)s');
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    execSync(
      `yt-dlp --write-subs --write-auto-subs --skip-download --sub-format json3 -o "${outPath}" --no-warnings "${url}" 2>/dev/null`,
      {
        encoding: 'utf-8',
        timeout: 30000,
        stdio: 'pipe',
      }
    );
    const fs = await import('fs');
    const files = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.json3'));
    if (files.length === 0) return null;
    const body = readFileSync(join(tmpDir, files[0]), 'utf-8');
    const data = JSON.parse(body) as {
      events?: Array<{
        tStartMs?: number;
        dDurationMs?: number;
        segs?: Array<{ utf8?: string }>;
      }>;
    };
    const events = data?.events?.filter((e) => e?.segs) ?? [];
    if (events.length === 0) return null;
    const chunks: Chunk[] = events.map((e) => {
      const text = (e.segs ?? [])
        .map((s) => s.utf8 ?? '')
        .join('')
        .replace(/\n/g, ' ')
        .trim();
      return {
        text,
        offset: Math.floor((e.tStartMs ?? 0) / 1000),
        duration: Math.floor((e.dDurationMs ?? 0) / 1000),
      };
    });
    return { text: chunks.map((c) => c.text).join(' '), chunks };
  } catch {
    return null;
  } finally {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true });
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Strategy 3: Parse captions from video page HTML (legacy)
 */
async function fetchViaPageScrape(videoId: string): Promise<{ text: string; chunks: Chunk[] } | null> {
  try {
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    const html = await pageRes.text();

    const parts = html.split('"captions":');
    if (parts.length <= 1) return null;

    let captions: { playerCaptionsTracklistRenderer?: { captionTracks?: Array<{ baseUrl: string }> } };
    try {
      const jsonStr = parts[1].split(',"videoDetails"')[0].replace(/\n/g, '');
      captions = JSON.parse(jsonStr);
    } catch {
      return null;
    }

    const tracks = captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks?.length) return null;

    const baseUrl = tracks[0].baseUrl;
    const transcriptRes = await fetch(`${baseUrl}&fmt=json3`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!transcriptRes.ok) return null;

    const body = await transcriptRes.text();
    if (!body?.trim().startsWith('{')) return null;

    const data = JSON.parse(body) as {
      events?: Array<{
        tStartMs?: number;
        dDurationMs?: number;
        segs?: Array<{ utf8?: string }>;
      }>;
    };
    const events = data?.events?.filter((e) => e?.segs) ?? [];
    if (events.length === 0) return null;

    const chunks: Chunk[] = events.map((e) => {
      const text = (e.segs ?? [])
        .map((s) => s.utf8 ?? '')
        .join('')
        .replace(/\n/g, ' ')
        .trim();
      return {
        text,
        offset: Math.floor((e.tStartMs ?? 0) / 1000),
        duration: Math.floor((e.dDurationMs ?? 0) / 1000),
      };
    });
    return { text: chunks.map((c) => c.text).join(' '), chunks };
  } catch {
    return null;
  }
}

export async function getVideoTranscript(url: string): Promise<{
  text: string;
  chunks: Array<{ text: string; offset: number; duration: number }>;
} | null> {
  const videoId = extractVideoId(url);

  console.log('[getVideoTranscript] Fetching', { videoId: videoId ?? 'INVALID' });

  if (!videoId) {
    console.error('[getVideoTranscript] Invalid YouTube URL', { url });
    return null;
  }

  // Try strategies in order
  let result = await fetchViaInnertube(videoId);
  if (result) {
    console.log('[getVideoTranscript] Success (Innertube)', {
      videoId,
      chunksCount: result.chunks.length,
      textLength: result.text.length,
    });
    return result;
  }

  result = await fetchViaPageScrape(videoId);
  if (result) {
    console.log('[getVideoTranscript] Success (page scrape)', {
      videoId,
      chunksCount: result.chunks.length,
    });
    return result;
  }

  result = await fetchViaYtDlp(videoId);
  if (result) {
    console.log('[getVideoTranscript] Success (yt-dlp)', {
      videoId,
      chunksCount: result.chunks.length,
    });
    return result;
  }

  console.error('[getVideoTranscript] All strategies failed', { videoId });
  return null;
}
