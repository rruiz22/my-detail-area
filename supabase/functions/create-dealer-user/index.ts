import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

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
    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const {
      email,
      firstName,
      lastName,
      dealershipId,
      role,
      userType,
      sendWelcomeEmail = true,
      dealershipName
    }: CreateUserRequest = await req.json()

    console.log('Creating user with data:', { email, firstName, lastName, dealershipId, role, userType })
    
    // Validate required dealership_id
    if (!dealershipId) {
      throw new Error('dealershipId is required')
    }

    // Step 1: Create user in Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        user_type: userType,
        role: role
      }
    })

    if (authError) {
      console.error('Auth user creation failed:', authError)
      throw authError
    }

    console.log('Auth user created:', authUser.user.id)

    // Step 2: Create/update profile (this should happen automatically via trigger, but we'll ensure it)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        user_type: userType,
        role: role,
        dealership_id: dealershipId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()

    if (profileError) {
      console.error('Profile creation failed:', profileError)
      throw new Error(`Profile creation failed: ${profileError.message}`)
    }
    
    console.log('Profile created successfully:', profileData?.[0]?.id)

    // Step 3: Create dealer membership
    const { error: membershipError } = await supabase
      .from('dealer_memberships')
      .insert({
        user_id: authUser.user.id,
        dealer_id: dealershipId,
        is_active: true,
        roles: [role],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (membershipError) {
      console.error('Membership creation failed:', membershipError)
      throw membershipError
    }

    // Step 4: Send welcome email (optional)
    if (sendWelcomeEmail) {
      try {
        const { error: emailError } = await supabase.functions.invoke('send-welcome-email', {
          body: {
            email: email,
            firstName: firstName,
            dealershipName: dealershipName || 'Premium Auto'
          }
        })
        
        if (emailError) {
          console.warn('Welcome email failed:', emailError)
          // Don't fail the whole process
        }
      } catch (emailError) {
        console.warn('Welcome email service unavailable:', emailError)
      }
    }

    console.log('User creation completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authUser.user.id,
        message: 'User created successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('User creation failed:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to create user'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})