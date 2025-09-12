import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables, TablesInsert, TablesUpdate } from '@/types/database';

const supabaseUrl = "https://swfnnrpzpkdypbrzmgnr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY";

export interface DatabaseError {
  message: string;
  code?: string;
}

export interface DatabaseResult<T> {
  data: T | null;
  error: DatabaseError | null;
}

export interface DatabaseResultWithCount<T> {
  data: T;
  count: number | null;
  error: DatabaseError | null;
}

export interface QueryOptions {
  select?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
}

/**
 * Enhanced Database Utility Class with improved error handling and type safety
 */
export class DatabaseUtils {
  private supabase: SupabaseClient<Database>;

  constructor() {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  /**
   * Generic select operation with enhanced error handling
   */
  async select<T extends keyof Database['public']['Tables']>(
    table: T,
    options?: QueryOptions
  ): Promise<DatabaseResultWithCount<any[]>> {
    try {
      let query = this.supabase
        .from(table)
        .select(options?.select || '*', { count: 'exact' });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending !== false 
        });
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
    data: any | any[]
  ): Promise<DatabaseResult<any | any[]>> {
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
    data: any,
    filters: Record<string, any>
  ): Promise<DatabaseResult<any[]>> {
    try {
      let query = this.supabase
        .from(table)
        .update(data as any)
        .select()

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = (query as any).eq(key, value)
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
   * Generic delete operation
   */
  async delete<T extends keyof Database['public']['Tables']>(
    table: T,
    filters: Record<string, any>
  ): Promise<DatabaseResult<any[]>> {
    try {
      let query = this.supabase
        .from(table)
        .delete()
        .select()

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = (query as any).eq(key, value)
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
  ): Promise<DatabaseResult<any>> {
    try {
      const result = await this.supabase
        .from(table)
        .select('*')
        .eq('id', id as any)
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
   * Execute custom query with RPC
   */
  async rpc<T = any>(
    functionName: string,
    params?: any
  ): Promise<DatabaseResult<T>> {
    try {
      // Use client method to bypass strict typing
      const result = await (this.supabase as any).rpc(functionName, params);

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
   * Get current user
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      return {
        data: user,
        error: error ? { message: error.message } : null
      }
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }

  /**
   * Authentication
   */
  get auth() {
    return this.supabase.auth;
  }

  /**
   * Storage
   */
  get storage() {
    return this.supabase.storage;
  }

  /**
   * Get raw Supabase client for advanced operations
   */
  get client() {
    return this.supabase;
  }
}

// Export singleton instance
const db = new DatabaseUtils();
export default db;