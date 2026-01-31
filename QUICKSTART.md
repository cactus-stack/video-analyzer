# Quick Start Guide

## 🚀 Get Started in 3 Steps

### 1. Install Dependencies

```bash
cd youtube-analyzer
npm install
```

Now let me create the main page component that brings everything together:### 2. Get Your FREE Gemini API Key
Now let me create the main page component that brings everything together:
1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Get API Key"
4. Copy your API key

### 3. Configure Environment

Edit `.env.local`:

```bash
GEMINI_API_KEY=paste_your_api_key_here

# Optional: Set passwords for shared access
FRIENDS_PASSWORD=amigos123
OWNER_PASSWORD=your_secret_password
```

### 4. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 💡 First Analysis

1. **Choose Authentication Mode**:
   - Tab 1: Paste your API key (recommended for personal use)
   - Tab 2: Use shared password (if configured)

2. **Paste a YouTube URL**:
   - Example: `https://www.youtube.com/watch?v=dQw4w9WgxcQ`
   - Any public YouTube video works

3. **Click "Analizar Video"**:
   - Wait for Step 1 (extract mentions)
   - Wait for Step 2 (complete references)

4. **View Results**:
   - Books tab: See all books mentioned
   - Papers tab: Academic papers
   - Web Sources tab: URLs and articles
   - Authors tab: Referenced authors

5. **Export PDF**:
   - Click "Exportar PDF" to download results

## 🎯 Test with Example Videos

Try these educational videos to see the analyzer in action:

- Philosophy videos from Migala channel
- Book review videos
- Academic lectures on YouTube
- Documentary videos with citations

## ⚙️ Optional: Setup Redis for Usage Tracking

If you want to track usage limits (for shared password mode):

1. Create a free Upstash Redis account at [upstash.com](https://upstash.com)
2. Create a new Redis database
3. Copy the REST URL and Token to `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

Without Redis, the app works fine but won't track usage limits.

## 🐛 Troubleshooting

### "Invalid YouTube URL"
- Make sure the URL is from youtube.com or youtu.be
- The video must be public (not private or unlisted)

### "Authentication required"
- Check that you've entered your API key or password
- Click "Guardar" to save credentials

### "Daily limit exceeded"
- Only applies to shared password mode
- Wait until tomorrow (limits reset daily)
- Or use your own API key (no limits)

### Build errors
- Make sure Node.js version is 18 or higher
- Delete `node_modules` and `.next` folders
- Run `npm install` again

## 📚 Learn More

- Read the full [README.md](README.md) for detailed documentation
- Check the [plan document](PLAN.md) for architecture details
- Visit [Gemini API docs](https://ai.google.dev/docs) for API reference

## 🎉 You're Ready!

Start analyzing YouTube videos and discovering all the hidden references!
