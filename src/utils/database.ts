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

export type TableName = keyof Database['public']['Tables'];
export type TableRow<T extends TableName> = Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends TableName> = Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends TableName> = Database['public']['Tables'][T]['Update'];

export interface DatabaseFilters {
  [key: string]: string | number | boolean | null;
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
  async select<T extends TableName>(
    table: T,
    options?: QueryOptions
  ): Promise<DatabaseResultWithCount<TableRow<T>[]>> {
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
        data: (result.data as TableRow<T>[]) || [],
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
  async insert<T extends TableName>(
    table: T,
    data: TableInsert<T> | TableInsert<T>[]
  ): Promise<DatabaseResult<TableRow<T> | TableRow<T>[]>> {
    try {
      const result = await this.supabase
        .from(table)
        .insert(data as TableInsert<T> | TableInsert<T>[])
        .select()

      return {
        data: result.data as TableRow<T> | TableRow<T>[],
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
  async update<T extends TableName>(
    table: T,
    data: TableUpdate<T>,
    filters: DatabaseFilters
  ): Promise<DatabaseResult<TableRow<T>[]>> {
    try {
      let query = this.supabase
        .from(table)
        .update(data)
        .select()

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key as keyof TableRow<T>, value)
      })

      const result = await query

      return {
        data: result.data as TableRow<T>[],
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
  async delete<T extends TableName>(
    table: T,
    filters: DatabaseFilters
  ): Promise<DatabaseResult<TableRow<T>[]>> {
    try {
      let query = this.supabase
        .from(table)
        .delete()
        .select()

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key as keyof TableRow<T>, value)
      })

      const result = await query

      return {
        data: result.data as TableRow<T>[],
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
  async getById<T extends TableName>(
    table: T,
    id: string | number
  ): Promise<DatabaseResult<TableRow<T>>> {
    try {
      const result = await this.supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

      return {
        data: result.data as TableRow<T>,
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
  async rpc<T = unknown>(
    functionName: string,
    params?: Record<string, unknown>
  ): Promise<DatabaseResult<T>> {
    try {
      // Use client method to bypass strict typing
      const result = await this.supabase.rpc(functionName, params);

      return {
        data: result.data as T,
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