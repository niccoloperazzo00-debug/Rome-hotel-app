# Render Deployment Guide

## Prerequisites
- GitHub account with your code pushed
- Render account (free tier works)
- PostgreSQL database on Render (already created)

## Step 1: Prepare Your Repository

1. Make sure all your changes are committed and pushed to GitHub:
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

## Step 2: Create a Web Service on Render

1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository:
   - Select the repository: `muncipio-app` (or your repo name)
   - Choose the branch: `main`

## Step 3: Configure the Web Service

### Basic Settings:
- **Name**: `muncipio-app` (or your preferred name)
- **Environment**: `Node`
- **Region**: Choose closest to your users (e.g., Frankfurt)
- **Branch**: `main`
- **Root Directory**: `.` (project root - leave empty or use `.`)
- **Build Command**: `cd backend && npm install`
- **Start Command**: `cd backend && npm start`

### Environment Variables:
Click **"Add Environment Variable"** and add:

1. **DATABASE_URL**
   ```
   postgresql://muncipio_db_user:cmE2lrZT3Skck7PRJ8Rua6WS20ZrwvID@dpg-d42af0je5dus73biirkg-a.frankfurt-postgres.render.com/muncipio_db
   ```

2. **NODE_ENV**
   ```
   production
   ```

3. **PORT** (optional - Render sets this automatically, but you can set it if needed)
   ```
   5000
   ```

## Step 4: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies (`npm install` in the backend folder)
   - Start your server
3. Wait for deployment to complete (2-5 minutes)
4. You'll get a URL like: `https://muncipio-app.onrender.com`

## Step 5: Test Your Deployment

1. Visit your Render URL
2. Check the logs in Render dashboard for any errors
3. Test the API endpoint: `https://your-app.onrender.com/api/hotels`

## Important Notes

### Database Connection
- Your database is already on Render PostgreSQL
- The connection string uses SSL (automatically handled by `pool.js`)
- Make sure the database has the `hotels` table created

### Static Files
- Your frontend files (index.html, hotels.js, etc.) are served from the root directory
- The server is configured to serve them via `express.static`

### CORS
- CORS is configured to allow requests in production (frontend served from same domain)
- No additional CORS setup needed

## Troubleshooting

### If you see "Cannot GET /"
- Make sure Root Directory is set to `backend`
- Check that `index.html` is in the parent directory of `backend`

### If database connection fails:
- Verify `DATABASE_URL` environment variable is set correctly
- Check database credentials in Render PostgreSQL dashboard
- Ensure database allows connections from Render IPs

### If API calls fail:
- Check browser console for CORS errors
- Verify `config.js` is imported correctly
- Check server logs in Render dashboard

## Updating Your Deployment

After pushing changes to GitHub:
1. Render will automatically detect changes
2. It will rebuild and redeploy
3. Usually takes 2-5 minutes

You can also manually trigger a deploy from the Render dashboard.

