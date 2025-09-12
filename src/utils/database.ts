// Database utility functions for My Detail Area
// Provides common database operations with proper error handling and type safety

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database'

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!

export const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseKey)

// Generic error type for database operations
export interface DatabaseError {
  message: string
  code?: string
  details?: any
}

// Generic result type for database operations
export type DatabaseResult<T> = {
  data: T | null
  error: DatabaseError | null
}

// Generic paginated result type
export type PaginatedResult<T> = {
  data: T[]
  count: number | null
  error: DatabaseError | null
}

/**
 * Database utility class with common operations
 */
export class DatabaseUtils {
  private supabase: SupabaseClient<Database>

  constructor(client?: SupabaseClient<Database>) {
    this.supabase = client || supabase
  }

  /**
   * Generic select operation with filtering and pagination
   */
  async select<T extends keyof Database['public']['Tables']>(
    table: T,
    options?: {
      columns?: string
      filters?: Record<string, any>
      orderBy?: { column: string; ascending?: boolean }
      limit?: number
      offset?: number
      count?: boolean
    }
  ): Promise<PaginatedResult<Tables<T>>> {
    try {
      let query = this.supabase
        .from(table)
        .select(options?.columns || '*', { count: options?.count ? 'exact' : undefined })

      // Apply filters
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true })
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit)
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options?.limit || 10) - 1)
      }

      const result = await query

      return {
        data: result.data || [],
        count: result.count,
        error: result.error ? { message: result.error.message, code: result.error.code } : null
      }
    } catch (error) {
      return {
        data: [],
        count: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Generic insert operation
   */
  async insert<T extends keyof Database['public']['Tables']>(
    table: T,
    data: TablesInsert<T> | TablesInsert<T>[]
  ): Promise<DatabaseResult<Tables<T> | Tables<T>[]>> {
    try {
      const result = await this.supabase
        .from(table)
        .insert(data as any)
        .select()

      return {
        data: result.data,
        error: result.error ? { message: result.error.message, code: result.error.code } : null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Generic update operation
   */
  async update<T extends keyof Database['public']['Tables']>(
    table: T,
    data: TablesUpdate<T>,
    filters: Record<string, any>
  ): Promise<DatabaseResult<Tables<T>[]>> {
    try {
      let query = this.supabase
        .from(table)
        .update(data as any)
        .select()

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })

      const result = await query

      return {
        data: result.data,
        error: result.error ? { message: result.error.message, code: result.error.code } : null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Generic delete operation (soft delete if deleted_at column exists)
   */
  async delete<T extends keyof Database['public']['Tables']>(
    table: T,
    filters: Record<string, any>,
    softDelete: boolean = true
  ): Promise<DatabaseResult<Tables<T>[]>> {
    try {
      let query

      if (softDelete) {
        // Try soft delete first
        query = this.supabase
          .from(table)
          .update({ deleted_at: new Date().toISOString() } as any)
          .select()
      } else {
        query = this.supabase
          .from(table)
          .delete()
          .select()
      }

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value)
      })

      const result = await query

      return {
        data: result.data,
        error: result.error ? { message: result.error.message, code: result.error.code } : null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Get single record by ID
   */
  async getById<T extends keyof Database['public']['Tables']>(
    table: T,
    id: string | number
  ): Promise<DatabaseResult<Tables<T>>> {
    try {
      const result = await this.supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      return {
        data: result.data,
        error: result.error ? { message: result.error.message, code: result.error.code } : null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

// Create default instance
export const dbUtils = new DatabaseUtils()

/**
 * Dealership-specific database operations
 */
export class DealershipUtils extends DatabaseUtils {
  /**
   * Get dealership with all related data
   */
  async getDealershipComplete(id: number): Promise<DatabaseResult<any>> {
    try {
      const result = await this.supabase
        .from('dealerships')
        .select(`
          *,
          dealership_contacts (
            id, first_name, last_name, email, phone, position, department, is_primary
          ),
          orders (
            id, order_number, order_type, status, customer_name, total_amount, created_at
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single()

      return {
        data: result.data,
        error: result.error ? { message: result.error.message, code: result.error.code } : null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Get dealership users with their roles and permissions
   */
  async getDealershipUsers(dealershipId: number): Promise<PaginatedResult<any>> {
    try {
      const result = await this.supabase
        .from('dealer_memberships')
        .select(`
          *,
          profiles (
            id, email, first_name, last_name, avatar_url, user_type, is_active, last_login_at
          )
        `)
        .eq('dealer_id', dealershipId)
        .eq('is_active', true)

      return {
        data: result.data || [],
        count: result.data?.length || 0,
        error: result.error ? { message: result.error.message, code: result.error.code } : null
      }
    } catch (error) {
      return {
        data: [],
        count: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Check if user can access dealership
   */
  async canUserAccessDealership(userId: string, dealershipId: number): Promise<boolean> {
    try {
      const result = await this.supabase
        .from('dealer_memberships')
        .select('id')
        .eq('user_id', userId)
        .eq('dealer_id', dealershipId)
        .eq('is_active', true)
        .single()

      return !result.error && !!result.data
    } catch (error) {
      return false
    }
  }
}

/**
 * Order-specific database operations
 */
export class OrderUtils extends DatabaseUtils {
  /**
   * Create order with automatic QR code generation
   */
  async createOrderWithQR(orderData: TablesInsert<'orders'>): Promise<DatabaseResult<Tables<'orders'>>> {
    try {
      // Generate unique order number if not provided
      if (!orderData.order_number) {
        const timestamp = Date.now().toString().slice(-6)
        const random = Math.random().toString(36).substr(2, 4).toUpperCase()
        orderData.order_number = `${orderData.order_type.toUpperCase()}-${timestamp}-${random}`
      }

      const result = await this.supabase
        .from('orders')
        .insert(orderData as any)
        .select()
        .single()

      if (result.error) {
        return {
          data: null,
          error: { message: result.error.message, code: result.error.code }
        }
      }

      // Generate QR code and short link (this would typically call an edge function)
      const orderId = result.data.id
      const shortLink = `https://mda.to/${this.generateShortCode()}`
      
      // Update order with QR data
      const updateResult = await this.supabase
        .from('orders')
        .update({
          short_link: shortLink,
          qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shortLink)}`
        })
        .eq('id', orderId)
        .select()
        .single()

      return {
        data: updateResult.data,
        error: updateResult.error ? { message: updateResult.error.message, code: updateResult.error.code } : null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Update order status with audit trail
   */
  async updateOrderStatus(
    orderId: string, 
    newStatus: Database['public']['Enums']['order_status'],
    notes?: string
  ): Promise<DatabaseResult<Tables<'orders'>>> {
    try {
      const updateData: TablesUpdate<'orders'> = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      if (newStatus === 'completed') {
        updateData.actual_completion = new Date().toISOString()
      }

      const result = await this.supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single()

      // Create audit log (if you have an audit table)
      if (notes && result.data) {
        await this.supabase
          .from('messages')
          .insert({
            dealer_id: result.data.dealer_id,
            sender_id: result.data.assigned_to || result.data.created_by,
            order_id: orderId,
            message_type: 'info',
            content: `Order status updated to ${newStatus}. ${notes || ''}`,
            sent_at: new Date().toISOString()
          })
      }

      return {
        data: result.data,
        error: result.error ? { message: result.error.message, code: result.error.code } : null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Get orders with filters and pagination
   */
  async getOrders(options?: {
    dealerId?: number
    orderType?: Database['public']['Enums']['order_type']
    status?: Database['public']['Enums']['order_status']
    assignedTo?: string
    searchTerm?: string
    limit?: number
    offset?: number
  }): Promise<PaginatedResult<Tables<'orders'>>> {
    try {
      let query = this.supabase
        .from('orders')
        .select('*', { count: 'exact' })

      // Apply filters
      if (options?.dealerId) query = query.eq('dealer_id', options.dealerId)
      if (options?.orderType) query = query.eq('order_type', options.orderType)
      if (options?.status) query = query.eq('status', options.status)
      if (options?.assignedTo) query = query.eq('assigned_to', options.assignedTo)

      // Search functionality
      if (options?.searchTerm) {
        query = query.or(`order_number.ilike.%${options.searchTerm}%,customer_name.ilike.%${options.searchTerm}%,vehicle_vin.ilike.%${options.searchTerm}%`)
      }

      // Pagination and ordering
      query = query.order('created_at', { ascending: false })
      if (options?.limit) query = query.limit(options.limit)
      if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1)

      const result = await query

      return {
        data: result.data || [],
        count: result.count,
        error: result.error ? { message: result.error.message, code: result.error.code } : null
      }
    } catch (error) {
      return {
        data: [],
        count: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  private generateShortCode(length: number = 5): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}

/**
 * User management utilities
 */
export class UserUtils extends DatabaseUtils {
  /**
   * Get user profile with dealership memberships
   */
  async getUserProfile(userId: string): Promise<DatabaseResult<any>> {
    try {
      const result = await this.supabase
        .from('profiles')
        .select(`
          *,
          dealer_memberships (
            id, dealer_id, role, permissions, is_active,
            dealerships (
              id, name, status, subscription_plan
            )
          )
        `)
        .eq('id', userId)
        .single()

      return {
        data: result.data,
        error: result.error ? { message: result.error.message, code: result.error.code } : null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Get user permissions for a specific dealership
   */
  async getUserPermissions(userId: string, dealershipId: number): Promise<DatabaseResult<any>> {
    try {
      const result = await this.supabase
        .from('dealer_memberships')
        .select('role, permissions')
        .eq('user_id', userId)
        .eq('dealer_id', dealershipId)
        .eq('is_active', true)
        .single()

      return {
        data: result.data,
        error: result.error ? { message: result.error.message, code: result.error.code } : null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Create user invitation
   */
  async createUserInvitation(
    email: string, 
    dealershipId: number, 
    role: Database['public']['Enums']['user_role']
  ): Promise<DatabaseResult<any>> {
    try {
      // This would typically involve:
      // 1. Creating a pending invitation record
      // 2. Sending an invitation email
      // 3. Returning the invitation details
      
      const invitationData = {
        email,
        dealership_id: dealershipId,
        role,
        invited_at: new Date().toISOString(),
        is_active: false
      }

      // For now, we'll return a mock response
      // In a real implementation, this would create the invitation record
      return {
        data: invitationData,
        error: null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

/**
 * Real-time subscription utilities
 */
export class RealtimeUtils {
  private supabase: SupabaseClient<Database>

  constructor(client?: SupabaseClient<Database>) {
    this.supabase = client || supabase
  }

  /**
   * Subscribe to order status changes
   */
  subscribeToOrderUpdates(dealershipId: number, callback: (payload: any) => void) {
    return this.supabase
      .channel(`orders-${dealershipId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `dealer_id=eq.${dealershipId}`
        },
        callback
      )
      .subscribe()
  }

  /**
   * Subscribe to new messages
   */
  subscribeToMessages(dealershipId: number, callback: (payload: any) => void) {
    return this.supabase
      .channel(`messages-${dealershipId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `dealer_id=eq.${dealershipId}`
        },
        callback
      )
      .subscribe()
  }

  /**
   * Subscribe to user notifications
   */
  subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  }
}

// Create utility instances
export const dealershipUtils = new DealershipUtils()
export const orderUtils = new OrderUtils()
export const userUtils = new UserUtils()
export const realtimeUtils = new RealtimeUtils()

// Export all utilities as a single object
export const db = {
  utils: dbUtils,
  dealership: dealershipUtils,
  orders: orderUtils,
  users: userUtils,
  realtime: realtimeUtils,
  supabase
}

export default db