# Deploying to Vercel

This guide walks you through deploying your MBTI/RIASEC Career Guidance application to Vercel.

## Prerequisites

- GitHub account
- Vercel account (free tier works fine)
- Git installed on your computer

## Step 1: Prepare Your Code

All necessary changes have been made to make your code Vercel-ready:

✅ **Configuration Files Created**:
- `vercel.json` - Vercel deployment configuration
- `.vercelignore` - Files to exclude from deployment
- `.gitignore` - Git version control ignore patterns
- Frontend environment files (`.env.production`, `.env.development`)

✅ **Dependencies Optimized**:
- Removed heavy ML libraries (PyTorch, scikit-learn, etc.)
- Converted BNN model to use lightweight NumPy
- Kept only essential dependencies

✅ **API Configuration Updated**:
- Frontend now uses environment variables for API URL
- Works in both development and production

## Step 2: Push to GitHub

### 2.1 Initialize Git Repository (if not already done)

```bash
cd d:/edskNEXT/IP_MBTI_HOLLAND_VERCEL
git init
```

### 2.2 Add All Files

```bash
git add .
```

### 2.3 Create Initial Commit

```bash
git commit -m "Initial commit - Ready for Vercel deployment"
```

### 2.4 Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Click the "+" icon in the top right
3. Select "New repository"
4. Name it (e.g., `mbti-holland-career-guide`)
5. **Do NOT** initialize with README, .gitignore, or license
6. Click "Create repository"

### 2.5 Push to GitHub

GitHub will show you commands like these (use them):

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual values.

## Step 3: Deploy to Vercel

### 3.1 Sign Up / Log In to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up" or "Log In"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub account

### 3.2 Import Your Repository

1. Click "Add New..." → "Project"
2. Find your repository in the list
3. Click "Import"

### 3.3 Configure Build Settings

Vercel should auto-detect your configuration from `vercel.json`, but verify:

**Framework Preset**: Other (or Vite if available)

**Build Settings**:
- Build Command: `cd frontend && npm install && npm run build`
- Output Directory: `frontend/dist`
- Install Command: `npm install`

**Root Directory**: Leave as `.` (project root)

### 3.4 Deploy

1. Click "Deploy"
2. Wait for the build to complete (2-5 minutes)
3. You'll get a URL like `https://your-project.vercel.app`

## Step 4: Verify Deployment

### 4.1 Test the Application

Visit your Vercel URL and test:

1. **MBTI Quiz**:
   - Start a quiz session
   - Answer several questions
   - Verify you can complete the quiz
   - Check that results display correctly

2. **RIASEC Quiz**:
   - Start a quiz session
   - Answer questions with different ratings
   - Complete the quiz
   - Verify results and radar chart

3. **Career Recommendations**:
   - Complete both quizzes
   - Check that career cluster recommendations appear
   - Verify the recommendations make sense

### 4.2 Check for Errors

Open browser developer tools (F12) and check:
- Console tab: Look for any JavaScript errors
- Network tab: Verify API calls are successful (200 status codes)

## Step 5: Custom Domain (Optional)

### 5.1 Add Your Domain

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow Vercel's instructions to update DNS records

### 5.2 Update DNS

Add the DNS records Vercel provides to your domain registrar.

## Troubleshooting

### Build Fails

**Error**: `Module not found` or `Cannot find package`

**Solution**: Make sure all dependencies are in `package.json` and `requirements.txt`

```bash
# Test locally first
cd frontend
npm install
npm run build

cd ../backend
pip install -r requirements.txt
```

### API Calls Fail (404 or 500 errors)

**Error**: API endpoints return 404 or 500

**Solution**: 
1. Check Vercel function logs in the dashboard
2. Verify `vercel.json` routing is correct
3. Make sure `backend/app.py` is at the correct path

### Session Lost Between Requests

**Note**: This shouldn't happen with the current implementation as we're using stateless session management. If you see this:

1. Check browser console for errors
2. Verify frontend is sending session state with each request
3. Check that backend is returning updated session state

### Cold Start Delays

**Issue**: First API call after inactivity is slow

**Explanation**: This is normal for serverless functions. Vercel "wakes up" the function on first request.

**Solutions**:
- Upgrade to Vercel Pro for faster cold starts
- Accept 1-2 second delay on first request (subsequent requests are fast)

## Local Development

To continue developing locally:

```bash
# Terminal 1 - Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux
pip install -r requirements.txt
uvicorn app:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173` and proxy API calls to `http://localhost:8000`.

## Updating Your Deployment

After making changes:

```bash
git add .
git commit -m "Description of changes"
git push
```

Vercel automatically redeploys when you push to the `main` branch.

## Environment Variables (If Needed)

If you need to add secrets or configuration:

1. Go to Vercel dashboard → Your Project → Settings → Environment Variables
2. Add variables (e.g., database URLs, API keys)
3. Redeploy for changes to take effect

## Support

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)

## Summary

Your application is now deployed! 🎉

- **Production URL**: Check your Vercel dashboard
- **Automatic Deployments**: Push to GitHub to deploy
- **Monitoring**: View logs and analytics in Vercel dashboard
