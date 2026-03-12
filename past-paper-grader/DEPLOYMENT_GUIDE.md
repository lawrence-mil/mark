# 🚀 Deployment Guide

## Pre-Deployment Checklist

### Local Testing (✅ Complete)
- [x] Dev server running with env vars loaded
- [x] Health check passing
- [x] All API keys present and valid
- [x] Frontend accessible
- [x] Build succeeds

### Before Pushing to Railway

1. **Test the full pipeline locally**
   ```bash
   # 1. Start dev server (already running)
   npm run dev
   
   # 2. Upload a test paper file
   # 3. Test markscheme auto-detection
   # 4. Test AI grading
   ```

2. **Check logs for any errors**
   - Watch for emoji-prefixed log messages
   - Verify OCR processing shows character counts
   - Verify AI grading shows scores

3. **Review environment variables**
   ```bash
   # Verify these are set in .env
   echo "MISTRAL_API_KEY: ${MISTRAL_API_KEY:0:10}..."
   echo "OPENROUTER_API_KEY: ${OPENROUTER_API_KEY:0:10}..."
   echo "EXA_API_KEY: ${EXA_API_KEY:0:10}..."
   ```

## Deployment Steps

### Option 1: Deploy to Railway (Recommended)
```bash
cd /Users/lawrence/mark.dvv.one/past-paper-grader

# Method A: Using npm script
npm run deploy:backend    # Deploy backend only
npm run deploy:frontend   # Deploy frontend only

# Method B: Using Railway CLI directly
railway up --detach       # Deploy everything

# Method C: Using ship script
npm run ship              # Full deployment
```

### Option 2: Manual Railway Deployment
```bash
# 1. Push to git
git push origin master

# 2. Railway auto-deploys from git hooks
# (Check Railway dashboard for deployment status)
```

## Post-Deployment Verification

### 1. Check Health
```bash
curl https://your-railway-domain.up.railway.app/api/health
# Should return: {"status":"ok", "services": {"db":true, "redis":true, "ocr":true, "ai":true}}
```

### 2. Check Logs
- Open Railway dashboard
- Go to Logs tab
- Look for any error messages
- Verify emoji-prefixed logs appear during processing

### 3. Test Upload
- Visit your Railway domain
- Upload a test paper
- Watch logs for OCR processing
- Trigger markscheme detection
- Submit for grading
- Monitor for AI grading completion

## Rollback Plan

If deployment has issues:

```bash
# 1. Check Railway logs for errors
railway logs

# 2. Rollback to previous commit
git revert HEAD
git push origin master

# 3. Railway will auto-redeploy previous version
```

## Environment Variables in Railway

Ensure these are set in Railway environment:

```
DATABASE_URL=postgresql://...
REDIS_URL=rediss://...
MISTRAL_API_KEY=...
OPENROUTER_API_KEY=...
EXA_API_KEY=...
R2_ENDPOINT=...
R2_ACCESS_KEY=...
R2_SECRET_KEY=...
R2_BUCKET_NAME=...
```

All are already configured in production.

## Monitoring

### Key Metrics to Watch
- OCR success rate (look for ✅ logs)
- Markscheme detection success rate (look for 🌐 and 📚 logs)
- AI grading completion time
- Error rates (look for ❌ logs)

### Alert Conditions
- OCR service returning empty text
- OpenRouter API errors (401, 429, 500)
- Markscheme detection failing all methods
- JSON parsing errors in AI responses

## Support

For issues:
1. Check Railway logs
2. Review error messages (now more descriptive)
3. Verify API keys are valid
4. Check API service status pages:
   - Mistral: https://status.mistral.ai
   - OpenRouter: https://openrouter.ai
   - Cloudflare R2: https://www.cloudflarestatus.com

## Performance Tips

1. **Cache OCR results** - Automatic, same file processed once
2. **Batch submissions** - Process multiple papers simultaneously
3. **Monitor API usage** - Check OpenRouter credits/limits
4. **Regular backups** - Database backups via Railway

---

**Deployment Status:** Ready for production ✅
