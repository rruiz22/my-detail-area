import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Inline CORS headers (no external dependency)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface CreateUserRequest {
  email: string
  firstName: string
  lastName: string
  dealershipId: number
  role: string
  userType: 'dealer' | 'detail'
  sendWelcomeEmail?: boolean
  dealershipName?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== CREATE DEALER USER START ===')
    console.log('Request method:', req.method)
    console.log('Request URL:', req.url)
    console.log('Request headers:', Object.fromEntries(req.headers.entries()))

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

    // Check environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('Environment check:')
    console.log('- SUPABASE_URL exists:', !!supabaseUrl)
    console.log('- SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceKey)
    console.log('- SUPABASE_URL value:', supabaseUrl)

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

    // Verify user is authenticated and has admin privileges
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

    // Create Supabase client to verify admin permissions
    const tempSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the JWT token from the authorization header
    const token = authHeader.replace('Bearer ', '')

    // Verify the user has admin role
    const { data: userData, error: userError } = await tempSupabase.auth.getUser(token)
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

    // Check if user has admin role
    const { data: profile, error: profileError } = await tempSupabase
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !profile || !['system_admin', 'supermanager'].includes(profile.role)) {
      console.error('User does not have required privileges:', profileError || 'Missing system_admin or supermanager role')

      // Log security event
      await tempSupabase
        .from('security_audit_log')
        .insert({
          event_type: 'unauthorized_user_creation_attempt',
          user_id: userData.user?.id,
          event_details: {
            attempted_email: requestBody?.email,
            user_role: profile?.role || 'unknown'
          },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
          success: false
        })

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Forbidden: system_admin or supermanager role required'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      )
    }

    console.log('✅ Admin authentication verified for user:', userData.user.id)

    // Parse and validate request body
    let requestBody: any
    try {
      requestBody = await req.json()
      console.log('Raw request body:', JSON.stringify(requestBody, null, 2))
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
    const requiredFields = ['email', 'firstName', 'lastName', 'dealershipId', 'role', 'userType']
    const missingFields = requiredFields.filter(field => !requestBody[field])

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}`
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Validate data types
    const {
      email,
      firstName,
      lastName,
      dealershipId,
      role,
      userType,
      sendWelcomeEmail = true,
      dealershipName
    }: CreateUserRequest = requestBody

    // Type validation
    if (typeof email !== 'string' || !email.includes('@')) {
      console.error('Invalid email format:', email)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email format'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (typeof dealershipId !== 'number' || dealershipId <= 0) {
      console.error('Invalid dealershipId:', dealershipId, typeof dealershipId)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid dealershipId: must be a positive number'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (!['dealer', 'detail'].includes(userType)) {
      console.error('Invalid userType:', userType)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid userType: must be "dealer" or "detail"'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Validated input data:', {
      email,
      firstName,
      lastName,
      dealershipId,
      role,
      userType,
      sendWelcomeEmail,
      dealershipName
    })

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Supabase client created successfully')

    // Validate that the dealership exists
    console.log('=== VALIDATING DEALERSHIP ===')
    const { data: dealership, error: dealershipError } = await supabase
      .from('dealerships')
      .select('id, name')
      .eq('id', dealershipId)
      .single()

    if (dealershipError || !dealership) {
      console.error('Dealership validation failed:', dealershipError)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid dealership ID: ${dealershipId}. Dealership not found.`,
          details: dealershipError
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('✅ Dealership validated:', dealership.name)

    console.log('Creating user with data:', { email, firstName, lastName, dealershipId, role, userType })

    // Validate required dealership_id
    if (!dealershipId) {
      throw new Error('dealershipId is required')
    }

    // Step 1: Create user in Auth
    console.log('=== STEP 1: Creating Auth User ===')
    const authPayload = {
      email: email,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        user_type: userType,
        role: role
      }
    }
    console.log('Auth payload:', JSON.stringify(authPayload, null, 2))

    const { data: authUser, error: authError } = await supabase.auth.admin.createUser(authPayload)

    if (authError) {
      console.error('=== AUTH ERROR ===')
      console.error('Auth error details:', JSON.stringify(authError, null, 2))
      console.error('Auth error message:', authError.message)
      console.error('Auth error status:', authError.status)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Auth creation failed: ${authError.message}`,
          details: authError
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    if (!authUser?.user?.id) {
      console.error('Auth user created but no ID returned:', authUser)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Auth user created but no ID returned'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('✅ Auth user created successfully:', authUser.user.id)

    // Log successful user creation
    await tempSupabase
      .from('security_audit_log')
      .insert({
        event_type: 'user_created_successfully',
        user_id: userData.user.id,
        event_details: {
          created_user_email: email,
          created_user_id: authUser.user.id,
          dealership_id: dealershipId,
          user_type: userType,
          role: role
        },
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
        success: true
      })

    // Step 2: Create/update profile (this should happen automatically via trigger, but we'll ensure it)
    console.log('=== STEP 2: Creating Profile ===')
    const profilePayload = {
      id: authUser.user.id,
      email: email,
      first_name: firstName,
      last_name: lastName,
      user_type: userType,
      role: 'user', // All dealer users = 'user' (custom role defines permissions)
      dealership_id: dealershipId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    console.log('Profile payload:', JSON.stringify(profilePayload, null, 2))

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload)
      .select()

    if (profileError) {
      console.error('=== PROFILE ERROR ===')
      console.error('Profile error details:', JSON.stringify(profileError, null, 2))
      console.error('Profile error message:', profileError.message)
      console.error('Profile error code:', profileError.code)
      console.error('Profile error hint:', profileError.hint)
      // Don't throw here, profile might be created by trigger
      console.log('⚠️ Profile creation failed, but continuing (might be created by trigger)')
    } else {
      console.log('✅ Profile created/updated successfully:', profileData)
    }

    console.log('Profile created successfully:', profileData?.[0]?.id)

    // Step 3: Create dealer membership
    console.log('=== STEP 3: Creating Dealer Membership ===')
    const membershipPayload = {
      user_id: authUser.user.id,
      dealer_id: dealershipId,
      is_active: true,
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    console.log('Membership payload:', JSON.stringify(membershipPayload, null, 2))

    const { data: membershipData, error: membershipError } = await supabase
      .from('dealer_memberships')
      .insert(membershipPayload)
      .select()

    if (membershipError) {
      console.error('=== MEMBERSHIP ERROR ===')
      console.error('Membership error details:', JSON.stringify(membershipError, null, 2))
      console.error('Membership error message:', membershipError.message)
      console.error('Membership error code:', membershipError.code)
      console.error('Membership error hint:', membershipError.hint)

      // Try to clean up the auth user if membership fails
      try {
        console.log('Attempting to clean up auth user due to membership failure')
        await supabase.auth.admin.deleteUser(authUser.user.id)
        console.log('Auth user cleanup successful')
      } catch (cleanupError) {
        console.error('Auth user cleanup failed:', cleanupError)
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Membership creation failed: ${membershipError.message}`,
          details: membershipError
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('✅ Membership created successfully:', membershipData)

    // Log successful user creation for security audit
    try {
      await supabase
        .from('security_audit_log')
        .insert({
          event_type: 'user_created_successfully',
          user_id: userData.user.id,
          event_details: {
            created_user_id: authUser.user.id,
            created_user_email: email,
            dealership_id: dealershipId,
            user_type: userType,
            role: role
          },
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
          success: true
        })
      console.log('✅ Security audit logged')
    } catch (auditError) {
      console.warn('⚠️ Failed to log security audit:', auditError)
    }

    // Step 3.1: Handle role assignment through dealer groups (optional for now)
    console.log('=== STEP 3.1: Role Assignment (Future Enhancement) ===')
    console.log(`Note: Role "${role}" will need to be assigned through dealer groups system`)
    console.log('For now, user is created with basic membership - role assignment can be done via admin panel')

    // Step 4: Send welcome email (optional)
    console.log('=== STEP 4: Sending Welcome Email ===')
    if (sendWelcomeEmail) {
      try {
        console.log('Attempting to send welcome email to:', email)
        const emailPayload = {
          email: email,
          firstName: firstName,
          dealershipName: dealershipName || 'Premium Auto'
        }
        console.log('Email payload:', JSON.stringify(emailPayload, null, 2))

        const { data: emailData, error: emailError } = await supabase.functions.invoke('send-welcome-email', {
          body: emailPayload
        })

        if (emailError) {
          console.warn('⚠️ Welcome email failed:', JSON.stringify(emailError, null, 2))
          // Don't fail the whole process
        } else {
          console.log('✅ Welcome email sent successfully:', emailData)
        }
      } catch (emailError) {
        console.warn('⚠️ Welcome email service unavailable:', emailError)
      }
    } else {
      console.log('⏭️ Skipping welcome email (sendWelcomeEmail = false)')
    }

    console.log('=== USER CREATION COMPLETED SUCCESSFULLY ===')
    console.log('Final user details:', {
      user_id: authUser.user.id,
      email: email,
      dealership_id: dealershipId,
      role: role,
      userType: userType
    })

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authUser.user.id,
        email: email,
        dealership_id: dealershipId,
        message: 'User created successfully',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('=== UNEXPECTED ERROR ===')
    console.error('Error type:', typeof error)
    console.error('Error name:', error?.name)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))

    return new Response(
      JSON.stringify({
        success: false,
        error: error?.message || 'Unexpected error occurred',
        error_type: error?.name || 'UnknownError',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
