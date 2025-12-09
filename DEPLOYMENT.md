# GitTLDR Deployment Guide

Complete guide to deploy GitTLDR on free tiers.

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │     │   Node Worker   │     │  Python Worker  │
│   (Vercel)      │◄───►│   (Render)      │◄───►│   (Render)      │
│   Port: 3000    │     │   Port: 3001    │     │   Port: 8001    │
└─────────────────┘     └────────┬────────┘     └────────┬────────┘
                                 │                       │
                        ┌────────▼────────┐     ┌────────▼────────┐
                        │   PostgreSQL    │     │     Qdrant      │
                        │   (Neon/Render) │     │  (Qdrant Cloud) │
                        └─────────────────┘     └─────────────────┘
                                 │
                        ┌────────▼────────┐
                        │     Redis       │
                        │   (Upstash)     │
                        └─────────────────┘
```

---

## Step 1: Set Up External Services (Free Tiers)

### PostgreSQL - Neon
1. Go to [neon.tech](https://neon.tech)
2. Create account → New Project
3. Copy the connection string: `postgresql://user:pass@host/db?sslmode=require`

### Redis - Upstash
1. Go to [upstash.com](https://upstash.com)
2. Create account → Create Database
3. Select region closest to your Render region
4. Copy the Redis URL: `rediss://default:xxx@host:port`

### Vector Database - Qdrant Cloud
1. Go to [cloud.qdrant.io](https://cloud.qdrant.io)
2. Create account → Create Cluster (Free tier)
3. Copy the URL and API key

---

## Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and connect your GitHub
2. Import the GitTLDR repository
3. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
4. Add environment variables:
   ```
   DATABASE_URL=<your-neon-postgres-url>
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=<generate-random-string>
   GITHUB_CLIENT_ID=<your-github-oauth-id>
   GITHUB_CLIENT_SECRET=<your-github-oauth-secret>
   NEXT_PUBLIC_NODE_WORKER_URL=https://gittldr-node-worker.onrender.com
   NEXT_PUBLIC_PYTHON_WORKER_URL=https://gittldr-python-worker.onrender.com
   ```
5. Click Deploy

---

## Step 3: Deploy Node Worker to Render (Manual)

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `gittldr-node-worker`
   - **Root Directory**: `node-worker`
   - **Runtime**: Docker
   - **Instance Type**: Free
4. Add environment variables:
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<your-neon-postgres-url>
   REDIS_URL=<your-upstash-redis-url>
   PYTHON_WORKER_URL=https://gittldr-python-worker.onrender.com
   GITHUB_CLIENT_ID=<your-github-oauth-id>
   GITHUB_CLIENT_SECRET=<your-github-oauth-secret>
   NEXTAUTH_SECRET=<same-as-frontend>
   ```
5. Click **Create Web Service**

---

## Step 4: Deploy Python Worker to Render (Manual)

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect same GitHub repository
3. Configure:
   - **Name**: `gittldr-python-worker`
   - **Root Directory**: `python-worker`
   - **Runtime**: Docker
   - **Instance Type**: Free
4. Add environment variables:
   ```
   PORT=8001
   DATABASE_URL=<your-neon-postgres-url>
   REDIS_URL=<your-upstash-redis-url>
   GEMINI_API_KEY=<your-gemini-api-key>
   GEMINI_API_KEYS=<key1,key2,key3>
   QDRANT_URL=<your-qdrant-cloud-url>
   QDRANT_API_KEY=<your-qdrant-api-key>
   QUEUE_NAME=gittldr_tasks
   ENABLE_GRAPH_RETRIEVAL=false
   ```
5. Click **Create Web Service**

---

## Step 5: Create PostgreSQL on Render (Optional)

If you prefer Render's database over Neon:

1. Render Dashboard → **New** → **PostgreSQL**
2. Select Free tier
3. Copy the **Internal Database URL** for services on Render
4. Update `DATABASE_URL` in both workers

---

## Step 6: Update Service URLs

After all services are deployed, update the cross-references:

1. **Frontend** (Vercel): Update `NEXT_PUBLIC_NODE_WORKER_URL` and `NEXT_PUBLIC_PYTHON_WORKER_URL` with actual Render URLs
2. **Node Worker** (Render): Update `PYTHON_WORKER_URL` with Python worker's Render URL
3. Redeploy services after updating URLs

---

## GitHub OAuth Setup

1. Go to GitHub → Settings → Developer Settings → OAuth Apps
2. Create new OAuth App:
   - **Homepage URL**: `https://your-app.vercel.app`
   - **Authorization callback URL**: `https://your-app.vercel.app/api/auth/callback/github`
3. Copy Client ID and Client Secret
4. Add to Frontend and Node Worker environment variables

---

## CI/CD Pipeline

The GitHub Actions workflow (`ci.yml`) runs on every push:

- ✅ Python tests (pytest)
- ✅ Node tests (Jest)
- ✅ Frontend build check

**Note**: Automatic deployment is not included (requires paid Render tier). After CI passes, manually trigger redeployment on Render if needed.

---

## Free Tier Limitations

| Service | Limitation |
|---------|-----------|
| **Render Free** | Services sleep after 15 min inactivity, spin up takes ~30s |
| **Neon Free** | 0.5GB storage, suspends after 5 days inactivity |
| **Upstash Free** | 10K commands/day |
| **Qdrant Cloud** | 1GB storage |
| **Vercel Free** | Unlimited, but serverless function limits |

---

## Environment Variables Summary

### Frontend (Vercel)
```
DATABASE_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
NEXT_PUBLIC_NODE_WORKER_URL
NEXT_PUBLIC_PYTHON_WORKER_URL
```

### Node Worker (Render)
```
NODE_ENV=production
PORT=3001
DATABASE_URL
REDIS_URL
PYTHON_WORKER_URL
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
NEXTAUTH_SECRET
```

### Python Worker (Render)
```
PORT=8001
DATABASE_URL
REDIS_URL
GEMINI_API_KEY
GEMINI_API_KEYS
QDRANT_URL
QDRANT_API_KEY
QUEUE_NAME=gittldr_tasks
ENABLE_GRAPH_RETRIEVAL=false
```

---

## Troubleshooting

### Services not communicating
- Ensure URLs don't have trailing slashes
- Check CORS settings in Node worker
- Verify all services are awake (not sleeping)

### Authentication issues
- Ensure `NEXTAUTH_SECRET` is the same across Frontend and Node Worker
- Verify GitHub OAuth callback URL matches your Vercel domain

### Python worker not processing jobs
- Ensure `main.py` is running (combines API + worker)
- Check Redis connection in logs
- Verify `QUEUE_NAME` matches across services
