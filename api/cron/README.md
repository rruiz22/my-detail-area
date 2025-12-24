# Auto-Close Cron Jobs

## Status: ✅ ACTIVE (GitHub Actions)

The auto-close system is now powered by **GitHub Actions** (free tier).

## Auto-Close Forgotten Punches

**Workflow**: `.github/workflows/auto-close-punches.yml`
**Schedule**: Every 15 minutes (`*/15 * * * *`)
**Status**: 🟢 Active

### Purpose

Automatically closes forgotten punch-out entries for employees who forgot to clock out at the end of their shift. Sends SMS and Push notification reminders before auto-closing.

### Architecture

```
GitHub Actions (every 15 min)
    ↓
Supabase Edge Function: auto-close-forgotten-punches
    ↓
RPC: find_overdue_punches()
    ↓
Process: Send reminders → Auto-close after window
```

---

## How to Configure GitHub Actions Secrets

### Step 1: Go to Repository Settings

1. Open your GitHub repository
2. Click **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**

### Step 2: Add Required Secrets

Click **New repository secret** for each:

| Secret Name | Description | Where to Find |
|-------------|-------------|---------------|
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (NOT anon key) | Supabase Dashboard → Settings → API → service_role key |

**Example values:**
```
SUPABASE_URL = https://abcdefghijk.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **Important**: Use the `service_role` key, NOT the `anon` key. The service role key has elevated permissions needed to process punches across all dealerships.

### Step 3: Verify Secrets are Configured

1. Go to **Actions** tab in your repository
2. Find the "Auto-Close Forgotten Punches" workflow
3. Click **Run workflow** → **Run workflow** (manual trigger)
4. Check the logs to verify it connects successfully

---

## Employee Configuration

Employees must have auto-close enabled in their assignment to be processed:

1. Go to **Detail Hub** → **Employee Portal**
2. Click **Edit Assignment** on an employee
3. Enable **Auto-Close Forgotten Punch-Outs**
4. Configure timing:
   - **First Reminder**: Minutes after shift end (default: 30)
   - **Second Reminder**: Minutes after shift end (default: 60)
   - **Auto-Close Window**: Minutes until auto-close (default: 120)

### Default Timing Example

If employee's `shift_end_time` is `18:00` (6 PM):
- 18:30 → First SMS/Push reminder
- 19:00 → Second (urgent) reminder
- 20:00 → Auto-close with supervisor review flag

---

## Monitoring

### GitHub Actions Logs
- Go to **Actions** tab → Click on a workflow run → View logs

### Supabase Edge Function Logs
- Supabase Dashboard → Edge Functions → `auto-close-forgotten-punches` → Logs

### Database Tables
- `detail_hub_punch_out_reminders` - Log of all reminders sent
- `detail_hub_time_entries` - Entries with `punch_out_method = 'auto_close'`

---

## Testing

### Manual Trigger
1. Go to **Actions** tab
2. Select "Auto-Close Forgotten Punches"
3. Click **Run workflow**

### Test with curl
```bash
curl -X POST \
  "https://YOUR_PROJECT.supabase.co/functions/v1/auto-close-forgotten-punches" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

---

## Legacy: Vercel Cron (Deprecated)

The file `api/cron/auto-close-punches.ts` is kept for reference but is **no longer used**.
GitHub Actions is now the preferred method as it's free and doesn't require Vercel Pro.

---

**Last Updated**: December 2025
**Implementation**: GitHub Actions + Supabase Edge Functions
