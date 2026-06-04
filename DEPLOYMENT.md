# 🚀 SOMA Deployment Guide

## **Option 1: Deploy to Railway (Recommended - Easiest)**

Railway is the easiest way to deploy Node.js apps. Takes 5 minutes.

### **Step 1: Create Railway Account**
1. Go to https://railway.app
2. Sign up (GitHub/Google)
3. Create new project

### **Step 2: Connect GitHub**
1. In Railway dashboard, click "New"
2. Select "GitHub Repo"
3. Authorize Railway to access GitHub
4. Select your `soma` repository

### **Step 3: Configure Environment**
1. In Railway, go to your project
2. Click "Variables" tab
3. Add these environment variables:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=<your-supabase-publishable-key>
SUPABASE_SERVICE_KEY=<your-supabase-service-role-key>
JWT_SECRET=<generate-a-strong-random-secret>   # e.g. openssl rand -hex 32
JWT_EXPIRY=7d
REFRESH_TOKEN_EXPIRY=30d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
NODE_ENV=production
PORT=3000
```

### **Step 4: Add Start Script**
In `Procfile` (already created):
```
web: cd backend && npm start
```

### **Step 5: Deploy**
1. Railway auto-deploys on git push
2. Or manually trigger in Railway dashboard
3. Wait 2-3 minutes for build
4. Get your domain: `https://your-soma-app.railway.app`

### **Step 6: Update Frontend**
In frontend `.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://your-soma-app.railway.app
EXPO_PUBLIC_AI_KEY=<your-groq-api-key>
```

**Then deploy frontend separately** (see below)

---

## **Option 2: Deploy Frontend (Expo Web to Vercel)**

### **Step 1: Build for Web**
```bash
cd ~/soma
npm run build:web
```

### **Step 2: Create Vercel Account**
1. Go to https://vercel.com
2. Sign up with GitHub
3. Import your repository

### **Step 3: Configure Environment**
Add same environment variables as above

### **Step 4: Deploy**
Vercel auto-deploys. Your site is live at `https://soma-app.vercel.app`

---

## **Option 3: Docker (Self-Hosted)**

If you want to run SOMA on your own server:

### **Step 1: Create Dockerfile**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### **Step 2: Build & Run**
```bash
docker build -t soma-backend .
docker run -p 3000:3000 --env-file .env soma-backend
```

### **Step 3: Deploy with Docker Compose**
Create `docker-compose.yml` for production setup

---

## **Checklist Before Going Live**

- [ ] Update `APP_URL` to your production domain
- [ ] Update `BACKEND_URL` to your backend domain
- [ ] Test all auth flows (signup, login, email verification)
- [ ] Test Groq API integration (Soma AI responses)
- [ ] Test database connections (Supabase)
- [ ] Monitor errors (check Railway logs)
- [ ] Set up SSL/HTTPS (automatic on Railway/Vercel)
- [ ] Configure CORS properly for your domain

---

## **Post-Deployment**

### **Monitor Health**
```bash
curl https://your-domain.railway.app/health
```
Should return: `{"status":"ok"}`

### **Check Logs**
```bash
# Railway logs
railway logs -f

# View errors
curl https://your-domain.railway.app/analytics/errors
```

### **Database Migrations**
If you update the schema, run migrations:
```bash
# In Supabase Dashboard → SQL Editor
# Paste from migrations.sql
```

---

## **Scaling for Production**

1. **Add Redis** for caching (premium features)
2. **Database replicas** for read scaling
3. **CDN** for static assets (Cloudflare)
4. **Load balancer** for multiple instances
5. **Email provider** (SendGrid, Mailgun instead of Gmail)
6. **Analytics service** (Mixpanel, Segment, or Sentry)

---

## **Cost Estimate**

- **Railway**: $5-20/month (depending on usage)
- **Vercel**: Free tier or $20/month pro
- **Supabase**: Free tier (up to 500MB) or $25/month
- **Domain**: $10-15/year (Namecheap, GoDaddy)
- **Email service**: Free-$30/month (Gmail app password or SendGrid)

**Total**: $15-40/month for production 🚀

---

## **Quick Deploy Commands**

```bash
# 1. Push to GitHub
git add .
git commit -m "Ready for production"
git push origin main

# 2. Watch Railway deploy
railway logs -f

# 3. Test backend
curl https://your-soma.railway.app/health

# 4. Update frontend .env with new backend URL
EXPO_PUBLIC_BACKEND_URL=https://your-soma.railway.app

# 5. Deploy frontend to Vercel
vercel --prod

# 6. Done! 🎉
```

---

For issues, check logs or reach out! 🚀
