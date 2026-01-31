# Deployment Guide for Vercel

## Prerequisites

- [ ] GitHub account
- [ ] Vercel account (free)
- [ ] Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

## Step-by-Step Deployment

### 1. Initialize Git Repository

```bash
cd youtube-analyzer
git init
git add .
git commit -m "Initial commit: YouTube Analyzer"
```

### 2. Create GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Name it `youtube-analyzer`
4. Don't initialize with README (you already have one)
5. Click "Create repository"

### 3. Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/youtube-analyzer.git
git branch -M main
git push -u origin main
```

### 4. Deploy to Vercel

1. Go to [Vercel](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your `youtube-analyzer` repository
5. Vercel will auto-detect Next.js settings
6. Click "Deploy"

### 5. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
FRIENDS_PASSWORD=password_for_friends
OWNER_PASSWORD=your_secret_password
```

**Important**: Add these to all environments (Production, Preview, Development)

### 6. (Optional) Setup Upstash Redis

For usage tracking with shared passwords:

#### Option A: Via Vercel Integration (Easiest)

1. Vercel Dashboard → Storage → Create Database
2. Select "Upstash Redis"
3. Name: `youtube-analyzer-usage`
4. Region: Choose closest to your users
5. Click "Create"
6. Vercel will auto-add environment variables:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

#### Option B: Direct Upstash Setup

1. Go to [upstash.com](https://upstash.com)
2. Sign up/login
3. Create new Redis database
4. Copy REST URL and Token
5. Add to Vercel env vars manually

### 7. Redeploy

After adding environment variables:

1. Vercel Dashboard → Deployments
2. Click "..." on latest deployment
3. Click "Redeploy"

### 8. Test Your Deployment

1. Visit your Vercel URL (e.g., `youtube-analyzer.vercel.app`)
2. Test authentication with your API key
3. Analyze a short YouTube video (<5 min)
4. Check that results display correctly
5. Test PDF export
6. Test dark mode

### 9. Custom Domain (Optional)

1. Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for DNS propagation (~24 hours)

## Verification Checklist

- [ ] App loads without errors
- [ ] Authentication works (API key mode)
- [ ] Authentication works (password mode)
- [ ] Video analysis completes successfully
- [ ] Results display with correct data
- [ ] Timestamps link to YouTube correctly
- [ ] PDF export downloads
- [ ] History saves and loads
- [ ] Dark mode toggle works
- [ ] Usage tracking works (if Redis enabled)
- [ ] Mobile responsive

## Monitoring

### View Logs

Vercel Dashboard → Your Project → Logs

### Check Analytics

Vercel Dashboard → Your Project → Analytics

### Monitor Redis Usage

If using Redis:
- Upstash Dashboard → Your Database → Metrics

## Cost Monitoring

### Vercel (Free Tier)
- Bandwidth: 100 GB/month
- Serverless Functions: 100 GB-hours/month
- Edge Requests: 1M/month

### Upstash Redis (Free Tier)
- 10,000 commands/day
- Max 256 MB storage
- Max 100 concurrent connections

### Gemini API (Free Tier)
- 8 hours of video/day
- 1,500 grounding requests/day

**Expected Cost**: $0/month for typical usage with friends

## Troubleshooting

### Build Fails

Check:
- Node.js version in Vercel settings (should be 18+)
- All dependencies in package.json
- No syntax errors in code

### API Routes 500 Error

Check:
- Environment variables are set correctly
- Gemini API key is valid
- Redis credentials are correct (if using)

### Video Analysis Fails

Check:
- Gemini API key has quota
- YouTube video is public
- API key hasn't exceeded daily limits

### Usage Tracking Not Working

Check:
- Redis environment variables are set
- Redis database is active in Upstash
- No connection errors in logs

## Updating After Deployment

### For Code Changes

```bash
git add .
git commit -m "Update: description of changes"
git push
```

Vercel auto-deploys from `main` branch.

### For Environment Variable Changes

1. Update in Vercel Dashboard
2. Manually redeploy (or push a commit)

## Rollback

If deployment breaks:

1. Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." → Promote to Production

## Security Best Practices

- [ ] Never commit `.env.local` to Git (already in `.gitignore`)
- [ ] Use strong passwords for FRIENDS_PASSWORD and OWNER_PASSWORD
- [ ] Rotate passwords periodically
- [ ] Monitor usage logs for suspicious activity
- [ ] Enable Vercel's DDoS protection (automatic)

## Maintenance

### Monthly Tasks

- Check Redis usage (if applicable)
- Review Vercel analytics
- Update dependencies if needed:
  ```bash
  npm outdated
  npm update
  ```

### When to Upgrade

Consider paid plans if:
- Vercel bandwidth exceeds 100 GB/month
- Redis exceeds 10,000 commands/day
- Gemini API exceeds 8 hours video/day

## Success!

Your YouTube Analyzer is now live! 🎉

Share the URL with friends and start analyzing videos.
