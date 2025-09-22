// Auto-generated database types for My Detail Area
// Generated from Supabase migrations analysis
// Project: swfnnrpzpkdypbrzmgnr
// Generated on: 2025-09-11

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// Enums
export type DealershipStatus = 'active' | 'inactive' | 'suspended'
export type SubscriptionPlan = 'basic' | 'premium' | 'enterprise'
export type UserRole = 'admin' | 'manager' | 'technician' | 'viewer'
export type UserDepartment = 'detailing' | 'wash' | 'service'
export type ContactDepartment = 'sales' | 'service' | 'parts' | 'management' | 'other'
export type LanguageCode = 'en' | 'es' | 'pt-BR'
export type UserType = 'system_admin' | 'dealer_admin' | 'dealer_manager' | 'dealer_user'
export type OrderType = 'sales' | 'service' | 'recon' | 'carwash'
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded' | 'cancelled'
export type MessageType = 'info' | 'warning' | 'success' | 'error'
export type NotificationType = 'order_update' | 'payment' | 'system' | 'reminder' | 'chat'
export type TagType = 'vehicle' | 'location' | 'order' | 'tool'
export type ActionType = 'read' | 'write' | 'update' | 'locate'
export type SettingType = 'smtp' | 'sms' | 'security' | 'features' | 'app_config' | 'integration'

export interface Database {
  public: {
    Tables: {
      // Core dealership management
      dealerships: {
        Row: {
          id: number
          name: string
          email: string
          phone?: string
          address?: string
          city?: string
          state?: string
          zip_code?: string
          country: string
          website?: string
          tax_number?: string
          logo_url?: string
          primary_color: string
          status: DealershipStatus
          subscription_plan: SubscriptionPlan
          max_users: number
          notes?: string
          created_at: string
          updated_at: string
          deleted_at?: string
        }
        Insert: {
          id?: number
          name: string
          email: string
          phone?: string
          address?: string
          city?: string
          state?: string
          zip_code?: string
          country?: string
          website?: string
          tax_number?: string
          logo_url?: string
          primary_color?: string
          status?: DealershipStatus
          subscription_plan?: SubscriptionPlan
          max_users?: number
          notes?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string
        }
        Update: {
          id?: number
          name?: string
          email?: string
          phone?: string
          address?: string
          city?: string
          state?: string
          zip_code?: string
          country?: string
          website?: string
          tax_number?: string
          logo_url?: string
          primary_color?: string
          status?: DealershipStatus
          subscription_plan?: SubscriptionPlan
          max_users?: number
          notes?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string
        }
      }

      dealership_contacts: {
        Row: {
          id: number
          dealership_id: number
          first_name: string
          last_name: string
          email: string
          phone?: string
          mobile_phone?: string
          position?: string
          department: ContactDepartment
          is_primary: boolean
          can_receive_notifications: boolean
          preferred_language: LanguageCode
          notes?: string
          avatar_url?: string
          status: DealershipStatus
          created_at: string
          updated_at: string
          deleted_at?: string
        }
        Insert: {
          id?: number
          dealership_id: number
          first_name: string
          last_name: string
          email: string
          phone?: string
          mobile_phone?: string
          position?: string
          department?: ContactDepartment
          is_primary?: boolean
          can_receive_notifications?: boolean
          preferred_language?: LanguageCode
          notes?: string
          avatar_url?: string
          status?: DealershipStatus
          created_at?: string
          updated_at?: string
          deleted_at?: string
        }
        Update: {
          id?: number
          dealership_id?: number
          first_name?: string
          last_name?: string
          email?: string
          phone?: string
          mobile_phone?: string
          position?: string
          department?: ContactDepartment
          is_primary?: boolean
          can_receive_notifications?: boolean
          preferred_language?: LanguageCode
          notes?: string
          avatar_url?: string
          status?: DealershipStatus
          created_at?: string
          updated_at?: string
          deleted_at?: string
        }
      }

      // User management (legacy table - being migrated to profiles)
      detail_users: {
        Row: {
          id: number
          dealership_id?: number
          email: string
          password_hash?: string
          first_name: string
          last_name: string
          phone?: string
          role: UserRole
          department: UserDepartment
          employee_id?: string
          hire_date?: string
          avatar_url?: string
          language_preference: LanguageCode
          timezone: string
          is_active: boolean
          can_access_all_dealerships: boolean
          assigned_dealerships: Json
          permissions: Json
          last_login_at?: string
          email_verified_at?: string
          created_at: string
          updated_at: string
          deleted_at?: string
        }
        Insert: {
          id?: number
          dealership_id?: number
          email: string
          password_hash?: string
          first_name: string
          last_name: string
          phone?: string
          role?: UserRole
          department?: UserDepartment
          employee_id?: string
          hire_date?: string
          avatar_url?: string
          language_preference?: LanguageCode
          timezone?: string
          is_active?: boolean
          can_access_all_dealerships?: boolean
          assigned_dealerships?: Json
          permissions?: Json
          last_login_at?: string
          email_verified_at?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string
        }
        Update: {
          id?: number
          dealership_id?: number
          email?: string
          password_hash?: string
          first_name?: string
          last_name?: string
          phone?: string
          role?: UserRole
          department?: UserDepartment
          employee_id?: string
          hire_date?: string
          avatar_url?: string
          language_preference?: LanguageCode
          timezone?: string
          is_active?: boolean
          can_access_all_dealerships?: boolean
          assigned_dealerships?: Json
          permissions?: Json
          last_login_at?: string
          email_verified_at?: string
          created_at?: string
          updated_at?: string
          deleted_at?: string
        }
      }

      // New user management system
      profiles: {
        Row: {
          id: string
          email: string
          first_name?: string
          last_name?: string
          phone?: string
          avatar_url?: string
          user_type: UserType
          is_active: boolean
          language_preference: LanguageCode
          timezone: string
          email_verified: boolean
          last_login_at?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name?: string
          last_name?: string
          phone?: string
          avatar_url?: string
          user_type?: UserType
          is_active?: boolean
          language_preference?: LanguageCode
          timezone?: string
          email_verified?: boolean
          last_login_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          phone?: string
          avatar_url?: string
          user_type?: UserType
          is_active?: boolean
          language_preference?: LanguageCode
          timezone?: string
          email_verified?: boolean
          last_login_at?: string
          created_at?: string
          updated_at?: string
        }
      }

      dealer_memberships: {
        Row: {
          id: string
          user_id: string
          dealer_id: number
          role: UserRole
          permissions: Json
          is_active: boolean
          invited_at?: string
          joined_at?: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          dealer_id: number
          role?: UserRole
          permissions?: Json
          is_active?: boolean
          invited_at?: string
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          dealer_id?: number
          role?: UserRole
          permissions?: Json
          is_active?: boolean
          invited_at?: string
          joined_at?: string
          created_at?: string
          updated_at?: string
        }
      }

      // Order management system
      orders: {
        Row: {
          id: string
          dealer_id: number
          order_type: OrderType
          order_number: string
          status: OrderStatus
          
          // Vehicle information
          vehicle_vin?: string
          vehicle_year?: number
          vehicle_make?: string
          vehicle_model?: string
          vehicle_color?: string
          vehicle_mileage?: number
          license_plate?: string
          
          // Customer information
          customer_name?: string
          customer_email?: string
          customer_phone?: string
          
          // Order details
          description?: string
          work_requested?: string
          total_amount?: number
          payment_status: PaymentStatus
          estimated_completion?: string
          actual_completion?: string
          
          // QR and tracking
          qr_code?: string
          short_link?: string
          qr_scan_count: number
          
          // Metadata
          assigned_to?: string
          created_by: string
          notes?: string
          attachments?: Json
          custom_fields?: Json
          
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dealer_id: number
          order_type: OrderType
          order_number?: string
          status?: OrderStatus
          vehicle_vin?: string
          vehicle_year?: number
          vehicle_make?: string
          vehicle_model?: string
          vehicle_color?: string
          vehicle_mileage?: number
          license_plate?: string
          customer_name?: string
          customer_email?: string
          customer_phone?: string
          description?: string
          work_requested?: string
          total_amount?: number
          payment_status?: PaymentStatus
          estimated_completion?: string
          actual_completion?: string
          qr_code?: string
          short_link?: string
          qr_scan_count?: number
          assigned_to?: string
          created_by: string
          notes?: string
          attachments?: Json
          custom_fields?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dealer_id?: number
          order_type?: OrderType
          order_number?: string
          status?: OrderStatus
          vehicle_vin?: string
          vehicle_year?: number
          vehicle_make?: string
          vehicle_model?: string
          vehicle_color?: string
          vehicle_mileage?: number
          license_plate?: string
          customer_name?: string
          customer_email?: string
          customer_phone?: string
          description?: string
          work_requested?: string
          total_amount?: number
          payment_status?: PaymentStatus
          estimated_completion?: string
          actual_completion?: string
          qr_code?: string
          short_link?: string
          qr_scan_count?: number
          assigned_to?: string
          created_by?: string
          notes?: string
          attachments?: Json
          custom_fields?: Json
          created_at?: string
          updated_at?: string
        }
      }

      // NFC System
      nfc_tags: {
        Row: {
          id: string
          tag_uid: string
          tag_type: TagType
          name: string
          description?: string
          dealer_id: number
          vehicle_vin?: string
          order_id?: string
          location_name?: string
          location_coordinates?: Json // PostGIS POINT
          tag_data: Json
          is_active: boolean
          is_permanent: boolean
          created_by: string
          created_at: string
          updated_at: string
          last_scanned_at?: string
          scan_count: number
        }
        Insert: {
          id?: string
          tag_uid: string
          tag_type?: TagType
          name: string
          description?: string
          dealer_id: number
          vehicle_vin?: string
          order_id?: string
          location_name?: string
          location_coordinates?: Json
          tag_data?: Json
          is_active?: boolean
          is_permanent?: boolean
          created_by: string
          created_at?: string
          updated_at?: string
          last_scanned_at?: string
          scan_count?: number
        }
        Update: {
          id?: string
          tag_uid?: string
          tag_type?: TagType
          name?: string
          description?: string
          dealer_id?: number
          vehicle_vin?: string
          order_id?: string
          location_name?: string
          location_coordinates?: Json
          tag_data?: Json
          is_active?: boolean
          is_permanent?: boolean
          created_by?: string
          created_at?: string
          updated_at?: string
          last_scanned_at?: string
          scan_count?: number
        }
      }

      nfc_scans: {
        Row: {
          id: string
          tag_id: string
          scanned_by: string
          scan_location?: Json // PostGIS POINT
          scan_address?: string
          device_info: Json
          user_agent?: string
          action_type: ActionType
          action_data: Json
          order_id?: string
          context_data: Json
          scanned_at: string
          session_id?: string
          is_unique_scan: boolean
        }
        Insert: {
          id?: string
          tag_id: string
          scanned_by: string
          scan_location?: Json
          scan_address?: string
          device_info?: Json
          user_agent?: string
          action_type?: ActionType
          action_data?: Json
          order_id?: string
          context_data?: Json
          scanned_at?: string
          session_id?: string
          is_unique_scan?: boolean
        }
        Update: {
          id?: string
          tag_id?: string
          scanned_by?: string
          scan_location?: Json
          scan_address?: string
          device_info?: Json
          user_agent?: string
          action_type?: ActionType
          action_data?: Json
          order_id?: string
          context_data?: Json
          scanned_at?: string
          session_id?: string
          is_unique_scan?: boolean
        }
      }

      // Communication system
      messages: {
        Row: {
          id: string
          dealer_id: number
          sender_id: string
          order_id?: string
          message_type: MessageType
          subject?: string
          content: string
          attachments?: Json
          is_read: boolean
          is_archived: boolean
          sent_at: string
          read_at?: string
        }
        Insert: {
          id?: string
          dealer_id: number
          sender_id: string
          order_id?: string
          message_type?: MessageType
          subject?: string
          content: string
          attachments?: Json
          is_read?: boolean
          is_archived?: boolean
          sent_at?: string
          read_at?: string
        }
        Update: {
          id?: string
          dealer_id?: number
          sender_id?: string
          order_id?: string
          message_type?: MessageType
          subject?: string
          content?: string
          attachments?: Json
          is_read?: boolean
          is_archived?: boolean
          sent_at?: string
          read_at?: string
        }
      }

      // Notification system
      notifications: {
        Row: {
          id: string
          user_id: string
          dealer_id: number
          notification_type: NotificationType
          title: string
          message: string
          data?: Json
          is_read: boolean
          created_at: string
          read_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          dealer_id: number
          notification_type: NotificationType
          title: string
          message: string
          data?: Json
          is_read?: boolean
          created_at?: string
          read_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          dealer_id?: number
          notification_type?: NotificationType
          title?: string
          message?: string
          data?: Json
          is_read?: boolean
          created_at?: string
          read_at?: string
        }
      }

      // System Settings
      system_settings: {
        Row: {
          setting_key: string
          setting_value: Json
          setting_type: SettingType
          updated_by?: string
          updated_at?: string
          created_at: string
        }
        Insert: {
          setting_key: string
          setting_value: Json
          setting_type: SettingType
          updated_by?: string
          updated_at?: string
          created_at?: string
        }
        Update: {
          setting_key?: string
          setting_value?: Json
          setting_type?: SettingType
          updated_by?: string
          updated_at?: string
          created_at?: string
        }
      }
    }

    Views: {
      [_ in never]: never
    }

    Functions: {
      get_user_permissions: {
        Args: { user_id: string }
        Returns: Json
      }
      create_order_with_qr: {
        Args: {
          dealer_id: number
          order_type: OrderType
          order_data: Json
        }
        Returns: string
      }
      update_order_status: {
        Args: {
          order_id: string
          new_status: OrderStatus
          notes?: string
        }
        Returns: boolean
      }
    }

    Enums: {
      dealership_status: DealershipStatus
      subscription_plan: SubscriptionPlan
      user_role: UserRole
      user_department: UserDepartment
      contact_department: ContactDepartment
      language_code: LanguageCode
      user_type: UserType
      order_type: OrderType
      order_status: OrderStatus
      payment_status: PaymentStatus
      message_type: MessageType
      notification_type: NotificationType
      tag_type: TagType
      action_type: ActionType
      setting_type: SettingType
    }

    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type helpers for easier usage
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific table type aliases
export type Dealership = Tables<'dealerships'>
export type DealershipContact = Tables<'dealership_contacts'>
export type Profile = Tables<'profiles'>
export type DealerMembership = Tables<'dealer_memberships'>
export type Order = Tables<'orders'>
export type NFCTag = Tables<'nfc_tags'>
export type NFCScan = Tables<'nfc_scans'>
export type Message = Tables<'messages'>
export type Notification = Tables<'notifications'>
export type SystemSetting = Tables<'system_settings'>

// Insert types
export type DealershipInsert = TablesInsert<'dealerships'>
export type DealershipContactInsert = TablesInsert<'dealership_contacts'>
export type ProfileInsert = TablesInsert<'profiles'>
export type DealerMembershipInsert = TablesInsert<'dealer_memberships'>
export type OrderInsert = TablesInsert<'orders'>
export type NFCTagInsert = TablesInsert<'nfc_tags'>
export type NFCScanInsert = TablesInsert<'nfc_scans'>
export type MessageInsert = TablesInsert<'messages'>
export type NotificationInsert = TablesInsert<'notifications'>
export type SystemSettingInsert = TablesInsert<'system_settings'>

// Update types
export type DealershipUpdate = TablesUpdate<'dealerships'>
export type DealershipContactUpdate = TablesUpdate<'dealership_contacts'>
export type ProfileUpdate = TablesUpdate<'profiles'>
export type DealerMembershipUpdate = TablesUpdate<'dealer_memberships'>
export type OrderUpdate = TablesUpdate<'orders'>
export type NFCTagUpdate = TablesUpdate<'nfc_tags'>
export type NFCScanUpdate = TablesUpdate<'nfc_scans'>
export type MessageUpdate = TablesUpdate<'messages'>
export type NotificationUpdate = TablesUpdate<'notifications'>
export type SystemSettingUpdate = TablesUpdate<'system_settings'>

// System Settings specific types
export interface FeatureFlagsConfig {
  chat_enabled: boolean
  nfc_tracking_enabled: boolean
  vin_scanner_enabled: boolean
  qr_generation_enabled: boolean
  realtime_updates_enabled: boolean
  file_uploads_enabled: boolean
}

export interface SecurityConfig {
  max_login_attempts: number
  session_timeout_hours: number
  password_min_length: number
  require_mfa: boolean
  allow_password_reset: boolean
}

export interface SMTPConfig {
  host: string
  port: number
  username: string
  password: string
  from_email: string
  use_tls: boolean
}

export interface SMSConfig {
  provider: 'twilio' | 'aws_sns' | 'other'
  account_sid?: string
  auth_token?: string
  from_number: string
  enabled: boolean
}

// Union type for all possible setting values
export type SystemSettingValue =
  | FeatureFlagsConfig
  | SecurityConfig
  | SMTPConfig
  | SMSConfig
  | Record<string, any>

// Typed system setting with specific value types
export interface TypedSystemSetting<T = SystemSettingValue> {
  setting_key: string
  setting_value: T
  setting_type: SettingType
  updated_by?: string
  updated_at?: string
  created_at: string
}