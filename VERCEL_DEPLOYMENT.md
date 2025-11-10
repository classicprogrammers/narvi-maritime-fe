# Vercel Deployment Guide

## Quick Setup

1. **Connect your repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository
   - Vercel will auto-detect Create React App

2. **Configure Environment Variables**
   In Vercel Dashboard → Settings → Environment Variables, add:
   ```
   REACT_APP_API_BASE_URL=https://your-api-url.com
   REACT_APP_BACKEND_URL=https://your-backend-url.com
   NODE_ENV=production
   ```

3. **Deploy**
   - Push to your main branch
   - Vercel will automatically deploy

## Build Optimization

The build is optimized with:
- ✅ Source maps disabled (smaller bundle size)
- ✅ Legacy peer deps enabled (resolves dependency conflicts)
- ✅ Node 18+ required
- ✅ Static asset caching configured
- ✅ SPA routing configured

## Troubleshooting

### Build Fails
- Check Node version (should be 18+)
- Verify all environment variables are set
- Check build logs in Vercel dashboard

### Runtime Errors
- Ensure API URLs are correct in environment variables
- Check browser console for CORS errors
- Verify API endpoints are accessible

### 404 Errors on Routes
- This is normal for SPAs - Vercel.json handles routing
- All routes redirect to index.html

## Environment Variables

Required for production:
- `REACT_APP_API_BASE_URL` - Your API base URL
- `REACT_APP_BACKEND_URL` - Your backend URL (fallback)

Optional:
- `NODE_ENV=production` - Already set in vercel.json

