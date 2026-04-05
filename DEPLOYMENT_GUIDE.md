# Aangan Web App -- Vercel Deployment Guide

## Prerequisites

- Node.js 18+ installed
- A Vercel account (sign up at https://vercel.com with your GitHub account)

## Option A: Deploy via Vercel Dashboard (Recommended for first deploy)

1. **Push code to GitHub** (if not already done):
   ```bash
   cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App
   git add aangan_web/
   git commit -m "feat: prepare web app for Vercel deployment"
   git push origin main
   ```

2. **Import project on Vercel**:
   - Go to https://vercel.com/new
   - Click "Import Git Repository"
   - Select the `Aangan_App` repo
   - Set **Root Directory** to `aangan_web`
   - Framework Preset will auto-detect as **Next.js**

3. **Set Environment Variables** (on the Vercel import page, expand "Environment Variables"):
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://okzmeuhxodzkbdilvkyu.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_w_bBTY5Rj-6rtPO1sssUig_KsMsidFD
   ```
   Add both for **Production**, **Preview**, and **Development** environments.

4. Click **Deploy**. Vercel will build and deploy automatically.

## Option B: Deploy via Vercel CLI

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```
This opens a browser for authentication.

### 3. Navigate to the web app directory

```bash
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_web
```

### 4. Set environment variables

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# When prompted, enter: https://okzmeuhxodzkbdilvkyu.supabase.co
# Select all environments (Production, Preview, Development)

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# When prompted, enter: sb_publishable_w_bBTY5Rj-6rtPO1sssUig_KsMsidFD
# Select all environments
```

### 5. Deploy to production

```bash
vercel --prod
```

On first run, Vercel will ask:
- **Set up and deploy?** Yes
- **Which scope?** Select your account
- **Link to existing project?** No (creates a new one)
- **Project name?** `aangan-web` (or press Enter for default)
- **Directory with source code?** `./` (since you're already in aangan_web)
- **Override settings?** No

### 6. Non-interactive deploy (subsequent deploys)

```bash
vercel --yes --prod
```

### 7. Using a token (for CI/CD)

```bash
export VERCEL_TOKEN="your_token_here"
vercel --yes --prod --token=$VERCEL_TOKEN
```

## Important: next.config.ts

The `output: 'standalone'` setting has been commented out in `next.config.ts`.
Vercel does NOT need `standalone` output -- it handles builds natively.
If you later want to self-host with Docker, uncomment it.

## After Deployment

- Your app will be live at `https://aangan-web-xxxxx.vercel.app`
- Set a custom domain in Vercel Dashboard > Settings > Domains
- Update the Supabase redirect URL in your Supabase dashboard:
  - Go to Supabase > Authentication > URL Configuration
  - Add your Vercel URL to "Redirect URLs"

## Quick One-Liner (if Vercel CLI is authenticated)

```bash
cd /Users/akc_auto_run/Documents/Claude/Projects/Aangan_App/aangan_web && vercel --yes --prod
```
