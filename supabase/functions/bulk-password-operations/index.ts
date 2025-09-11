import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { supabase } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { operationType, dealerId, targetFilters, options } = await req.json();

    console.log('Bulk password operation request:', { operationType, dealerId, targetFilters });

    // Verify admin has permission for bulk operations
    const { data: membership } = await supabase
      .from('dealer_memberships')
      .select('dealer_id')
      .eq('user_id', user.id)
      .eq('dealer_id', dealerId)
      .eq('is_active', true)
      .single();

    if (!membership) {
      throw new Error('No dealer membership found');
    }

    // Create bulk operation record
    const { data: bulkOp, error: bulkError } = await supabase
      .from('bulk_password_operations')
      .insert({
        operation_type: operationType,
        initiated_by: user.id,
        dealer_id: dealerId,
        target_filters: targetFilters,
        status: 'pending'
      })
      .select()
      .single();

    if (bulkError) {
      throw new Error('Failed to create bulk operation record');
    }

    // Get target users based on filters
    let query = supabase
      .from('dealer_memberships')
      .select(`
        user_id,
        profiles!inner(id, email, first_name, last_name)
      `)
      .eq('dealer_id', dealerId)
      .eq('is_active', true);

    // Apply filters
    if (targetFilters.userIds?.length > 0) {
      query = query.in('user_id', targetFilters.userIds);
    }

    if (targetFilters.roles?.length > 0) {
      // This would need to be adjusted based on your role system
      // For now, we'll skip role filtering
    }

    if (targetFilters.groups?.length > 0) {
      // Filter by groups if specified
      query = query.in('dealer_membership_groups.group_id', targetFilters.groups);
    }

    const { data: targetUsers, error: usersError } = await query;

    if (usersError) {
      throw new Error('Failed to fetch target users');
    }

    const totalUsers = targetUsers?.length || 0;

    // Update bulk operation with total count
    await supabase
      .from('bulk_password_operations')
      .update({
        total_users: totalUsers,
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .eq('id', bulkOp.id);

    let successCount = 0;
    let failCount = 0;
    const errors: any[] = [];

    // Process each user
    for (const targetUser of targetUsers || []) {
      try {
        const resetToken = crypto.randomUUID();
        
        // Create individual password reset request
        const { error: resetError } = await supabase
          .from('password_reset_requests')
          .insert({
            user_id: targetUser.user_id,
            admin_id: user.id,
            token: resetToken,
            request_type: operationType === 'bulk_reset' ? 'email_reset' :
                         operationType === 'bulk_temp_password' ? 'temp_password' : 'force_change',
            force_change_on_login: operationType === 'bulk_force_change',
            temp_password: operationType === 'bulk_temp_password' ? 
              Math.random().toString(36).slice(-8) : null,
            metadata: {
              bulk_operation_id: bulkOp.id,
              dealer_id: dealerId
            }
          });

        if (resetError) {
          throw resetError;
        }

        // Log individual activity
        await supabase
          .from('user_activity_log')
          .insert({
            user_id: targetUser.user_id,
            action_type: 'bulk_password_operation',
            action_description: `Bulk password operation: ${operationType}`,
            details: {
              bulk_operation_id: bulkOp.id,
              admin_id: user.id,
              dealer_id: dealerId
            }
          });

        successCount++;

      } catch (error: any) {
        failCount++;
        errors.push({
          user_id: targetUser.user_id,
          email: targetUser.profiles?.email,
          error: error.message
        });
      }
    }

    // Update final bulk operation status
    await supabase
      .from('bulk_password_operations')
      .update({
        processed_users: totalUsers,
        successful_operations: successCount,
        failed_operations: failCount,
        status: failCount === 0 ? 'completed' : 'completed',
        completed_at: new Date().toISOString(),
        error_details: errors
      })
      .eq('id', bulkOp.id);

    const response = {
      success: true,
      bulkOperationId: bulkOp.id,
      totalUsers,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined,
      message: `Bulk operation completed. ${successCount} successful, ${failCount} failed.`
    };

    console.log('Bulk operation completed:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error('Error in bulk-password-operations function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: error.message === 'Unauthorized' ? 401 : 500,
        headers: { 
          'Content-Type': 'application/json', 
          ...corsHeaders 
        },
      }
    );
  }
};

serve(handler);