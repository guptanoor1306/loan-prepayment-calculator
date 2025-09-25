# Deployment Instructions

## Step 1: Create GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Repository details:
   - **Repository name**: `loan-prepayment-calculator`
   - **Description**: `Zero1 by Zerodha - Smart Loan Prepayment Calculator`
   - **Visibility**: Public (recommended for Vercel free tier)
   - **Initialize**: Don't initialize with README (we already have one)
5. Click "Create repository"

## Step 2: Push Code to GitHub

After creating the repository, GitHub will show you the commands. Run these in your terminal:

```bash
# Set the remote origin (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/loan-prepayment-calculator.git

# Set default branch name
git branch -M main

# Push to GitHub
git push -u origin main
```

## Step 3: Deploy on Vercel

### Option A: Vercel Web Interface (Recommended)
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your `loan-prepayment-calculator` repository
5. Configure project:
   - **Project Name**: `loan-prepayment-calculator`
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: Leave empty (static site)
   - **Output Directory**: Leave empty
6. Click "Deploy"

### Option B: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? N
# - Project name: loan-prepayment-calculator
# - Directory: ./
```

## Step 4: Configure Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click on "Domains" tab
3. Add your custom domain
4. Follow DNS configuration instructions

## Step 5: Environment Variables (If Needed)

If you add analytics services or APIs later:
1. Go to Vercel project settings
2. Click "Environment Variables"
3. Add variables like:
   - `ANALYTICS_KEY`
   - `API_ENDPOINT`

## Analytics Integration

The app currently stores analytics in localStorage. To integrate with external services:

1. **Google Analytics**:
   ```javascript
   // Add to index.html
   <script async src="https://www.googletagmanager.com/gtag/js?id=GA_TRACKING_ID"></script>
   ```

2. **Custom API**:
   ```javascript
   // In Analytics class, uncomment and modify:
   fetch('/api/analytics', { 
     method: 'POST', 
     body: JSON.stringify(analyticsData) 
   })
   ```

## Auto-Deployment

Once connected to GitHub:
- Every push to `main` branch automatically deploys
- Pull requests create preview deployments
- Rollback to previous versions is available

## Monitoring

- **Vercel Analytics**: Enable in project settings
- **Performance**: Built-in Web Vitals tracking
- **Usage**: View function invocations and bandwidth

Your loan calculator will be live at: `https://loan-prepayment-calculator.vercel.app`
