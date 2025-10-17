# Production Deployment Guide

## ✅ What's Been Set Up

1. **Upstash Redis Integration** - Your app now supports both local and production Redis
2. **Environment Variables** - Upstash credentials added to `.env`
3. **Auto-detection** - Code automatically detects Upstash vs local Redis

## 📝 Deploy to Production (Vercel/Netlify/etc)

### Step 1: Add Environment Variables to Your Hosting Platform

In your hosting dashboard (Vercel, Netlify, etc.), add these environment variables:

```bash
# Upstash Redis (REQUIRED)
UPSTASH_REDIS_REST_URL=https://discrete-mammoth-25838.upstash.io
UPSTASH_REDIS_REST_TOKEN=AWTuAAIncDIxNTIxYTIxOGIyNDI0NmEzOWNmM2YyZTEwM2ZjY2RmNXAyMjU4Mzg

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app-domain.vercel.app
NEXT_PUBLIC_STACKS_NETWORK=testnet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=218b206bb2759dbc6a5b7b69948a9af5

# Stacks Configuration
STACKS_HTLC_CONTRACT=ST3QA58TFC73X12Z2B809AMS6V14Y0FA4VR2TTYMF.stx-htlc
STACKS_NETWORK=testnet
STACKS_RESOLVER_PRIVATE_KEY=60a11a70d6fce4e80692daeed1815e723013f45ee1c1836c5c1501afed26c38901

# EVM Resolver Configuration
RESOLVER_PRIVATE_KEY=0xb5bba28246a3faed68d623ba0cc5cf129b00bdbeaa5e29ed7ce6a41688cdfaa1
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/xK5UUg_CThKPWlfCEDjuN_Es8wFFQ1zk
```

### Step 2: Deploy

```bash
# Push to your git repository
git add .
git commit -m "Add Upstash Redis support for production"
git push

# Your hosting platform will auto-deploy (if connected)
# Or manually trigger deployment in your dashboard
```

### Step 3: Verify Deployment

Once deployed, test the relayer API:

```bash
# Replace with your actual deployment URL
export APP_URL=https://your-app.vercel.app

# Test order creation
curl -X POST $APP_URL/api/relayer/orders \
  -H "Content-Type: application/json" \
  -d '{
    "hash": "test_' $(date +%s) '",
    "hashLock": { "sha256": "0xabcd1234..." },
    "srcChainId": 11155111,
    "dstChainId": 5230,
    "order": {
      "orderId": "order_test",
      "timestamp": ' $(date +%s000) ',
      "status": "CREATED"
    }
  }'

# Check the order was stored
curl $APP_URL/api/relayer/orders/test_<timestamp>/status
```

## 🔧 How It Works

### Local Development (with local Redis)
```bash
# Uses local Redis if no Upstash vars
npm run dev
# Connects to: redis://localhost:6379
```

### Production (with Upstash)
```bash
# Automatically uses Upstash when env vars are set
# No code changes needed!
```

## 🚨 Important Notes

### The Resolver Bot Challenge

Your relayer API is now working, **BUT** there's still one issue:

**The Resolver Bot needs to run 24/7** to create counter-escrows.

Current setup:
- ✅ Relayer API (Next.js routes) - Works in production
- ❌ Resolver Bot - Only runs when API route is called

### Solutions:

#### Option 1: Vercel Cron Jobs (Recommended for MVP)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/resolver/process-orders",
      "schedule": "* * * * *"
    }
  ]
}
```

Then create `/api/resolver/process-orders/route.ts` that checks for pending orders.

#### Option 2: Separate Resolver Service

Deploy resolver as a standalone Node.js service:
- Railway (easiest)
- Render
- AWS Lambda with EventBridge
- Your own VPS

#### Option 3: Simplify Architecture

Remove the resolver entirely and make users wait for manual counterparty matching (more decentralized but worse UX).

## 📊 Monitoring

### Check Redis Data (Upstash Dashboard)
- Visit: https://console.upstash.com/
- View your database
- See stored orders in real-time

### Check Application Logs
- Vercel: Dashboard → Your Project → Logs
- Look for: "Order created", "Resolver processing"

## 🐛 Troubleshooting

### "Order stuck at CREATED"
- ✅ Redis is storing orders (check Upstash dashboard)
- ❌ Resolver isn't creating counter-escrows
- **Solution**: Implement resolver bot (see options above)

### "No Redis client available"
- Check UPSTASH_REDIS_REST_URL and TOKEN are set
- Redeploy after adding env vars

### "Invalid resolver private key"
- Make sure RESOLVER_PRIVATE_KEY and STACKS_RESOLVER_PRIVATE_KEY are set
- Keys must have 0x prefix for EVM

## 🎯 Next Steps

1. ✅ **You've completed**: Upstash Redis integration
2. 🔄 **Next**: Deploy to production
3. ⏳ **Then**: Implement resolver bot (see options above)
4. ⏳ **Finally**: Test end-to-end swap on live site

## 📚 Resources

- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Railway Deployment](https://railway.app/template)

---

Last Updated: October 17, 2025
