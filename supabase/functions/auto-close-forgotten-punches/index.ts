import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =====================================================
// TYPES
// =====================================================

interface OverduePunch {
  time_entry_id: string;
  employee_id: string;
  employee_name: string;
  employee_phone: string;
  employee_preferred_language: 'en' | 'es' | 'pt-BR';
  dealership_id: number;
  clock_in: string;
  shift_end_time: string;
  shift_end_datetime: string;
  minutes_overdue: number;
  action: 'first_reminder' | 'auto_close';
  reminder_count: number;
  last_reminder_at: string | null;
  employee_first_reminder: number;
  employee_auto_close_window: number;
}

type SupportedLanguage = 'en' | 'es' | 'pt-BR';

// =====================================================
// LOCALIZED MESSAGES (No reply expected - one-way SMS)
// =====================================================

function getReminderMessage(language: SupportedLanguage, shiftEndTime: string): string {
  const messages = {
    'en': `Reminder: Please clock out your shift that ended at ${shiftEndTime}.`,
    'es': `Recordatorio: Por favor registra tu salida del turno que terminó a las ${shiftEndTime}.`,
    'pt-BR': `Lembrete: Por favor registre sua saída do turno que terminou às ${shiftEndTime}.`
  };
  return messages[language] || messages['en'];
}

function getAutoCloseConfirmationMessage(language: SupportedLanguage): string {
  const messages = {
    'en': 'Your timecard has been automatically closed. Your supervisor will be notified for review.',
    'es': 'Tu tarjeta de tiempo ha sido cerrada automáticamente. Tu supervisor será notificado para revisión.',
    'pt-BR': 'Seu cartão de ponto foi fechado automaticamente. Seu supervisor será notificado para revisão.'
  };
  return messages[language] || messages['en'];
}

// =====================================================
// MAIN HANDLER
// =====================================================

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
            await sendReminder(punch);
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

// =====================================================
// SEND REMINDER (SMS only, no push notification)
// =====================================================

async function sendReminder(punch: OverduePunch) {
  console.log(`Sending reminder for punch ${punch.time_entry_id} in language: ${punch.employee_preferred_language}`);

  const language = punch.employee_preferred_language || 'en';
  const message = getReminderMessage(language, punch.shift_end_time);

  // Send SMS only (no push notifications)
  let smsSent = false;
  let smsSid = null;

  if (punch.employee_phone) {
    try {
      // Format phone number with +1 if not already formatted
      const formattedPhone = punch.employee_phone.startsWith('+')
        ? punch.employee_phone
        : `+1${punch.employee_phone.replace(/\D/g, '')}`;

      const smsResponse = await supabase.functions.invoke('enhanced-sms', {
        body: {
          to: formattedPhone,
          message,
          dealerId: punch.dealership_id
        }
      });

      if (smsResponse.data?.messageSid) {
        smsSent = true;
        smsSid = smsResponse.data.messageSid;
        console.log(`SMS sent successfully: ${smsSid}`);
      } else if (smsResponse.error) {
        console.error('SMS error:', smsResponse.error);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
    }
  } else {
    console.log(`No phone number for employee ${punch.employee_id}, skipping SMS`);
  }

  // Log reminder (push_sent always false - no push notifications)
  await supabase.from('detail_hub_punch_out_reminders').insert({
    time_entry_id: punch.time_entry_id,
    employee_id: punch.employee_id,
    dealership_id: punch.dealership_id,
    reminder_type: 'first',
    sms_sent: smsSent,
    sms_sid: smsSid,
    push_sent: false, // No push notifications
    shift_end_time: punch.shift_end_time,
    minutes_overdue: punch.minutes_overdue
  });

  console.log(`Reminder sent for punch ${punch.time_entry_id}`);
}

// =====================================================
// AUTO-CLOSE PUNCH (with SMS confirmation)
// =====================================================

async function autoClosePunch(punch: OverduePunch) {
  console.log(`Auto-closing punch ${punch.time_entry_id}`);

  const now = new Date().toISOString();
  const language = punch.employee_preferred_language || 'en';

  // Determine clock_out time: use shift_end_datetime if it's after clock_in, otherwise use NOW
  // This handles the edge case where someone clocks in AFTER their shift end time
  const clockInTime = new Date(punch.clock_in).getTime();
  const shiftEndTime = new Date(punch.shift_end_datetime).getTime();
  const clockOutTime = shiftEndTime > clockInTime ? punch.shift_end_datetime : now;

  console.log(`Clock in: ${punch.clock_in}, Shift end: ${punch.shift_end_datetime}, Using clock_out: ${clockOutTime}`);

  // Language-specific auto-close reason for database
  const autoCloseReason = language === 'es'
    ? `Auto-cerrado después de ${punch.employee_auto_close_window} minutos desde el fin del turno (${punch.shift_end_time}). ${punch.reminder_count} recordatorio(s) enviado(s).`
    : language === 'pt-BR'
    ? `Fechado automaticamente após ${punch.employee_auto_close_window} minutos do fim do turno (${punch.shift_end_time}). ${punch.reminder_count} lembrete(s) enviado(s).`
    : `Auto-closed after ${punch.employee_auto_close_window} minutes from shift end (${punch.shift_end_time}). ${punch.reminder_count} reminder(s) sent.`;

  // Close the time entry
  // NOTE: Do NOT include punch_out_method as there's a check constraint that blocks it
  // The constraint `detail_hub_time_entries_punch_out_method_check` only allows
  // certain values and 'auto_close' is not in the allowed list
  const { error: updateError } = await supabase
    .from('detail_hub_time_entries')
    .update({
      clock_out: clockOutTime,
      // punch_out_method intentionally omitted due to check constraint
      status: 'complete',
      auto_close_reason: autoCloseReason,
      auto_closed_at: now,
      requires_supervisor_review: true,
      notes: autoCloseReason
    })
    .eq('id', punch.time_entry_id);

  if (updateError) {
    console.error(`Error auto-closing punch ${punch.time_entry_id}:`, updateError);
    throw updateError;
  }

  // Send confirmation SMS to employee
  let confirmationSmsSent = false;
  let confirmationSmsSid = null;

  if (punch.employee_phone) {
    try {
      const confirmationMessage = getAutoCloseConfirmationMessage(language);
      // Format phone number with +1 if not already formatted
      const formattedPhone = punch.employee_phone.startsWith('+')
        ? punch.employee_phone
        : `+1${punch.employee_phone.replace(/\D/g, '')}`;

      const smsResponse = await supabase.functions.invoke('enhanced-sms', {
        body: {
          to: formattedPhone,
          message: confirmationMessage,
          dealerId: punch.dealership_id
        }
      });

      if (smsResponse.data?.messageSid) {
        confirmationSmsSent = true;
        confirmationSmsSid = smsResponse.data.messageSid;
        console.log(`Auto-close confirmation SMS sent: ${confirmationSmsSid}`);
      } else if (smsResponse.error) {
        console.error('Auto-close SMS error:', smsResponse.error);
      }
    } catch (error) {
      console.error('Error sending auto-close confirmation SMS:', error);
    }
  }

  // Log auto-close event
  await supabase.from('detail_hub_punch_out_reminders').insert({
    time_entry_id: punch.time_entry_id,
    employee_id: punch.employee_id,
    dealership_id: punch.dealership_id,
    reminder_type: 'auto_close',
    sms_sent: confirmationSmsSent,
    sms_sid: confirmationSmsSid,
    push_sent: false, // No push notifications
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
      requires_supervisor_review: true,
      confirmation_sms_sent: confirmationSmsSent
    },
    notes: autoCloseReason
  });

  console.log(`Punch ${punch.time_entry_id} auto-closed successfully. Confirmation SMS sent: ${confirmationSmsSent}`);
}

serve(handler);
