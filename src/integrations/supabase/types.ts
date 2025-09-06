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
