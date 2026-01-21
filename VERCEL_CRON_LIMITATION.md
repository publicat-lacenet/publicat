# Vercel Cron Job Limitation (Hobby Account)

## Context

This project includes an RSS feed system that automatically fetches and updates video content from configured RSS sources. The automatic synchronization is handled by a cron job endpoint at `/api/cron/fetch-rss`.

## Problem Found

When deploying to Vercel with a Hobby (free) account, the following error appears when attempting to configure frequent cron schedules:

```
Error: Hobby accounts are limited to daily cron jobs. Upgrade to Pro to unlock more frequent schedules.
```

**Account type:** Vercel Hobby (free tier)
**Limitation:** Only allows cron jobs that run once per day maximum

## Current Configuration

The `vercel.json` file is configured with:

```json
{
  "crons": [
    {
      "path": "/api/cron/fetch-rss",
      "schedule": "0 0 * * *"
    }
  ]
}
```

- **Current (working):** `"0 0 * * *"` - Runs once daily at midnight UTC
- **Desired:** `"*/15 * * * *"` - Every 15 minutes (requires Pro)

## UI Configuration Note

The application UI allows administrators to configure an "Interval d'actualització" (update interval) for RSS feeds, with options like every 60 minutes.

**Important caveat:** With a Vercel Hobby account, the RSS feeds will only be fetched **once per day** regardless of the interval configured in the UI. The UI setting is intended for when the account is upgraded to Pro.

## Future Solution

To enable more frequent RSS updates:

1. **Upgrade to Vercel Pro** - This unlocks flexible cron schedules
2. Update `vercel.json` to the desired schedule:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/fetch-rss",
         "schedule": "*/15 * * * *"
       }
     ]
   }
   ```

With Vercel Pro, you can configure cron jobs to run as frequently as every minute if needed.

## Workarounds (Optional)

If more frequent updates are needed without upgrading:

1. **Manual trigger:** Call `/api/cron/fetch-rss` manually via the admin interface
2. **External cron service:** Use a free service like cron-job.org to call the endpoint
3. **GitHub Actions:** Set up a scheduled workflow to trigger the endpoint
