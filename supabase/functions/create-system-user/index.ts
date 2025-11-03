import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

interface CreateSystemUserRequest {
  email: string
  full_name: string
  custom_role_id?: string | null
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== CREATE SYSTEM USER START ===')
    console.log('Request method:', req.method)

    // Validate request method
    if (req.method !== 'POST') {
      console.error('Invalid request method:', req.method)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Method not allowed. Use POST.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405,
        }
      )
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('Environment check:')
    console.log('- SUPABASE_URL exists:', !!supabaseUrl)
    console.log('- SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey)

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error: Missing environment variables'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    // Verify user is authenticated
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Missing authentication token'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get JWT token from authorization header
    const token = authHeader.replace('Bearer ', '')

    // Verify the calling user
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData.user) {
      console.error('Invalid authentication token:', userError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Invalid authentication token'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      )
    }

    // CRITICAL: Check if calling user is system_admin
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', userData.user.id)
      .single()

    if (callerProfileError || !callerProfile || callerProfile.role !== 'system_admin') {
      console.error('User is not system_admin:', callerProfileError || callerProfile?.role)

      // Log security event
      await supabaseAdmin
        .from('security_audit_log')
        .insert({
          event_type: 'unauthorized_system_user_creation_attempt',
          user_id: userData.user.id,
          event_details: {
            caller_role: callerProfile?.role || 'unknown',
            caller_email: callerProfile?.email || 'unknown'
          },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
          success: false
        })

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Forbidden: Only system_admin can create system users'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    console.log('✅ system_admin authentication verified:', callerProfile.email)

    // Parse and validate request body
    let requestBody: CreateSystemUserRequest
    try {
      requestBody = await req.json()
      console.log('Request body received:', {
        email: requestBody.email,
        full_name: requestBody.full_name,
        has_custom_role: !!requestBody.custom_role_id
      })
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Validate required fields
    const { email, full_name, custom_role_id } = requestBody

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      console.error('Invalid email:', email)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email address'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (!full_name || typeof full_name !== 'string' || full_name.trim().length === 0) {
      console.error('Invalid full_name:', full_name)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid full_name: must be a non-empty string'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Validated input data:', { email, full_name, custom_role_id })

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      console.error('User already exists:', email)
      return new Response(
        JSON.stringify({
          success: false,
          error: `User with email ${email} already exists`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Step 1: Create user in Auth
    console.log('=== STEP 1: Creating Auth User ===')
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name,
        role: 'supermanager'
      }
    })

    if (authError || !authUser?.user) {
      console.error('Auth creation failed:', authError)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Auth creation failed: ${authError?.message || 'Unknown error'}`,
          details: authError
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('✅ Auth user created:', authUser.user.id)

    // Step 2: Update profile to supermanager
    console.log('=== STEP 2: Updating Profile to supermanager ===')
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: 'supermanager',
        dealership_id: null, // Global access - no specific dealership
        full_name: full_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', authUser.user.id)

    if (profileError) {
      console.error('Profile update failed:', profileError)

      // ROLLBACK: Delete auth user
      try {
        console.log('Rolling back: deleting auth user')
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        console.log('✅ Rollback successful')
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError)
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Profile update failed: ${profileError.message}`,
          details: profileError
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('✅ Profile updated to supermanager')

    // Step 3: Optionally assign custom role
    if (custom_role_id) {
      console.log('=== STEP 3: Assigning Custom Role ===')

      // Validate custom role exists
      const { data: customRole, error: roleCheckError } = await supabaseAdmin
        .from('dealer_custom_roles')
        .select('id, name')
        .eq('id', custom_role_id)
        .single()

      if (roleCheckError || !customRole) {
        console.warn('⚠️ Custom role not found:', custom_role_id)
        // Don't fail - supermanager can still function without custom role
      } else {
        const { error: roleAssignError } = await supabaseAdmin
          .from('user_custom_role_assignments')
          .insert({
            user_id: authUser.user.id,
            custom_role_id: custom_role_id,
            created_at: new Date().toISOString()
          })

        if (roleAssignError) {
          console.warn('⚠️ Custom role assignment failed:', roleAssignError)
          // Don't fail - supermanager is created successfully
        } else {
          console.log('✅ Custom role assigned:', customRole.name)
        }
      }
    }

    // Step 4: Log to audit table
    console.log('=== STEP 4: Logging to Audit ===')
    try {
      await supabaseAdmin
        .from('security_audit_log')
        .insert({
          event_type: 'system_user_created',
          user_id: userData.user.id,
          event_details: {
            created_user_id: authUser.user.id,
            created_user_email: email,
            created_user_role: 'supermanager',
            caller_email: callerProfile.email,
            custom_role_assigned: !!custom_role_id
          },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
          success: true
        })
      console.log('✅ Audit logged')
    } catch (auditError) {
      console.warn('⚠️ Audit logging failed:', auditError)
      // Don't fail - user is created successfully
    }

    console.log('=== SYSTEM USER CREATION COMPLETED ===')
    console.log('Final user details:', {
      user_id: authUser.user.id,
      email: email,
      role: 'supermanager',
      dealership_id: null,
      custom_role_assigned: !!custom_role_id
    })

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authUser.user.id,
        email: email,
        role: 'supermanager',
        dealership_id: null,
        message: 'System user (supermanager) created successfully',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('=== UNEXPECTED ERROR ===')
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)

    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unexpected error occurred',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
