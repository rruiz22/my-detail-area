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
      category_module_mappings: {
        Row: {
          category_id: string
          created_at: string
          dealer_id: number | null
          id: string
          is_active: boolean
          module: Database["public"]["Enums"]["app_module"]
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          dealer_id?: number | null
          id?: string
          is_active?: boolean
          module: Database["public"]["Enums"]["app_module"]
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          dealer_id?: number | null
          id?: string
          is_active?: boolean
          module?: Database["public"]["Enums"]["app_module"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_module_mappings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          allow_external_users: boolean | null
          auto_delete_after_days: number | null
          avatar_url: string | null
          conversation_type: Database["public"]["Enums"]["chat_conversation_type"]
          created_at: string
          created_by: string | null
          dealer_id: number
          description: string | null
          id: string
          is_archived: boolean
          is_muted: boolean
          is_private: boolean
          last_message_at: string | null
          max_participants: number | null
          metadata: Json | null
          name: string | null
          updated_at: string
        }
        Insert: {
          allow_external_users?: boolean | null
          auto_delete_after_days?: number | null
          avatar_url?: string | null
          conversation_type?: Database["public"]["Enums"]["chat_conversation_type"]
          created_at?: string
          created_by?: string | null
          dealer_id: number
          description?: string | null
          id?: string
          is_archived?: boolean
          is_muted?: boolean
          is_private?: boolean
          last_message_at?: string | null
          max_participants?: number | null
          metadata?: Json | null
          name?: string | null
          updated_at?: string
        }
        Update: {
          allow_external_users?: boolean | null
          auto_delete_after_days?: number | null
          avatar_url?: string | null
          conversation_type?: Database["public"]["Enums"]["chat_conversation_type"]
          created_at?: string
          created_by?: string | null
          dealer_id?: number
          description?: string | null
          id?: string
          is_archived?: boolean
          is_muted?: boolean
          is_private?: boolean
          last_message_at?: string | null
          max_participants?: number | null
          metadata?: Json | null
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_system_message: boolean | null
          mentions: Json | null
          message_type: Database["public"]["Enums"]["chat_message_type"]
          metadata: Json | null
          parent_message_id: string | null
          reactions: Json | null
          search_vector: unknown | null
          thread_count: number | null
          updated_at: string
          user_id: string
          voice_duration_ms: number | null
          voice_transcription: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_system_message?: boolean | null
          mentions?: Json | null
          message_type?: Database["public"]["Enums"]["chat_message_type"]
          metadata?: Json | null
          parent_message_id?: string | null
          reactions?: Json | null
          search_vector?: unknown | null
          thread_count?: number | null
          updated_at?: string
          user_id: string
          voice_duration_ms?: number | null
          voice_transcription?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_system_message?: boolean | null
          mentions?: Json | null
          message_type?: Database["public"]["Enums"]["chat_message_type"]
          metadata?: Json | null
          parent_message_id?: string | null
          reactions?: Json | null
          search_vector?: unknown | null
          thread_count?: number | null
          updated_at?: string
          user_id?: string
          voice_duration_ms?: number | null
          voice_transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_notification_settings: {
        Row: {
          channel_message_notifications:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          created_at: string
          custom_sound_url: string | null
          dealer_id: number
          direct_message_notifications:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          enable_desktop_notifications: boolean
          enable_email_notifications: boolean
          enable_mention_sounds: boolean
          enable_message_sounds: boolean
          enable_push_notifications: boolean
          group_message_notifications:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          id: string
          quiet_days: Json | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_message_notifications?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          created_at?: string
          custom_sound_url?: string | null
          dealer_id: number
          direct_message_notifications?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          enable_desktop_notifications?: boolean
          enable_email_notifications?: boolean
          enable_mention_sounds?: boolean
          enable_message_sounds?: boolean
          enable_push_notifications?: boolean
          group_message_notifications?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          id?: string
          quiet_days?: Json | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_message_notifications?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          created_at?: string
          custom_sound_url?: string | null
          dealer_id?: number
          direct_message_notifications?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          enable_desktop_notifications?: boolean
          enable_email_notifications?: boolean
          enable_mention_sounds?: boolean
          enable_message_sounds?: boolean
          enable_push_notifications?: boolean
          group_message_notifications?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          id?: string
          quiet_days?: Json | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_notification_settings_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          created_at: string
          custom_nickname: string | null
          id: string
          is_active: boolean
          is_muted: boolean
          is_pinned: boolean
          joined_at: string
          last_read_at: string | null
          left_at: string | null
          metadata: Json | null
          notification_frequency:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          permission_level: Database["public"]["Enums"]["chat_permission_level"]
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          custom_nickname?: string | null
          id?: string
          is_active?: boolean
          is_muted?: boolean
          is_pinned?: boolean
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          metadata?: Json | null
          notification_frequency?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          permission_level?: Database["public"]["Enums"]["chat_permission_level"]
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          custom_nickname?: string | null
          id?: string
          is_active?: boolean
          is_muted?: boolean
          is_pinned?: boolean
          joined_at?: string
          last_read_at?: string | null
          left_at?: string | null
          metadata?: Json | null
          notification_frequency?:
            | Database["public"]["Enums"]["notification_frequency"]
            | null
          permission_level?: Database["public"]["Enums"]["chat_permission_level"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_typing_indicators: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_typing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_typing_indicators_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      dealer_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          dealer_id: number
          email: string
          expires_at: string
          id: string
          invitation_token: string
          inviter_id: string
          role_name: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          dealer_id: number
          email: string
          expires_at?: string
          id?: string
          invitation_token: string
          inviter_id: string
          role_name: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          dealer_id?: number
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          inviter_id?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_invitations_dealer_id_fkey"
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
          category_id: string
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
          category_id: string
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
          category_id?: string
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
        Relationships: [
          {
            foreignKeyName: "dealer_services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
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
      dealership_modules: {
        Row: {
          created_at: string
          dealer_id: number
          disabled_at: string | null
          enabled_at: string
          enabled_by: string | null
          id: string
          is_enabled: boolean
          module: Database["public"]["Enums"]["app_module"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          dealer_id: number
          disabled_at?: string | null
          enabled_at?: string
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          module: Database["public"]["Enums"]["app_module"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          dealer_id?: number
          disabled_at?: string | null
          enabled_at?: string
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean
          module?: Database["public"]["Enums"]["app_module"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealership_modules_dealer_id_fkey"
            columns: ["dealer_id"]
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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
      order_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          description: string | null
          field_name: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          order_id: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description?: string | null
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          order_id: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string | null
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          order_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_attachments: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          is_public: boolean | null
          mime_type: string
          order_id: string
          updated_at: string
          upload_context: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          is_public?: boolean | null
          mime_type: string
          order_id: string
          updated_at?: string
          upload_context?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          is_public?: boolean | null
          mime_type?: string
          order_id?: string
          updated_at?: string
          upload_context?: string | null
          uploaded_by?: string
        }
        Relationships: []
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
      order_communications: {
        Row: {
          attachments: Json | null
          content: string | null
          created_at: string
          edited_at: string | null
          id: string
          is_edited: boolean | null
          is_internal: boolean | null
          mentions: Json | null
          message_type: string
          order_id: string
          parent_message_id: string | null
          reactions: Json | null
          reply_count: number | null
          updated_at: string
          user_id: string
          voice_duration_ms: number | null
          voice_file_path: string | null
          voice_transcription: string | null
        }
        Insert: {
          attachments?: Json | null
          content?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_internal?: boolean | null
          mentions?: Json | null
          message_type?: string
          order_id: string
          parent_message_id?: string | null
          reactions?: Json | null
          reply_count?: number | null
          updated_at?: string
          user_id: string
          voice_duration_ms?: number | null
          voice_file_path?: string | null
          voice_transcription?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string | null
          created_at?: string
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_internal?: boolean | null
          mentions?: Json | null
          message_type?: string
          order_id?: string
          parent_message_id?: string | null
          reactions?: Json | null
          reply_count?: number | null
          updated_at?: string
          user_id?: string
          voice_duration_ms?: number | null
          voice_file_path?: string | null
          voice_transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_communications_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "order_communications"
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
          po: string | null
          priority: string | null
          qr_code_url: string | null
          ro: string | null
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
          tag: string | null
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
          po?: string | null
          priority?: string | null
          qr_code_url?: string | null
          ro?: string | null
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
          tag?: string | null
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
          po?: string | null
          priority?: string | null
          qr_code_url?: string | null
          ro?: string | null
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
          tag?: string | null
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
      service_categories: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          dealer_id: number | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_system_category: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          dealer_id?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system_category?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          dealer_id?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system_category?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_contact_permissions: {
        Row: {
          allow_channel_mentions: boolean
          allow_direct_messages: boolean
          allow_group_invitations: boolean
          auto_accept_invites: boolean
          blocked_users: Json | null
          created_at: string
          dealer_id: number
          favorite_contacts: Json | null
          id: string
          show_last_seen: boolean
          show_online_status: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_channel_mentions?: boolean
          allow_direct_messages?: boolean
          allow_group_invitations?: boolean
          auto_accept_invites?: boolean
          blocked_users?: Json | null
          created_at?: string
          dealer_id: number
          favorite_contacts?: Json | null
          id?: string
          show_last_seen?: boolean
          show_online_status?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_channel_mentions?: boolean
          allow_direct_messages?: boolean
          allow_group_invitations?: boolean
          auto_accept_invites?: boolean
          blocked_users?: Json | null
          created_at?: string
          dealer_id?: number
          favorite_contacts?: Json | null
          id?: string
          show_last_seen?: boolean
          show_online_status?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_contact_permissions_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          auto_away_minutes: number | null
          created_at: string
          custom_status: string | null
          dealer_id: number
          id: string
          ip_address: unknown | null
          is_mobile: boolean | null
          last_activity_at: string | null
          last_seen_at: string | null
          status: Database["public"]["Enums"]["user_presence_status"]
          status_emoji: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auto_away_minutes?: number | null
          created_at?: string
          custom_status?: string | null
          dealer_id: number
          id?: string
          ip_address?: unknown | null
          is_mobile?: boolean | null
          last_activity_at?: string | null
          last_seen_at?: string | null
          status?: Database["public"]["Enums"]["user_presence_status"]
          status_emoji?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auto_away_minutes?: number | null
          created_at?: string
          custom_status?: string | null
          dealer_id?: number
          id?: string
          ip_address?: unknown | null
          is_mobile?: boolean | null
          last_activity_at?: string | null
          last_seen_at?: string | null
          status?: Database["public"]["Enums"]["user_presence_status"]
          status_emoji?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
        ]
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
      accept_dealer_invitation: {
        Args: { p_invitation_token: string }
        Returns: boolean
      }
      assign_role: {
        Args: { expires_at?: string; role_name: string; target_user_id: string }
        Returns: boolean
      }
      create_dealer_invitation: {
        Args: { p_dealer_id: number; p_email: string; p_role_name: string }
        Returns: string
      }
      dealership_has_module_access: {
        Args: {
          p_dealer_id: number
          p_module: Database["public"]["Enums"]["app_module"]
        }
        Returns: boolean
      }
      generate_custom_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_sales_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_service_order_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_unique_slug: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_dealer_categories_for_module: {
        Args: {
          p_dealer_id: number
          p_module: Database["public"]["Enums"]["app_module"]
        }
        Returns: {
          color: string
          description: string
          icon: string
          id: string
          is_system_category: boolean
          name: string
        }[]
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
          category_color: string
          category_name: string
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
      get_dealership_modules: {
        Args: { p_dealer_id: number }
        Returns: {
          enabled_at: string
          enabled_by: string
          is_enabled: boolean
          module: Database["public"]["Enums"]["app_module"]
        }[]
      }
      get_dealership_performance_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_users: number
          avg_orders_per_user: number
          dealership_id: number
          dealership_name: string
          last_activity: string
          orders_this_month: number
          status: string
          total_orders: number
          total_users: number
          user_growth_rate: number
        }[]
      }
      get_dealership_stats: {
        Args: { p_dealer_id: number }
        Returns: {
          active_users: number
          orders_this_month: number
          pending_invitations: number
          total_orders: number
          total_users: number
        }[]
      }
      get_recent_system_activity: {
        Args: Record<PropertyKey, never>
        Returns: {
          activity_description: string
          activity_type: string
          created_at: string
          entity_id: string
          entity_type: string
          user_email: string
        }[]
      }
      get_system_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          active_dealerships: number
          active_users: number
          orders_this_month: number
          orders_this_week: number
          pending_invitations: number
          system_health_score: number
          total_dealerships: number
          total_orders: number
          total_users: number
        }[]
      }
      get_unread_message_counts: {
        Args: { conversation_ids: string[]; user_id: string }
        Returns: {
          conversation_id: string
          unread_count: number
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
      initialize_dealership_modules: {
        Args: { p_dealer_id: number }
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
      update_dealership_module: {
        Args: {
          p_dealer_id: number
          p_is_enabled: boolean
          p_module: Database["public"]["Enums"]["app_module"]
        }
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
      validate_order_due_date_v2: {
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
        | "management"
        | "chat"
      chat_conversation_type: "direct" | "group" | "channel" | "announcement"
      chat_message_type: "text" | "voice" | "file" | "image" | "system"
      chat_permission_level: "read" | "write" | "moderate" | "admin"
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
      notification_frequency: "all" | "mentions" | "none" | "scheduled"
      permission_level: "none" | "read" | "write" | "delete" | "admin"
      subscription_plan: "basic" | "premium" | "enterprise"
      user_department: "detailing" | "wash" | "service"
      user_presence_status: "online" | "away" | "busy" | "offline" | "invisible"
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
        "management",
        "chat",
      ],
      chat_conversation_type: ["direct", "group", "channel", "announcement"],
      chat_message_type: ["text", "voice", "file", "image", "system"],
      chat_permission_level: ["read", "write", "moderate", "admin"],
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
      notification_frequency: ["all", "mentions", "none", "scheduled"],
      permission_level: ["none", "read", "write", "delete", "admin"],
      subscription_plan: ["basic", "premium", "enterprise"],
      user_department: ["detailing", "wash", "service"],
      user_presence_status: ["online", "away", "busy", "offline", "invisible"],
      user_role: ["admin", "manager", "technician", "viewer"],
      user_type: ["dealer", "detail"],
    },
  },
} as const
