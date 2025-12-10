# Vercel Cron Jobs

## Status: ⚠️ CURRENTLY DISABLED

The cron jobs in this directory are **temporarily disabled** and will be enabled soon.

## Auto-Close Forgotten Punches

**Endpoint**: `/api/cron/auto-close-punches`
**Schedule**: Every 15 minutes (`*/15 * * * *`)
**Status**: 🔴 Disabled

### Purpose
Automatically closes forgotten punch-out entries for employees who forgot to clock out at the end of their shift.

### How to Enable

1. **Set Environment Variables** in Vercel Dashboard:
   ```bash
   CRON_SECRET=your-secure-random-string
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Enable in `vercel.json`**:
   ```json
   {
     "crons": [{
       "path": "/api/cron/auto-close-punches",
       "schedule": "*/15 * * * *"
     }]
   }
   ```

3. **Deploy to Vercel**:
   ```bash
   git add vercel.json
   git commit -m "feat: enable auto-close cron job"
   git push
   ```

### Architecture

```
Vercel Cron (every 15 min)
    ↓
/api/cron/auto-close-punches (this endpoint)
    ↓
Supabase Edge Function: auto-close-forgotten-punches
    ↓
Process overdue punches and auto-close
```

### Testing

Test the cron endpoint locally:

```bash
curl -X POST http://localhost:8080/api/cron/auto-close-punches \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Security

- Requires `CRON_SECRET` in Authorization header
- Uses Supabase Service Role Key for elevated permissions
- Validates all requests before processing

### Monitoring

Check cron execution logs in:
- Vercel Dashboard → Project → Logs
- Supabase Dashboard → Edge Functions → Logs

---

**Last Updated**: December 10, 2025
**Implementation Status**: Code complete, pending production enablement
