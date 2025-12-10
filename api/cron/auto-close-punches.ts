/**
 * Vercel Cron Endpoint: Auto-Close Forgotten Punches
 *
 * ⚠️ CURRENTLY DISABLED - Will be enabled soon
 *
 * TODO: Enable cron in vercel.json when ready to deploy
 * Schedule: Every 15 minutes (*/15 * * * *)
 *
 * Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/auto-close-punches",
 *     "schedule": "*/15 * * * *"
 *   }]
 * }
 *
 * Purpose:
 * - Triggered every 15 minutes by Vercel Cron Jobs
 * - Invokes the Supabase Edge Function to process overdue punches
 * - Automatically closes forgotten punch-out entries
 *
 * Security: Validates cron secret to prevent unauthorized access.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify this is coming from Vercel Cron
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    console.log('Invoking auto-close Edge Function...');

    // Invoke the Supabase Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/auto-close-forgotten-punches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Edge Function error:', error);
      throw new Error(`Edge Function failed: ${error}`);
    }

    const result = await response.json();
    console.log('Auto-close process completed:', result);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      result
    });

  } catch (error) {
    console.error('Error in cron job:', error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
