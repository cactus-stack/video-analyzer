# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Analyzer is a Next.js application that analyzes YouTube videos using Google's Gemini AI to automatically extract books, papers, authors, and other references mentioned in the video. It uses a **2-step analysis pipeline**: Step 1 extracts raw mentions (from video or transcript), Step 2 completes them with Google Search grounding.

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run production build
npm run start

# Lint code
npm run lint
```

## Environment Setup

Copy `.env.example` to `.env.local` and configure:
- `GEMINI_API_KEY` - Required: Google Gemini API key
- `FRIENDS_PASSWORD` - Required: Shared password for friends (8h/day limit)
- `OWNER_PASSWORD` - Required: Owner password (unlimited)
- `UPSTASH_REDIS_REST_URL` - Optional: For usage tracking
- `UPSTASH_REDIS_REST_TOKEN` - Optional: For usage tracking

## Architecture Overview

### Core 2-Step Analysis Pipeline

**Step 1 - Extraction (`lib/gemini.ts`):**
- Input: Video URL or transcript
- Process: Extract ALL raw mentions (books, papers, authors, concepts)
- Output: Array of `RawMention` objects with `{type, rawText, context, timestamp}`
- Uses prompts from `lib/prompt.ts` (STEP1_EXTRACTION_PROMPT)

**Step 2 - Completion (`lib/gemini.ts`):**
- Input: Raw mentions from Step 1
- Process: Complete each mention using Google Search grounding
- Output: Full metadata (title, author, year, sources, confidence)
- Uses `getStep2CompletionPrompt()` with `tools: [{ googleSearch: {} }]`

### Three Analysis Modes (`app/api/analyze/route.ts`)

1. **Transcript Mode** (`analysisMode: 'transcript'`):
   - Default, cheapest (95% cost reduction vs video)
   - Uses `lib/youtube-transcript.ts` to fetch subtitles
   - Calls `analyzeTranscript()` for Step 1
   - Runs Step 2 completion with intelligent batching
   - Best for most videos with available subtitles

2. **Video Mode** (`analysisMode: 'video'`):
   - Premium mode for visual content analysis
   - Directly analyzes video frames with Gemini's vision capabilities
   - Auto-segments videos >1 hour using `lib/video-splitter.ts`
   - Calls `analyzeVideoSegment()` for each segment
   - Restricted to owner password (not friends password)

3. **Raw Mode** (`analysisMode: 'raw'`):
   - Fastest, cheapest
   - Step 1 only (transcript extraction), no Step 2 completion
   - Returns raw mentions without completing metadata

### Three-Level Authentication System

Implemented in `app/api/analyze/route.ts` (Lines 41-71):

1. **Level 1 - User API Key** (`authLevel: 'user'`):
   - User provides their own Gemini API key
   - No limits, uses their quota
   - Stored in localStorage via `lib/storage.ts`

2. **Level 2 - Friends Password** (`authLevel: 'friends'`):
   - Shared password from `FRIENDS_PASSWORD` env var
   - 8 hours/day limit enforced via `lib/usage-tracker.ts`
   - Usage tracked in Upstash Redis
   - Cannot use video mode (transcript/raw only)

3. **Level 3 - Owner Password** (`authLevel: 'owner'`):
   - Owner password from `OWNER_PASSWORD` env var
   - No limits, all modes available

### Intelligent Batching System

Located in `lib/gemini.ts` (Lines 386-441):

**Strategy**: `batchCompleteReferencesIntelligent()`
- Creates mega-batches of 18 mentions each
- Processes 2 mega-batches in parallel
- Single mega-request per batch (one API call for 18 references)
- Fallback to individual processing if mega-request fails
- Scales from 10 to 200+ references efficiently

**Fallback**: For ≤15 mentions, uses single mega-request via `completeAllReferencesAtOnce()`

### Video Segmentation

Located in `lib/video-splitter.ts`:

- Videos >1 hour (3600s) auto-segmented
- Max segment: 1 hour (≈400K tokens at low resolution)
- 30-second overlap between segments to avoid missing references
- Segments processed in parallel
- Custom ranges supported via `customRangesToSegments()`

### Key Type Definitions (`lib/types.ts`)

**Core types:**
- `RawMention` - Step 1 output: {type, rawText, context, timestamp}
- `Book`, `Paper`, `WebSource`, `Author` - Step 2 output with full metadata
- `AnalysisResults` - Container for all reference types
- `AnalyzeRequest` / `AnalyzeResponse` - API contract

**Analysis modes:**
```typescript
analysisMode: 'transcript' | 'video' | 'raw'
```

### Error Handling & Retry Logic

All API calls in `lib/gemini.ts` implement exponential backoff:
- Max 3 retries for most operations
- Retry on: fetch failed, ECONNRESET, timeout, 429, 503
- Delays: 2s, 4s, 8s (exponential)
- Request timeouts: 45s (individual), 60s (mega-requests)
- Graceful fallback to raw mentions if completion fails

### State Management

**Client-side storage** (`lib/storage.ts`):
- Uses localStorage for auth credentials and analysis history
- `saveAuthCredentials()` / `getAuthCredentials()`
- `saveAnalysis()` / `getAnalyses()` - Analysis history with search/filter

**Server-side tracking** (`lib/usage-tracker.ts`):
- Upstash Redis for usage limits (friends group only)
- Daily keys: `usage:friends:YYYY-MM-DD`
- Auto-expiration after 2 days
- Gracefully degrades if Redis not configured

## Component Structure

**Main page** (`app/page.tsx`):
- Container for all UI components
- Manages analysis state and API calls

**Key components** (`components/`):
- `AuthSelector.tsx` - 3-level authentication UI
- `VideoInput.tsx` - URL input + mode selection (transcript/video/raw)
- `ModeSelector.tsx` - Analysis mode picker
- `AnalysisResults.tsx` - Display books/papers/authors with confidence badges
- `HistoryList.tsx` - Analysis history with search
- `PDFExport.tsx` - Export results to PDF
- `UsageBanner.tsx` - Show daily usage for friends group
- `ThemeToggle.tsx` - Dark/light mode

## API Routes

**`/api/analyze` (POST)** - Main analysis endpoint:
- Input: `AnalyzeRequest` (videoUrl, auth, mode, segments)
- Output: `AnalyzeResponse` (results, usage, metadata)
- Max duration: 300s (5 minutes, requires Vercel Pro)
- Implements full 2-step pipeline

**`/api/admin/usage` (GET)** - Usage statistics:
- Returns last 30 days usage stats
- Friends group only

## Gemini API Configuration

**Model**: `gemini-3-flash-preview` (or check code for latest)

**Step 1 settings:**
- Temperature: 0.4 (slightly creative for mention detection)
- Media resolution: LOW (≈70 tokens/frame, saves 95% vs MEDIUM)

**Step 2 settings:**
- Temperature: 0.3 (more factual)
- Tools: `[{ googleSearch: {} }]` for grounding

## Important Constraints

1. **Video length limits:**
   - Gemini API: Max 3 hours per video with low resolution
   - Videos >1 hour auto-segmented (30s overlap)
   - No hard limit with segmentation, but longer = more cost

2. **Free tier limits (Gemini):**
   - 8 hours video/day
   - 1,500 grounding requests/day
   - Shared among all users with friends password

3. **Vercel serverless limits:**
   - Timeout: 300s (5 min) with Pro plan, 10s on Free/Hobby
   - Requires Pro plan for long videos

4. **Mode restrictions:**
   - Friends password: Cannot use video mode (transcript/raw only)
   - Owner password: All modes available

## Path Aliases

Uses `@/*` alias mapping to project root (configured in `tsconfig.json`):
```typescript
import { analyzeVideo } from '@/lib/gemini';
import { Book } from '@/lib/types';
```

## Common Patterns

**Adding a new reference type:**
1. Add interface to `lib/types.ts` (e.g., `Podcast`)
2. Update `RawMention.type` union
3. Add extraction logic to STEP1_EXTRACTION_PROMPT (`lib/prompt.ts`)
4. Add completion prompt to `getStep2CompletionPrompt()` (`lib/prompt.ts`)
5. Update `mergeReferences()` in `lib/gemini.ts`
6. Update UI in `AnalysisResults.tsx`

**Modifying batching strategy:**
- Edit `batchCompleteReferencesIntelligent()` in `lib/gemini.ts`
- Adjust `MEGA_BATCH_SIZE` (default: 18)
- Adjust `PARALLEL_MEGA_BATCHES` (default: 2)
- Consider rate limits and timeout constraints

**Debugging analysis issues:**
1. Check browser console for client-side errors
2. Check Vercel logs for server-side errors (API route)
3. Look for retry logs: `[completeReference]` prefix
4. Verify prompt quality in `lib/prompt.ts`
5. Test with smaller videos first

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: React 19
- **Styling**: Tailwind CSS
- **AI**: Google Gemini AI with Google Search grounding
- **Storage**: localStorage (client), Upstash Redis (server)
- **Deployment**: Vercel
- **TypeScript**: Strict mode enabled
