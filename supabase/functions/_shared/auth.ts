// Authentication utilities for Edge Functions

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { UnauthorizedError, ForbiddenError } from './errors.ts'

export interface AuthenticatedUser {
  id: string
  email: string
  dealer_id?: number
  role?: string
  system_role?: string
}

// Create Supabase client with user context
export function createSupabaseClient(req: Request): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: req.headers.get('Authorization')! },
    },
  })
}

// Create Supabase admin client (service role)
export function createSupabaseAdminClient(): SupabaseClient {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role key')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Get authenticated user from JWT
export async function getAuthenticatedUser(req: Request): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No authorization token provided')
  }

  const supabase = createSupabaseClient(req)

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new UnauthorizedError('Invalid authorization token')
  }

  // Get user profile with dealer association
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('id, email, dealer_id, system_role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new UnauthorizedError('User profile not found')
  }

  return {
    id: user.id,
    email: user.email!,
    dealer_id: profile.dealer_id,
    system_role: profile.system_role,
  }
}

// Verify user has access to dealer
export function verifyDealerAccess(user: AuthenticatedUser, dealerId: number): void {
  // Super admins can access all dealers
  if (user.system_role === 'super_admin') {
    return
  }

  if (!user.dealer_id || user.dealer_id !== dealerId) {
    throw new ForbiddenError('Access denied to this dealership')
  }
}

// Verify user has required permission
export async function verifyPermission(
  supabase: SupabaseClient,
  userId: string,
  permission: string
): Promise<void> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('id')
    .eq('user_id', userId)
    .eq('permission', permission)
    .eq('enabled', true)
    .single()

  if (error || !data) {
    throw new ForbiddenError(`Missing required permission: ${permission}`)
  }
}

// Generate request ID for tracing
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`
}

// Extract IP address from request
export function getClientIP(req: Request): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         undefined
}

// Extract user agent from request
export function getUserAgent(req: Request): string | undefined {
  return req.headers.get('user-agent') || undefined
}
