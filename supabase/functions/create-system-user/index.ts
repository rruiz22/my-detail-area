import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

interface CreateSystemUserRequest {
  email: string
  firstName: string
  lastName: string
  role: 'system_admin' | 'supermanager'
  primaryDealershipId?: number | null
  sendWelcomeEmail?: boolean
  allowedModules?: string[]  // 🆕 Required for supermanagers
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== CREATE SYSTEM USER START ===')

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing environment variables' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authentication token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role, email')
      .eq('id', userData.user.id)
      .single()

    if (!callerProfile || callerProfile.role !== 'system_admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Only system_admin can create system users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const requestBody: CreateSystemUserRequest = await req.json()
    const { email, firstName, lastName, role, primaryDealershipId, sendWelcomeEmail, allowedModules } = requestBody

    if (!email || !firstName || !lastName || !role) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 🆕 Validate supermanagers have at least 1 allowed module
    if (role === 'supermanager' && (!allowedModules || allowedModules.length === 0)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Supermanagers must have at least one allowed module'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const fullName = `${firstName} ${lastName}`

    const { data: existingUser } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'User already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Creating auth user:', email)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, first_name: firstName, last_name: lastName, role }
    })

    if (authError || !authUser?.user) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ success: false, error: authError?.message || 'Auth creation failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Auth user created:', authUser.user.id)
    console.log('Updating profile...')

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role,
        first_name: firstName,
        last_name: lastName,
        dealership_id: primaryDealershipId || null
      })
      .eq('id', authUser.user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Profile update failed: ${profileError.message}`,
          details: profileError
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('Profile updated successfully')

    // ✅ FIX: Create dealer_memberships based on role type
    if (role === 'supermanager' || role === 'system_admin') {
      // For supermanagers/system_admins: create memberships for ALL dealerships (global access)
      console.log('Creating global dealer memberships for', role)

      const { data: dealerships, error: dealerError } = await supabaseAdmin
        .from('dealerships')
        .select('id')
        .is('deleted_at', null)

      if (dealerError) {
        console.error('Failed to fetch dealerships:', dealerError)
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to setup global access: ${dealerError.message}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      if (dealerships && dealerships.length > 0) {
        const memberships = dealerships.map(dealer => ({
          user_id: authUser.user.id,
          dealer_id: dealer.id,
          is_active: true,
          custom_role_id: null  // Supermanagers bypass via code logic
        }))

        const { error: membershipError } = await supabaseAdmin
          .from('dealer_memberships')
          .insert(memberships)

        if (membershipError) {
          console.error('Failed to create dealer memberships:', membershipError)
          await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
          return new Response(
            JSON.stringify({
              success: false,
              error: `Failed to setup dealer memberships: ${membershipError.message}`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

        console.log(`✅ Created ${memberships.length} dealer memberships for ${role}`)
      }
    } else if (primaryDealershipId) {
      // For regular dealer users: create membership for single dealership
      const { data: adminRole } = await supabaseAdmin
        .from('dealer_custom_roles')
        .select('id')
        .eq('dealer_id', primaryDealershipId)
        .eq('role_name', 'admin')
        .maybeSingle()

      const { error: membershipError } = await supabaseAdmin
        .from('dealer_memberships')
        .insert({
          user_id: authUser.user.id,
          dealer_id: primaryDealershipId,
          custom_role_id: adminRole?.id,
          is_active: true
        })

      if (membershipError) {
        console.error('Failed to create dealer membership:', membershipError)
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to setup dealer membership: ${membershipError.message}`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
    }

    // 🆕 Set allowed modules for supermanagers
    if (role === 'supermanager' && allowedModules && allowedModules.length > 0) {
      console.log(`Setting ${allowedModules.length} allowed modules for supermanager:`, allowedModules)

      const { error: modulesError } = await supabaseAdmin
        .rpc('set_user_allowed_modules', {
          target_user_id: authUser.user.id,
          modules: allowedModules
        })

      if (modulesError) {
        console.error('Failed to set allowed modules:', modulesError)
        // Rollback: delete user
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to set allowed modules: ${modulesError.message}`,
            details: modulesError
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      console.log(`✅ Set allowed modules for ${email}:`, allowedModules)
    }

    console.log('User created successfully')

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authUser.user.id,
        email,
        role,
        message: `System user (${role}) created successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Unexpected error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
