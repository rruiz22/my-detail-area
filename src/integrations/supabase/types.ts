export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      dealer_groups: {
        Row: {
          created_at: string
          dealer_id: number
          description: string | null
          id: string
          is_active: boolean
          name: string
          permissions: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dealer_id: number
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          permissions?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dealer_id?: number
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          permissions?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_groups_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_membership_groups: {
        Row: {
          assigned_at: string
          created_at: string
          group_id: string
          id: string
          membership_id: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          group_id: string
          id?: string
          membership_id: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          group_id?: string
          id?: string
          membership_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_membership_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "dealer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_membership_groups_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "dealer_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_memberships: {
        Row: {
          created_at: string
          dealer_id: number
          id: string
          is_active: boolean
          joined_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dealer_id: number
          id?: string
          is_active?: boolean
          joined_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dealer_id?: number
          id?: string
          is_active?: boolean
          joined_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_memberships_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_service_groups: {
        Row: {
          created_at: string
          group_id: string
          id: string
          service_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          service_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_service_groups_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "dealer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_service_groups_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "dealer_services"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_services: {
        Row: {
          category: string | null
          created_at: string
          dealer_id: number
          description: string | null
          duration: number | null
          id: string
          is_active: boolean
          name: string
          price: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          dealer_id: number
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          dealer_id?: number
          description?: string | null
          duration?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      dealership_contacts: {
        Row: {
          avatar_url: string | null
          can_receive_notifications: boolean | null
          created_at: string | null
          dealership_id: number
          deleted_at: string | null
          department: Database["public"]["Enums"]["contact_department"] | null
          email: string
          first_name: string
          id: number
          is_primary: boolean | null
          last_name: string
          mobile_phone: string | null
          notes: string | null
          phone: string | null
          position: string | null
          preferred_language:
            | Database["public"]["Enums"]["language_code"]
            | null
          status: Database["public"]["Enums"]["dealership_status"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          can_receive_notifications?: boolean | null
          created_at?: string | null
          dealership_id: number
          deleted_at?: string | null
          department?: Database["public"]["Enums"]["contact_department"] | null
          email: string
          first_name: string
          id?: number
          is_primary?: boolean | null
          last_name: string
          mobile_phone?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          preferred_language?:
            | Database["public"]["Enums"]["language_code"]
            | null
          status?: Database["public"]["Enums"]["dealership_status"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          can_receive_notifications?: boolean | null
          created_at?: string | null
          dealership_id?: number
          deleted_at?: string | null
          department?: Database["public"]["Enums"]["contact_department"] | null
          email?: string
          first_name?: string
          id?: number
          is_primary?: boolean | null
          last_name?: string
          mobile_phone?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          preferred_language?:
            | Database["public"]["Enums"]["language_code"]
            | null
          status?: Database["public"]["Enums"]["dealership_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dealership_contacts_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      dealerships: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          id: number
          logo_url: string | null
          max_users: number | null
          name: string
          notes: string | null
          phone: string | null
          primary_color: string | null
          state: string | null
          status: Database["public"]["Enums"]["dealership_status"] | null
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          tax_number: string | null
          updated_at: string | null
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          id?: number
          logo_url?: string | null
          max_users?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          primary_color?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["dealership_status"] | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          tax_number?: string | null
          updated_at?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          id?: number
          logo_url?: string | null
          max_users?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          primary_color?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["dealership_status"] | null
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          tax_number?: string | null
          updated_at?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      detail_users: {
        Row: {
          assigned_dealerships: Json | null
          avatar_url: string | null
          can_access_all_dealerships: boolean | null
          created_at: string | null
          dealership_id: number | null
          deleted_at: string | null
          department: Database["public"]["Enums"]["user_department"] | null
          email: string
          email_verified_at: string | null
          employee_id: string | null
          first_name: string
          hire_date: string | null
          id: number
          is_active: boolean | null
          language_preference:
            | Database["public"]["Enums"]["language_code"]
            | null
          last_login_at: string | null
          last_name: string
          password_hash: string | null
          permissions: Json | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_dealerships?: Json | null
          avatar_url?: string | null
          can_access_all_dealerships?: boolean | null
          created_at?: string | null
          dealership_id?: number | null
          deleted_at?: string | null
          department?: Database["public"]["Enums"]["user_department"] | null
          email: string
          email_verified_at?: string | null
          employee_id?: string | null
          first_name: string
          hire_date?: string | null
          id?: number
          is_active?: boolean | null
          language_preference?:
            | Database["public"]["Enums"]["language_code"]
            | null
          last_login_at?: string | null
          last_name: string
          password_hash?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_dealerships?: Json | null
          avatar_url?: string | null
          can_access_all_dealerships?: boolean | null
          created_at?: string | null
          dealership_id?: number | null
          deleted_at?: string | null
          department?: Database["public"]["Enums"]["user_department"] | null
          email?: string
          email_verified_at?: string | null
          employee_id?: string | null
          first_name?: string
          hire_date?: string | null
          id?: number
          is_active?: boolean | null
          language_preference?:
            | Database["public"]["Enums"]["language_code"]
            | null
          last_login_at?: string | null
          last_name?: string
          password_hash?: string | null
          permissions?: Json | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_users_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      order_comments: {
        Row: {
          comment_text: string
          comment_type: string
          created_at: string
          id: string
          order_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          comment_type?: string
          created_at?: string
          id?: string
          order_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          comment_type?: string
          created_at?: string
          id?: string
          order_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_order_comments_order_id"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_contact_id: string | null
          assigned_group_id: string | null
          completed_at: string | null
          created_at: string
          created_by_group_id: string | null
          custom_order_number: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          dealer_id: number
          due_date: string | null
          id: string
          internal_notes: string | null
          notes: string | null
          order_number: string
          order_type: string
          priority: string | null
          qr_code_url: string | null
          salesperson: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          services: Json | null
          short_link: string | null
          sla_deadline: string | null
          status: string
          status_changed_at: string | null
          status_changed_by: string | null
          stock_number: string | null
          total_amount: number | null
          updated_at: string
          vehicle_info: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_vin: string | null
          vehicle_year: number | null
        }
        Insert: {
          assigned_contact_id?: string | null
          assigned_group_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_group_id?: string | null
          custom_order_number?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          dealer_id?: number
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number: string
          order_type: string
          priority?: string | null
          qr_code_url?: string | null
          salesperson?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          services?: Json | null
          short_link?: string | null
          sla_deadline?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          stock_number?: string | null
          total_amount?: number | null
          updated_at?: string
          vehicle_info?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_vin?: string | null
          vehicle_year?: number | null
        }
        Update: {
          assigned_contact_id?: string | null
          assigned_group_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by_group_id?: string | null
          custom_order_number?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          dealer_id?: number
          due_date?: string | null
          id?: string
          internal_notes?: string | null
          notes?: string | null
          order_number?: string
          order_type?: string
          priority?: string | null
          qr_code_url?: string | null
          salesperson?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          services?: Json | null
          short_link?: string | null
          sla_deadline?: string | null
          status?: string
          status_changed_at?: string | null
          status_changed_by?: string | null
          stock_number?: string | null
          total_amount?: number | null
          updated_at?: string
          vehicle_info?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_vin?: string | null
          vehicle_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          dealership_id: number | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          created_at?: string | null
          dealership_id?: number | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          created_at?: string | null
          dealership_id?: number | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          module: Database["public"]["Enums"]["app_module"]
          permission_level: Database["public"]["Enums"]["permission_level"]
          role_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: Database["public"]["Enums"]["app_module"]
          permission_level?: Database["public"]["Enums"]["permission_level"]
          role_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
          permission_level?: Database["public"]["Enums"]["permission_level"]
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          dealer_role: Database["public"]["Enums"]["dealer_role"] | null
          description: string | null
          detail_role: Database["public"]["Enums"]["detail_role"] | null
          display_name: string
          id: string
          is_active: boolean
          is_system_role: boolean
          name: string
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          created_at?: string
          dealer_role?: Database["public"]["Enums"]["dealer_role"] | null
          description?: string | null
          detail_role?: Database["public"]["Enums"]["detail_role"] | null
          display_name: string
          id?: string
          is_active?: boolean
          is_system_role?: boolean
          name: string
          updated_at?: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          created_at?: string
          dealer_role?: Database["public"]["Enums"]["dealer_role"] | null
          description?: string | null
          detail_role?: Database["public"]["Enums"]["detail_role"] | null
          display_name?: string
          id?: string
          is_active?: boolean
          is_system_role?: boolean
          name?: string
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Relationships: []
      }
      sales_order_link_clicks: {
        Row: {
          browser: string | null
          city: string | null
          click_data: Json | null
          clicked_at: string
          country: string | null
          device_type: string | null
          id: string
          ip_address: unknown | null
          is_mobile: boolean | null
          is_unique_click: boolean | null
          link_id: string
          os: string | null
          referer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          browser?: string | null
          city?: string | null
          click_data?: Json | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown | null
          is_mobile?: boolean | null
          is_unique_click?: boolean | null
          link_id: string
          os?: string | null
          referer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          browser?: string | null
          city?: string | null
          click_data?: Json | null
          clicked_at?: string
          country?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown | null
          is_mobile?: boolean | null
          is_unique_click?: boolean | null
          link_id?: string
          os?: string | null
          referer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "sales_order_links"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_links: {
        Row: {
          created_at: string
          created_by: string | null
          dealer_id: number
          deep_link: string
          description: string | null
          id: string
          is_active: boolean
          last_clicked_at: string | null
          order_id: string
          qr_code_url: string | null
          short_url: string | null
          slug: string
          title: string | null
          total_clicks: number
          unique_clicks: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dealer_id: number
          deep_link: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_clicked_at?: string | null
          order_id: string
          qr_code_url?: string | null
          short_url?: string | null
          slug: string
          title?: string | null
          total_clicks?: number
          unique_clicks?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dealer_id?: number
          deep_link?: string
          description?: string | null
          id?: string
          is_active?: boolean
          last_clicked_at?: string | null
          order_id?: string
          qr_code_url?: string | null
          short_url?: string | null
          slug?: string
          title?: string | null
          total_clicks?: number
          unique_clicks?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_role: {
        Args: { expires_at?: string; role_name: string; target_user_id: string }
        Returns: boolean
      }
      generate_custom_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_unique_slug: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_dealer_kpis: {
        Args: { p_dealer_id: number }
        Returns: {
          avg_sla_hours: number
          cancelled_orders: number
          completed_orders: number
          in_progress_orders: number
          orders_today: number
          pending_orders: number
          sla_compliance_rate: number
          total_orders: number
        }[]
      }
      get_dealer_services_for_user: {
        Args: { p_dealer_id: number }
        Returns: {
          assigned_groups: string[]
          category: string
          created_at: string
          dealer_id: number
          description: string
          duration: number
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }[]
      }
      get_user_accessible_dealers: {
        Args: { user_uuid: string }
        Returns: {
          address: string
          city: string
          country: string
          email: string
          id: number
          name: string
          phone: string
          state: string
          status: string
          subscription_plan: string
          website: string
          zip_code: string
        }[]
      }
      get_user_accessible_orders: {
        Args: {
          scope_filter?: string
          target_dealer_id: number
          user_uuid: string
        }
        Returns: {
          assigned_group_id: string
          completed_at: string
          created_at: string
          created_by_group_id: string
          customer_email: string
          customer_name: string
          customer_phone: string
          dealer_id: number
          id: string
          order_number: string
          order_type: string
          priority: string
          services: Json
          sla_deadline: string
          status: string
          stock_number: string
          total_amount: number
          updated_at: string
          vehicle_info: string
          vehicle_make: string
          vehicle_model: string
          vehicle_vin: string
          vehicle_year: number
        }[]
      }
      get_user_permissions: {
        Args: { user_uuid: string }
        Returns: {
          module: Database["public"]["Enums"]["app_module"]
          permission_level: Database["public"]["Enums"]["permission_level"]
        }[]
      }
      get_user_roles: {
        Args: { user_uuid: string }
        Returns: {
          dealer_role: Database["public"]["Enums"]["dealer_role"]
          detail_role: Database["public"]["Enums"]["detail_role"]
          display_name: string
          expires_at: string
          role_id: string
          role_name: string
          user_type: Database["public"]["Enums"]["user_type"]
        }[]
      }
      has_permission: {
        Args: {
          check_module: Database["public"]["Enums"]["app_module"]
          required_level: Database["public"]["Enums"]["permission_level"]
          user_uuid: string
        }
        Returns: boolean
      }
      is_admin: {
        Args: { user_id?: string }
        Returns: boolean
      }
      set_membership_groups: {
        Args: { p_group_ids: string[]; p_membership_id: string }
        Returns: boolean
      }
      user_can_update_order_status: {
        Args: {
          current_status: string
          new_status: string
          target_dealer_id: number
          user_uuid: string
        }
        Returns: boolean
      }
      user_has_active_dealer_membership: {
        Args: { target_dealer_id?: number; user_id?: string }
        Returns: boolean
      }
      user_has_dealer_membership: {
        Args: { target_dealer_id: number; user_uuid: string }
        Returns: boolean
      }
      user_has_group_permission: {
        Args: {
          permission_name: string
          target_dealer_id: number
          user_uuid: string
        }
        Returns: boolean
      }
      user_has_module_access: {
        Args: {
          module_name: string
          target_dealer_id: number
          user_uuid: string
        }
        Returns: boolean
      }
      user_has_order_permission: {
        Args: {
          permission_name?: string
          target_dealer_id?: number
          user_id?: string
        }
        Returns: boolean
      }
      validate_order_due_date: {
        Args: { due_date_param: string }
        Returns: boolean
      }
    }
    Enums: {
      app_module:
        | "dashboard"
        | "sales_orders"
        | "service_orders"
        | "recon_orders"
        | "car_wash"
        | "reports"
        | "settings"
        | "dealerships"
        | "users"
      contact_department: "sales" | "service" | "parts" | "management" | "other"
      dealer_role:
        | "salesperson"
        | "service_advisor"
        | "lot_guy"
        | "sales_manager"
        | "service_manager"
        | "dispatcher"
        | "receptionist"
      dealership_status: "active" | "inactive" | "suspended"
      detail_role:
        | "super_manager"
        | "detail_manager"
        | "detail_staff"
        | "quality_inspector"
        | "mobile_technician"
      language_code: "en" | "es" | "pt-BR"
      permission_level: "none" | "read" | "write" | "delete" | "admin"
      subscription_plan: "basic" | "premium" | "enterprise"
      user_department: "detailing" | "wash" | "service"
      user_role: "admin" | "manager" | "technician" | "viewer"
      user_type: "dealer" | "detail"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_module: [
        "dashboard",
        "sales_orders",
        "service_orders",
        "recon_orders",
        "car_wash",
        "reports",
        "settings",
        "dealerships",
        "users",
      ],
      contact_department: ["sales", "service", "parts", "management", "other"],
      dealer_role: [
        "salesperson",
        "service_advisor",
        "lot_guy",
        "sales_manager",
        "service_manager",
        "dispatcher",
        "receptionist",
      ],
      dealership_status: ["active", "inactive", "suspended"],
      detail_role: [
        "super_manager",
        "detail_manager",
        "detail_staff",
        "quality_inspector",
        "mobile_technician",
      ],
      language_code: ["en", "es", "pt-BR"],
      permission_level: ["none", "read", "write", "delete", "admin"],
      subscription_plan: ["basic", "premium", "enterprise"],
      user_department: ["detailing", "wash", "service"],
      user_role: ["admin", "manager", "technician", "viewer"],
      user_type: ["dealer", "detail"],
    },
  },
} as const
