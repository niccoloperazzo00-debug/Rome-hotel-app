# Deployment Guide for Render

This guide will help you deploy the Rome Hotels Map application to Render.

## Prerequisites

1. A GitHub account
2. A Render account (sign up at https://render.com)
3. Your database credentials (you already have these)

## Step-by-Step Deployment

### Step 1: Push Code to GitHub

1. Make sure all your changes are committed:
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

### Step 2: Create Web Service on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** button
3. Select **"Web Service"**
4. Connect your GitHub repository:
   - Click **"Connect account"** if not already connected
   - Find and select your repository: `muncipio-app`
   - Click **"Connect"**

### Step 3: Configure the Service

Fill in the following settings:

**Name:** `muncipio-app` (or any name you prefer)

**Environment:** `Node`

**Build Command:**
```bash
cd backend && npm install
```

**Start Command:**
```bash
cd backend && npm start
```

**Plan:** Choose **"Free"** for testing (you can upgrade later)

### Step 4: Set Environment Variables

Click on **"Environment"** tab and add:

**Key:** `NODE_ENV`  
**Value:** `production`

**Key:** `PORT`  
**Value:** `10000`  
(Note: Render automatically provides PORT, but set this as backup)

**Key:** `DATABASE_URL`  
**Value:** `postgresql://muncipio_db_user:cmE2lrZT3Skck7PRJ8Rua6WS20ZrwvID@dpg-d42af0je5dus73biirkg-a.frankfurt-postgres.render.com/muncipio_db`

⚠️ **Important:** Click **"Save Changes"** after adding each variable.

### Step 5: Deploy

1. Scroll down and click **"Create Web Service"**
2. Render will start building and deploying your application
3. Wait for deployment to complete (usually 2-5 minutes)
4. Once deployed, you'll see a URL like: `https://muncipio-app.onrender.com`

### Step 6: Test the Deployment

1. Open the URL in your browser
2. The map should load with all hotels
3. Test filtering and hotel updates to ensure database connection works

## Troubleshooting

### Database Connection Issues

If you see database errors in the logs:

1. Check that `DATABASE_URL` is set correctly in Environment Variables
2. Verify the database credentials are correct
3. Check that the Render PostgreSQL database is running

### Build Failures

If the build fails:

1. Check the build logs in Render dashboard
2. Ensure `package.json` has all required dependencies
3. Make sure Node version is compatible (set to 20.x in package.json)

### Frontend Not Loading

If the map doesn't appear:

1. Check browser console for errors (F12)
2. Verify all static files are being served correctly
3. Check that the API endpoints are accessible

## Viewing Logs

1. Go to your service in Render dashboard
2. Click on **"Logs"** tab
3. You'll see real-time server logs including database connection status

## Updating the Deployment

Whenever you push changes to GitHub:

1. Render automatically detects changes (if auto-deploy is enabled)
2. It will rebuild and redeploy automatically
3. You can also manually trigger a deploy from the dashboard

## Custom Domain (Optional)

1. Go to your service settings
2. Scroll to **"Custom Domains"**
3. Add your domain name
4. Follow Render's DNS configuration instructions

---

**Your Database Connection String:**
```
postgresql://muncipio_db_user:cmE2lrZT3Skck7PRJ8Rua6WS20ZrwvID@dpg-d42af0je5dus73biirkg-a.frankfurt-postgres.render.com/muncipio_db
```

Make sure this is set as the `DATABASE_URL` environment variable in Render!

