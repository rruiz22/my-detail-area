import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface OverduePunch {
  time_entry_id: string;
  employee_id: string;
  employee_name: string;
  employee_phone: string;
  dealership_id: number;
  clock_in: string;
  shift_end_time: string;
  shift_end_datetime: string;
  minutes_overdue: number;
  action: 'first_reminder' | 'second_reminder' | 'auto_close';
  reminder_count: number;
  last_reminder_at: string | null;
  employee_first_reminder: number;
  employee_second_reminder: number;
  employee_auto_close_window: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting auto-close forgotten punches process...');

    // Get all dealerships
    const { data: dealerships, error: dealershipError } = await supabase
      .from('dealerships')
      .select('id');

    if (dealershipError) {
      console.error('Error fetching dealerships:', dealershipError);
      throw dealershipError;
    }

    if (!dealerships || dealerships.length === 0) {
      console.log('No dealerships found');
      return new Response(
        JSON.stringify({ message: 'No dealerships', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalProcessed = 0;
    const results = [];

    for (const dealership of dealerships) {
      console.log(`Processing dealership ${dealership.id}...`);

      // Find overdue punches for this dealership
      // RPC function filters by employees with auto_close_enabled = true
      const { data: overduePunches, error: punchError } = await supabase
        .rpc('find_overdue_punches', {
          p_dealership_id: dealership.id
        });

      if (punchError) {
        console.error(`Error finding punches for dealership ${dealership.id}:`, punchError);
        results.push({
          dealership_id: dealership.id,
          error: punchError.message,
          processed: 0
        });
        continue;
      }

      if (!overduePunches || overduePunches.length === 0) {
        console.log(`No overdue punches for dealership ${dealership.id}`);
        results.push({
          dealership_id: dealership.id,
          processed: 0
        });
        continue;
      }

      console.log(`Found ${overduePunches.length} overdue punches for dealership ${dealership.id}`);

      for (const punch of overduePunches as OverduePunch[]) {
        try {
          if (punch.action === 'first_reminder') {
            await sendFirstReminder(punch);
            totalProcessed++;
          } else if (punch.action === 'second_reminder') {
            await sendSecondReminder(punch);
            totalProcessed++;
          } else if (punch.action === 'auto_close') {
            await autoClosePunch(punch);
            totalProcessed++;
          }
        } catch (error) {
          console.error(`Error processing punch ${punch.time_entry_id}:`, error);
        }
      }

      results.push({
        dealership_id: dealership.id,
        processed: overduePunches.length
      });
    }

    console.log(`Auto-close process completed. Total processed: ${totalProcessed}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-close function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function sendFirstReminder(punch: OverduePunch) {
  console.log(`Sending first reminder for punch ${punch.time_entry_id}`);

  const message = `Recordatorio: Por favor registra tu salida del turno que terminó a las ${punch.shift_end_time}. Responde DONE cuando hayas registrado tu salida.`;

  // Send SMS (always enabled for per-employee auto-close)
  let smsSent = false;
  let smsSid = null;
  if (punch.employee_phone) {
    try {
      const smsResponse = await supabase.functions.invoke('enhanced-sms', {
        body: {
          to: punch.employee_phone,
          message,
          entityType: 'time_entry',
          entityId: punch.time_entry_id,
          dealerId: punch.dealership_id
        }
      });

      if (smsResponse.data?.messageSid) {
        smsSent = true;
        smsSid = smsResponse.data.messageSid;
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
    }
  }

  // Send push notification (always enabled for per-employee auto-close)
  let pushSent = false;
  try {
    await supabase.functions.invoke('push-notification-sender', {
      body: {
        dealerId: punch.dealership_id,
        payload: {
          title: 'Recordatorio de Salida',
          body: message,
          url: '/detail-hub/kiosk',
          requireInteraction: false
        }
      }
    });
    pushSent = true;
  } catch (error) {
    console.error('Error sending push notification:', error);
  }

  // Log reminder
  await supabase.from('detail_hub_punch_out_reminders').insert({
    time_entry_id: punch.time_entry_id,
    employee_id: punch.employee_id,
    dealership_id: punch.dealership_id,
    reminder_type: 'first',
    sms_sent: smsSent,
    sms_sid: smsSid,
    push_sent: pushSent,
    shift_end_time: punch.shift_end_time,
    minutes_overdue: punch.minutes_overdue
  });

  console.log(`First reminder sent for punch ${punch.time_entry_id}`);
}

async function sendSecondReminder(punch: OverduePunch) {
  console.log(`Sending second reminder for punch ${punch.time_entry_id}`);

  const remainingMinutes = punch.employee_auto_close_window - punch.minutes_overdue;
  const message = `URGENTE: No has registrado tu salida del turno que terminó a las ${punch.shift_end_time}. Este registro se cerrará automáticamente en ${remainingMinutes} minutos.`;

  // Send SMS (always enabled for per-employee auto-close)
  let smsSent = false;
  let smsSid = null;
  if (punch.employee_phone) {
    try {
      const smsResponse = await supabase.functions.invoke('enhanced-sms', {
        body: {
          to: punch.employee_phone,
          message,
          entityType: 'time_entry',
          entityId: punch.time_entry_id,
          dealerId: punch.dealership_id
        }
      });

      if (smsResponse.data?.messageSid) {
        smsSent = true;
        smsSid = smsResponse.data.messageSid;
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
    }
  }

  // Send push notification with requireInteraction (always enabled for per-employee auto-close)
  let pushSent = false;
  try {
    await supabase.functions.invoke('push-notification-sender', {
      body: {
        dealerId: punch.dealership_id,
        payload: {
          title: 'URGENTE: Registrar Salida',
          body: message,
          url: '/detail-hub/kiosk',
          requireInteraction: true
        }
      }
    });
    pushSent = true;
  } catch (error) {
    console.error('Error sending push notification:', error);
  }

  // Log reminder
  await supabase.from('detail_hub_punch_out_reminders').insert({
    time_entry_id: punch.time_entry_id,
    employee_id: punch.employee_id,
    dealership_id: punch.dealership_id,
    reminder_type: 'second',
    sms_sent: smsSent,
    sms_sid: smsSid,
    push_sent: pushSent,
    shift_end_time: punch.shift_end_time,
    minutes_overdue: punch.minutes_overdue
  });

  console.log(`Second reminder sent for punch ${punch.time_entry_id}`);
}

async function autoClosePunch(punch: OverduePunch) {
  console.log(`Auto-closing punch ${punch.time_entry_id}`);

  const now = new Date().toISOString();
  const autoCloseReason = `Auto-cerrado después de ${punch.employee_auto_close_window} minutos desde el fin del turno (${punch.shift_end_time}). ${punch.reminder_count} recordatorios enviados.`;

  // Close the time entry (always require supervisor review for per-employee auto-close)
  const { error: updateError } = await supabase
    .from('detail_hub_time_entries')
    .update({
      clock_out: punch.shift_end_datetime, // Use shift end as clock_out time
      punch_out_method: 'auto_close',
      status: 'complete',
      auto_close_reason: autoCloseReason,
      auto_closed_at: now,
      requires_supervisor_review: true,
      notes: `AUTO-CERRADO: Turno terminó a las ${punch.shift_end_time}. No se registró salida manual. ${punch.reminder_count} recordatorios enviados. Requiere revisión del supervisor.`
    })
    .eq('id', punch.time_entry_id);

  if (updateError) {
    console.error(`Error auto-closing punch ${punch.time_entry_id}:`, updateError);
    throw updateError;
  }

  // Log auto-close event
  await supabase.from('detail_hub_punch_out_reminders').insert({
    time_entry_id: punch.time_entry_id,
    employee_id: punch.employee_id,
    dealership_id: punch.dealership_id,
    reminder_type: 'auto_close',
    sms_sent: false,
    push_sent: false,
    shift_end_time: punch.shift_end_time,
    minutes_overdue: punch.minutes_overdue
  });

  // Log audit entry
  await supabase.from('detail_hub_time_entry_audit').insert({
    time_entry_id: punch.time_entry_id,
    changed_by: null, // System action
    action: 'auto_close',
    changes: {
      clock_out: punch.shift_end_datetime,
      punch_out_method: 'auto_close',
      auto_close_reason: autoCloseReason,
      requires_supervisor_review: true
    },
    notes: autoCloseReason
  });

  console.log(`Punch ${punch.time_entry_id} auto-closed successfully`);
}

serve(handler);
