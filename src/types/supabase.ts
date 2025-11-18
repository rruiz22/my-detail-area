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
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          start_date: string | null
          target_dealer_ids: number[] | null
          target_roles: string[] | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          start_date?: string | null
          target_dealer_ids?: number[] | null
          target_roles?: string[] | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          priority?: number | null
          start_date?: string | null
          target_dealer_ids?: number[] | null
          target_roles?: string[] | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      appointment_slots: {
        Row: {
          booked_count: number
          created_at: string | null
          date_slot: string
          dealer_id: number
          hour_slot: number
          id: string
          max_capacity: number
          updated_at: string | null
        }
        Insert: {
          booked_count?: number
          created_at?: string | null
          date_slot: string
          dealer_id: number
          hour_slot: number
          id?: string
          max_capacity?: number
          updated_at?: string | null
        }
        Update: {
          booked_count?: number
          created_at?: string | null
          date_slot?: string
          dealer_id?: number
          hour_slot?: number
          id?: string
          max_capacity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_slots_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "appointment_slots_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_slots_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      bulk_password_operations: {
        Row: {
          completed_at: string | null
          created_at: string
          dealer_id: number
          error_details: Json | null
          failed_operations: number
          id: string
          initiated_by: string
          operation_type: string
          processed_users: number
          started_at: string | null
          status: string
          successful_operations: number
          target_filters: Json
          total_users: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dealer_id: number
          error_details?: Json | null
          failed_operations?: number
          id?: string
          initiated_by: string
          operation_type: string
          processed_users?: number
          started_at?: string | null
          status?: string
          successful_operations?: number
          target_filters?: Json
          total_users?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dealer_id?: number
          error_details?: Json | null
          failed_operations?: number
          id?: string
          initiated_by?: string
          operation_type?: string
          processed_users?: number
          started_at?: string | null
          status?: string
          successful_operations?: number
          target_filters?: Json
          total_users?: number
        }
        Relationships: []
      }
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
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "chat_conversations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
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
          search_vector: unknown
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
          search_vector?: unknown
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
          search_vector?: unknown
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
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "chat_notification_settings_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_notification_settings_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          capabilities: Json | null
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
          capabilities?: Json | null
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
          capabilities?: Json | null
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
      comment_mentions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          mentioned_by: string
          mentioned_user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          mentioned_by: string
          mentioned_user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          mentioned_by?: string
          mentioned_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "order_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_mentioned_by_fkey"
            columns: ["mentioned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "order_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_custom_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          dealer_id: number | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          permissions: Json | null
          role_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dealer_custom_roles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealer_custom_roles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_custom_roles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      dealer_custom_roles_backup_20251023_roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          dealer_id: number | null
          description: string | null
          display_name: string | null
          id: string | null
          is_active: boolean | null
          permissions: Json | null
          role_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number | null
          description?: string | null
          display_name?: string | null
          id?: string | null
          is_active?: boolean | null
          permissions?: Json | null
          role_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number | null
          description?: string | null
          display_name?: string | null
          id?: string | null
          is_active?: boolean | null
          permissions?: Json | null
          role_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dealer_dms_config: {
        Row: {
          auto_sync_enabled: boolean
          created_at: string | null
          dealer_id: number
          dms_provider: string
          id: string
          last_sync_at: string | null
          sync_frequency: string
          sync_settings: Json | null
          updated_at: string | null
        }
        Insert: {
          auto_sync_enabled?: boolean
          created_at?: string | null
          dealer_id: number
          dms_provider?: string
          id?: string
          last_sync_at?: string | null
          sync_frequency?: string
          sync_settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          auto_sync_enabled?: boolean
          created_at?: string | null
          dealer_id?: number
          dms_provider?: string
          id?: string
          last_sync_at?: string | null
          sync_frequency?: string
          sync_settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dealer_dms_config_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: true
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealer_dms_config_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: true
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_dms_config_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: true
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      dealer_dms_configs: {
        Row: {
          auto_sync_enabled: boolean
          created_at: string
          dealer_id: number
          dms_provider: string
          id: string
          last_sync_at: string | null
          sync_frequency: string
          sync_settings: Json
          updated_at: string
        }
        Insert: {
          auto_sync_enabled?: boolean
          created_at?: string
          dealer_id: number
          dms_provider?: string
          id?: string
          last_sync_at?: string | null
          sync_frequency?: string
          sync_settings?: Json
          updated_at?: string
        }
        Update: {
          auto_sync_enabled?: boolean
          created_at?: string
          dealer_id?: number
          dms_provider?: string
          id?: string
          last_sync_at?: string | null
          sync_frequency?: string
          sync_settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      dealer_groups: {
        Row: {
          allowed_order_types: string[]
          created_at: string
          dealer_id: number
          department: string | null
          description: string | null
          id: string
          is_active: boolean
          is_template: boolean | null
          name: string
          permission_level: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          allowed_order_types?: string[]
          created_at?: string
          dealer_id: number
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean | null
          name: string
          permission_level?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          allowed_order_types?: string[]
          created_at?: string
          dealer_id?: number
          department?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_template?: boolean | null
          name?: string
          permission_level?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_groups_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealer_groups_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_groups_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      dealer_groups_backup_20250920: {
        Row: {
          allowed_order_types: string[] | null
          created_at: string | null
          created_by: string | null
          dealer_id: number | null
          description: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          permissions: Json | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          allowed_order_types?: string[] | null
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          permissions?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          allowed_order_types?: string[] | null
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          permissions?: Json | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      dealer_inventory_sync_log: {
        Row: {
          dealer_id: number
          file_name: string | null
          file_size: number | null
          id: string
          processed_by: string | null
          records_added: number | null
          records_processed: number | null
          records_removed: number | null
          records_updated: number | null
          sync_completed_at: string | null
          sync_details: Json | null
          sync_errors: Json | null
          sync_started_at: string
          sync_status: string
          sync_type: string
        }
        Insert: {
          dealer_id: number
          file_name?: string | null
          file_size?: number | null
          id?: string
          processed_by?: string | null
          records_added?: number | null
          records_processed?: number | null
          records_removed?: number | null
          records_updated?: number | null
          sync_completed_at?: string | null
          sync_details?: Json | null
          sync_errors?: Json | null
          sync_started_at?: string
          sync_status?: string
          sync_type?: string
        }
        Update: {
          dealer_id?: number
          file_name?: string | null
          file_size?: number | null
          id?: string
          processed_by?: string | null
          records_added?: number | null
          records_processed?: number | null
          records_removed?: number | null
          records_updated?: number | null
          sync_completed_at?: string | null
          sync_details?: Json | null
          sync_errors?: Json | null
          sync_started_at?: string
          sync_status?: string
          sync_type?: string
        }
        Relationships: []
      }
      dealer_invitations: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          dealer_id: number
          deleted_at: string | null
          deleted_by: string | null
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
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          dealer_id: number
          deleted_at?: string | null
          deleted_by?: string | null
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
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          dealer_id?: number
          deleted_at?: string | null
          deleted_by?: string | null
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
            foreignKeyName: "dealer_invitations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_invitations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealer_invitations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_invitations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealer_invitations_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_invitations_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_max_auto_config: {
        Row: {
          auto_sync_enabled: boolean
          created_at: string
          dealer_id: number
          id: string
          last_sync_at: string | null
          last_sync_details: Json | null
          last_sync_status: string | null
          password_encrypted: string
          password_iv: string
          password_tag: string
          sync_frequency_hours: number
          updated_at: string
          username_encrypted: string
          username_iv: string
          username_tag: string
        }
        Insert: {
          auto_sync_enabled?: boolean
          created_at?: string
          dealer_id: number
          id?: string
          last_sync_at?: string | null
          last_sync_details?: Json | null
          last_sync_status?: string | null
          password_encrypted: string
          password_iv: string
          password_tag: string
          sync_frequency_hours?: number
          updated_at?: string
          username_encrypted: string
          username_iv: string
          username_tag: string
        }
        Update: {
          auto_sync_enabled?: boolean
          created_at?: string
          dealer_id?: number
          id?: string
          last_sync_at?: string | null
          last_sync_details?: Json | null
          last_sync_status?: string | null
          password_encrypted?: string
          password_iv?: string
          password_tag?: string
          sync_frequency_hours?: number
          updated_at?: string
          username_encrypted?: string
          username_iv?: string
          username_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_max_auto_config_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: true
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealer_max_auto_config_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: true
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_max_auto_config_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: true
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
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
          custom_role_id: string | null
          dealer_id: number
          id: string
          is_active: boolean
          joined_at: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_role_id?: string | null
          dealer_id: number
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_role_id?: string | null
          dealer_id?: number
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_memberships_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "dealer_custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_memberships_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "v_permission_migration_status"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "dealer_memberships_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealer_memberships_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_memberships_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
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
      dealer_memberships_backup_20251023_roles: {
        Row: {
          created_at: string | null
          custom_role_id: string | null
          dealer_id: number | null
          id: string | null
          is_active: boolean | null
          joined_at: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          custom_role_id?: string | null
          dealer_id?: number | null
          id?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          custom_role_id?: string | null
          dealer_id?: number | null
          id?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dealer_memberships_backup_role_migration_20251103: {
        Row: {
          backup_created_at: string | null
          created_at: string | null
          custom_role_id: string | null
          dealer_id: number | null
          id: string | null
          is_active: boolean | null
          joined_at: string | null
          role: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          backup_created_at?: string | null
          created_at?: string | null
          custom_role_id?: string | null
          dealer_id?: number | null
          id?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          backup_created_at?: string | null
          created_at?: string | null
          custom_role_id?: string | null
          dealer_id?: number | null
          id?: string | null
          is_active?: boolean | null
          joined_at?: string | null
          role?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      dealer_notification_channel_defaults: {
        Row: {
          created_at: string
          created_by: string | null
          dealer_id: number
          default_email: boolean
          default_in_app: boolean
          default_push: boolean
          default_slack: boolean | null
          default_sms: boolean
          event_channel_config: Json
          id: string
          module: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dealer_id: number
          default_email?: boolean
          default_in_app?: boolean
          default_push?: boolean
          default_slack?: boolean | null
          default_sms?: boolean
          event_channel_config?: Json
          id?: string
          module: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dealer_id?: number
          default_email?: boolean
          default_in_app?: boolean
          default_push?: boolean
          default_slack?: boolean | null
          default_sms?: boolean
          event_channel_config?: Json
          id?: string
          module?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dealer_notification_channel_defaults_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealer_notification_channel_defaults_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_notification_channel_defaults_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      dealer_notification_configs: {
        Row: {
          channels: Json
          created_at: string | null
          dealer_id: number
          id: string
          integrations: Json
          rate_limits: Json
          templates: Json
          updated_at: string | null
          workflows: Json
        }
        Insert: {
          channels?: Json
          created_at?: string | null
          dealer_id: number
          id?: string
          integrations?: Json
          rate_limits?: Json
          templates?: Json
          updated_at?: string | null
          workflows?: Json
        }
        Update: {
          channels?: Json
          created_at?: string | null
          dealer_id?: number
          id?: string
          integrations?: Json
          rate_limits?: Json
          templates?: Json
          updated_at?: string | null
          workflows?: Json
        }
        Relationships: [
          {
            foreignKeyName: "dealer_notification_configs_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: true
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealer_notification_configs_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: true
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_notification_configs_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: true
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      dealer_notification_rules: {
        Row: {
          auto_follow_enabled: boolean | null
          channels: Json
          conditions: Json | null
          created_at: string
          created_by: string | null
          dealer_id: number
          description: string | null
          enabled: boolean
          event: string
          id: string
          metadata: Json | null
          module: string
          priority: number
          recipients: Json
          rule_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_follow_enabled?: boolean | null
          channels?: Json
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          dealer_id: number
          description?: string | null
          enabled?: boolean
          event: string
          id?: string
          metadata?: Json | null
          module: string
          priority?: number
          recipients?: Json
          rule_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_follow_enabled?: boolean | null
          channels?: Json
          conditions?: Json | null
          created_at?: string
          created_by?: string | null
          dealer_id?: number
          description?: string | null
          enabled?: boolean
          event?: string
          id?: string
          metadata?: Json | null
          module?: string
          priority?: number
          recipients?: Json
          rule_name?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dealer_notification_rules_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealer_notification_rules_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_notification_rules_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      dealer_role_chat_templates: {
        Row: {
          conversation_types: string[] | null
          created_at: string | null
          created_by: string | null
          dealer_id: number
          default_capabilities: Json
          default_permission_level:
            | Database["public"]["Enums"]["chat_permission_level"]
            | null
          id: string
          role_name: string
          updated_at: string | null
        }
        Insert: {
          conversation_types?: string[] | null
          created_at?: string | null
          created_by?: string | null
          dealer_id: number
          default_capabilities?: Json
          default_permission_level?:
            | Database["public"]["Enums"]["chat_permission_level"]
            | null
          id?: string
          role_name: string
          updated_at?: string | null
        }
        Update: {
          conversation_types?: string[] | null
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number
          default_capabilities?: Json
          default_permission_level?:
            | Database["public"]["Enums"]["chat_permission_level"]
            | null
          id?: string
          role_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dealer_role_chat_templates_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealer_role_chat_templates_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_role_chat_templates_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      dealer_role_permissions: {
        Row: {
          created_at: string | null
          id: string
          module: string
          permission_level: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module: string
          permission_level: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module?: string
          permission_level?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "dealer_custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "v_permission_migration_status"
            referencedColumns: ["role_id"]
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
          color: string | null
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
          color?: string | null
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
          color?: string | null
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
      dealer_vehicle_activity_log: {
        Row: {
          action_at: string | null
          action_by: string | null
          activity_type: string
          created_at: string | null
          dealer_id: number
          description: string
          field_name: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          vehicle_id: string
        }
        Insert: {
          action_at?: string | null
          action_by?: string | null
          activity_type: string
          created_at?: string | null
          dealer_id: number
          description: string
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          vehicle_id: string
        }
        Update: {
          action_at?: string | null
          action_by?: string | null
          activity_type?: string
          created_at?: string | null
          dealer_id?: number
          description?: string
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_vehicle_activity_log_action_by_fkey"
            columns: ["action_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_vehicle_activity_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "dealer_vehicle_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      dealer_vehicle_inventory: {
        Row: {
          acv_max_retail: number | null
          acv_wholesale: number | null
          age_days: number | null
          cargurus_ctr: number | null
          cargurus_srp_views: number | null
          cargurus_vdp_views: number | null
          certified_program: string | null
          color: string | null
          cost_to_market: number | null
          created_at: string
          dealer_id: number
          dms_status: string | null
          drivetrain: string | null
          estimated_profit: number | null
          galves_value: number | null
          id: string
          is_active: boolean
          is_certified: boolean | null
          key_information: string | null
          key_photo_url: string | null
          last_reprice_date: string | null
          leads_daily_avg_last_7_days: number | null
          leads_last_7_days: number | null
          leads_since_last_reprice: number | null
          leads_total: number | null
          lot_location: string | null
          make: string | null
          market_listings_matching: number | null
          market_listings_overall: number | null
          market_rank_matching: number | null
          market_rank_overall: number | null
          mds_matching: number | null
          mds_overall: number | null
          mileage: number | null
          mmr_value: number | null
          mmr_vs_cost: number | null
          model: string | null
          msrp: number | null
          objective: string | null
          percent_to_market: number | null
          photo_count: number | null
          price: number | null
          proof_point_jd_power: string | null
          proof_point_kbb: string | null
          proof_point_market: string | null
          proof_point_msrp: string | null
          raw_data: Json | null
          risk_light: string | null
          segment: string | null
          stock_number: string
          syndication_status: string | null
          trim: string | null
          unit_cost: number | null
          updated_at: string
          vin: string
          water_damage: boolean | null
          year: number | null
        }
        Insert: {
          acv_max_retail?: number | null
          acv_wholesale?: number | null
          age_days?: number | null
          cargurus_ctr?: number | null
          cargurus_srp_views?: number | null
          cargurus_vdp_views?: number | null
          certified_program?: string | null
          color?: string | null
          cost_to_market?: number | null
          created_at?: string
          dealer_id: number
          dms_status?: string | null
          drivetrain?: string | null
          estimated_profit?: number | null
          galves_value?: number | null
          id?: string
          is_active?: boolean
          is_certified?: boolean | null
          key_information?: string | null
          key_photo_url?: string | null
          last_reprice_date?: string | null
          leads_daily_avg_last_7_days?: number | null
          leads_last_7_days?: number | null
          leads_since_last_reprice?: number | null
          leads_total?: number | null
          lot_location?: string | null
          make?: string | null
          market_listings_matching?: number | null
          market_listings_overall?: number | null
          market_rank_matching?: number | null
          market_rank_overall?: number | null
          mds_matching?: number | null
          mds_overall?: number | null
          mileage?: number | null
          mmr_value?: number | null
          mmr_vs_cost?: number | null
          model?: string | null
          msrp?: number | null
          objective?: string | null
          percent_to_market?: number | null
          photo_count?: number | null
          price?: number | null
          proof_point_jd_power?: string | null
          proof_point_kbb?: string | null
          proof_point_market?: string | null
          proof_point_msrp?: string | null
          raw_data?: Json | null
          risk_light?: string | null
          segment?: string | null
          stock_number: string
          syndication_status?: string | null
          trim?: string | null
          unit_cost?: number | null
          updated_at?: string
          vin: string
          water_damage?: boolean | null
          year?: number | null
        }
        Update: {
          acv_max_retail?: number | null
          acv_wholesale?: number | null
          age_days?: number | null
          cargurus_ctr?: number | null
          cargurus_srp_views?: number | null
          cargurus_vdp_views?: number | null
          certified_program?: string | null
          color?: string | null
          cost_to_market?: number | null
          created_at?: string
          dealer_id?: number
          dms_status?: string | null
          drivetrain?: string | null
          estimated_profit?: number | null
          galves_value?: number | null
          id?: string
          is_active?: boolean
          is_certified?: boolean | null
          key_information?: string | null
          key_photo_url?: string | null
          last_reprice_date?: string | null
          leads_daily_avg_last_7_days?: number | null
          leads_last_7_days?: number | null
          leads_since_last_reprice?: number | null
          leads_total?: number | null
          lot_location?: string | null
          make?: string | null
          market_listings_matching?: number | null
          market_listings_overall?: number | null
          market_rank_matching?: number | null
          market_rank_overall?: number | null
          mds_matching?: number | null
          mds_overall?: number | null
          mileage?: number | null
          mmr_value?: number | null
          mmr_vs_cost?: number | null
          model?: string | null
          msrp?: number | null
          objective?: string | null
          percent_to_market?: number | null
          photo_count?: number | null
          price?: number | null
          proof_point_jd_power?: string | null
          proof_point_kbb?: string | null
          proof_point_market?: string | null
          proof_point_msrp?: string | null
          raw_data?: Json | null
          risk_light?: string | null
          segment?: string | null
          stock_number?: string
          syndication_status?: string | null
          trim?: string | null
          unit_cost?: number | null
          updated_at?: string
          vin?: string
          water_damage?: boolean | null
          year?: number | null
        }
        Relationships: []
      }
      dealer_vehicle_photos: {
        Row: {
          category: string | null
          created_at: string | null
          dealer_id: number
          display_order: number | null
          id: string
          is_key_photo: boolean | null
          metadata: Json | null
          photo_url: string
          storage_path: string | null
          updated_at: string | null
          uploaded_by: string | null
          vehicle_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          dealer_id: number
          display_order?: number | null
          id?: string
          is_key_photo?: boolean | null
          metadata?: Json | null
          photo_url: string
          storage_path?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          vehicle_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          dealer_id?: number
          display_order?: number | null
          id?: string
          is_key_photo?: boolean | null
          metadata?: Json | null
          photo_url?: string
          storage_path?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dealer_vehicle_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_vehicle_photos_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "dealer_vehicle_inventory"
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
          plate: string | null
          position: string | null
          preferred_language:
            | Database["public"]["Enums"]["language_code"]
            | null
          status: Database["public"]["Enums"]["dealership_status"] | null
          updated_at: string | null
          vehicle: string | null
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
          plate?: string | null
          position?: string | null
          preferred_language?:
            | Database["public"]["Enums"]["language_code"]
            | null
          status?: Database["public"]["Enums"]["dealership_status"] | null
          updated_at?: string | null
          vehicle?: string | null
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
          plate?: string | null
          position?: string | null
          preferred_language?:
            | Database["public"]["Enums"]["language_code"]
            | null
          status?: Database["public"]["Enums"]["dealership_status"] | null
          updated_at?: string | null
          vehicle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dealership_contacts_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealership_contacts_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealership_contacts_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
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
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealership_modules_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealership_modules_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
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
          thumbnail_logo_url: string | null
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
          thumbnail_logo_url?: string | null
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
          thumbnail_logo_url?: string | null
          updated_at?: string | null
          website?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      dealerships_v2: {
        Row: {
          address: Json
          brand: string
          business_hours: Json | null
          code: string
          contact_info: Json
          created_at: string | null
          id: string
          name: string
          settings: Json | null
          status: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: Json
          brand: string
          business_hours?: Json | null
          code: string
          contact_info?: Json
          created_at?: string | null
          id?: string
          name: string
          settings?: Json | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json
          brand?: string
          business_hours?: Json | null
          code?: string
          contact_info?: Json
          created_at?: string | null
          id?: string
          name?: string
          settings?: Json | null
          status?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      departments_v2: {
        Row: {
          created_at: string | null
          dealership_id: string
          description: string | null
          id: string
          is_active: boolean | null
          manager_user_id: string | null
          name: string
          settings: Json | null
          type: Database["public"]["Enums"]["department_type_v2"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dealership_id: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_user_id?: string | null
          name: string
          settings?: Json | null
          type: Database["public"]["Enums"]["department_type_v2"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dealership_id?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_user_id?: string | null
          name?: string
          settings?: Json | null
          type?: Database["public"]["Enums"]["department_type_v2"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_v2_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_v2_manager_user_id_fkey"
            columns: ["manager_user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_employees: {
        Row: {
          created_at: string | null
          dealer_id: number
          department: string | null
          emergency_contact: Json | null
          employee_number: string
          face_data: Json | null
          hire_date: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          preferences: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          dealer_id: number
          department?: string | null
          emergency_contact?: Json | null
          employee_number: string
          face_data?: Json | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          dealer_id?: number
          department?: string | null
          emergency_contact?: Json | null
          employee_number?: string
          face_data?: Json | null
          hire_date?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          preferences?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_employees_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_employees_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_employees_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      detail_hub_employees: {
        Row: {
          auto_generate_schedules: boolean | null
          can_punch_any_kiosk: boolean
          created_at: string | null
          dealership_id: number
          default_kiosk_id: string | null
          department: string
          email: string | null
          employee_number: string
          enrolled_at: string | null
          face_collection_id: string | null
          face_confidence: number | null
          face_enrolled: boolean | null
          face_id: string | null
          fallback_photo_enabled: boolean | null
          fallback_photo_url: string | null
          first_name: string
          hire_date: string
          hourly_rate: number | null
          id: string
          last_name: string
          phone: string | null
          pin_code: string | null
          role: string
          schedule_generation_days_ahead: number | null
          schedule_template: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          auto_generate_schedules?: boolean | null
          can_punch_any_kiosk?: boolean
          created_at?: string | null
          dealership_id: number
          default_kiosk_id?: string | null
          department: string
          email?: string | null
          employee_number: string
          enrolled_at?: string | null
          face_collection_id?: string | null
          face_confidence?: number | null
          face_enrolled?: boolean | null
          face_id?: string | null
          fallback_photo_enabled?: boolean | null
          fallback_photo_url?: string | null
          first_name: string
          hire_date: string
          hourly_rate?: number | null
          id?: string
          last_name: string
          phone?: string | null
          pin_code?: string | null
          role: string
          schedule_generation_days_ahead?: number | null
          schedule_template?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_generate_schedules?: boolean | null
          can_punch_any_kiosk?: boolean
          created_at?: string | null
          dealership_id?: number
          default_kiosk_id?: string | null
          department?: string
          email?: string | null
          employee_number?: string
          enrolled_at?: string | null
          face_collection_id?: string | null
          face_confidence?: number | null
          face_enrolled?: boolean | null
          face_id?: string | null
          fallback_photo_enabled?: boolean | null
          fallback_photo_url?: string | null
          first_name?: string
          hire_date?: string
          hourly_rate?: number | null
          id?: string
          last_name?: string
          phone?: string | null
          pin_code?: string | null
          role?: string
          schedule_generation_days_ahead?: number | null
          schedule_template?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_hub_employees_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_hub_employees_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_hub_employees_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_hub_employees_default_kiosk_id_fkey"
            columns: ["default_kiosk_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_kiosks"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_hub_face_audit: {
        Row: {
          action: string
          confidence: number | null
          created_at: string | null
          dealership_id: number
          employee_id: string
          error_code: string | null
          error_message: string | null
          face_angle_degrees: number | null
          face_count: number | null
          face_detected: boolean | null
          face_size_pixels: number | null
          id: string
          ip_address: unknown
          kiosk_id: string | null
          lighting_quality: string | null
          metadata: Json | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          action: string
          confidence?: number | null
          created_at?: string | null
          dealership_id: number
          employee_id: string
          error_code?: string | null
          error_message?: string | null
          face_angle_degrees?: number | null
          face_count?: number | null
          face_detected?: boolean | null
          face_size_pixels?: number | null
          id?: string
          ip_address?: unknown
          kiosk_id?: string | null
          lighting_quality?: string | null
          metadata?: Json | null
          success: boolean
          user_agent?: string | null
        }
        Update: {
          action?: string
          confidence?: number | null
          created_at?: string | null
          dealership_id?: number
          employee_id?: string
          error_code?: string | null
          error_message?: string | null
          face_angle_degrees?: number | null
          face_count?: number | null
          face_detected?: boolean | null
          face_size_pixels?: number | null
          id?: string
          ip_address?: unknown
          kiosk_id?: string | null
          lighting_quality?: string | null
          metadata?: Json | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_hub_face_audit_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_hub_face_audit_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_hub_face_audit_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_hub_face_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_currently_working"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "detail_hub_face_audit_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_hub_invoice_line_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invoice_id: string
          line_number: number
          line_total: number
          quantity: number
          service_name: string
          time_entry_id: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id: string
          line_number: number
          line_total: number
          quantity?: number
          service_name: string
          time_entry_id?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invoice_id?: string
          line_number?: number
          line_total?: number
          quantity?: number
          service_name?: string
          time_entry_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "detail_hub_invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_hub_invoice_line_items_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_currently_working"
            referencedColumns: ["time_entry_id"]
          },
          {
            foreignKeyName: "detail_hub_invoice_line_items_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_hub_invoices: {
        Row: {
          client_address: string | null
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          created_by: string | null
          dealership_id: number
          description: string | null
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          sent_date: string | null
          status: Database["public"]["Enums"]["detail_hub_invoice_status"]
          subtotal: number
          tax_amount: number
          tax_rate: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_address?: string | null
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          dealership_id: number
          description?: string | null
          due_date: string
          id?: string
          invoice_number: string
          issue_date?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          sent_date?: string | null
          status?: Database["public"]["Enums"]["detail_hub_invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_address?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          created_by?: string | null
          dealership_id?: number
          description?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          sent_date?: string | null
          status?: Database["public"]["Enums"]["detail_hub_invoice_status"]
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "detail_hub_invoices_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_hub_invoices_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_hub_invoices_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      detail_hub_kiosks: {
        Row: {
          camera_resolution: string | null
          created_at: string | null
          dealership_id: number
          device_type: string | null
          face_recognition_enabled: boolean | null
          has_lighting: boolean | null
          id: string
          ip_address: unknown
          kiosk_code: string
          last_heartbeat: string | null
          location: string | null
          mac_address: string | null
          name: string
          photo_fallback_enabled: boolean | null
          pin_fallback_enabled: boolean | null
          require_supervisor_approval: boolean | null
          settings: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          camera_resolution?: string | null
          created_at?: string | null
          dealership_id: number
          device_type?: string | null
          face_recognition_enabled?: boolean | null
          has_lighting?: boolean | null
          id?: string
          ip_address?: unknown
          kiosk_code: string
          last_heartbeat?: string | null
          location?: string | null
          mac_address?: string | null
          name: string
          photo_fallback_enabled?: boolean | null
          pin_fallback_enabled?: boolean | null
          require_supervisor_approval?: boolean | null
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          camera_resolution?: string | null
          created_at?: string | null
          dealership_id?: number
          device_type?: string | null
          face_recognition_enabled?: boolean | null
          has_lighting?: boolean | null
          id?: string
          ip_address?: unknown
          kiosk_code?: string
          last_heartbeat?: string | null
          location?: string | null
          mac_address?: string | null
          name?: string
          photo_fallback_enabled?: boolean | null
          pin_fallback_enabled?: boolean | null
          require_supervisor_approval?: boolean | null
          settings?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_hub_kiosks_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_hub_kiosks_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_hub_kiosks_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      detail_hub_schedules: {
        Row: {
          assigned_kiosk_id: string | null
          break_is_paid: boolean
          created_at: string
          created_by: string | null
          dealership_id: number
          early_punch_allowed_minutes: number
          employee_id: string
          id: string
          late_punch_grace_minutes: number
          notes: string | null
          required_break_minutes: number
          shift_date: string
          shift_end_time: string
          shift_start_time: string
          status: Database["public"]["Enums"]["detail_hub_shift_status"]
          time_entry_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_kiosk_id?: string | null
          break_is_paid?: boolean
          created_at?: string
          created_by?: string | null
          dealership_id: number
          early_punch_allowed_minutes?: number
          employee_id: string
          id?: string
          late_punch_grace_minutes?: number
          notes?: string | null
          required_break_minutes?: number
          shift_date: string
          shift_end_time: string
          shift_start_time: string
          status?: Database["public"]["Enums"]["detail_hub_shift_status"]
          time_entry_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_kiosk_id?: string | null
          break_is_paid?: boolean
          created_at?: string
          created_by?: string | null
          dealership_id?: number
          early_punch_allowed_minutes?: number
          employee_id?: string
          id?: string
          late_punch_grace_minutes?: number
          notes?: string | null
          required_break_minutes?: number
          shift_date?: string
          shift_end_time?: string
          shift_start_time?: string
          status?: Database["public"]["Enums"]["detail_hub_shift_status"]
          time_entry_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "detail_hub_schedules_assigned_kiosk_id_fkey"
            columns: ["assigned_kiosk_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_kiosks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_hub_schedules_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_hub_schedules_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_hub_schedules_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_hub_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_currently_working"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "detail_hub_schedules_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_hub_schedules_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_currently_working"
            referencedColumns: ["time_entry_id"]
          },
          {
            foreignKeyName: "detail_hub_schedules_time_entry_id_fkey"
            columns: ["time_entry_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_time_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_hub_time_entries: {
        Row: {
          break_duration_minutes: number | null
          break_end: string | null
          break_end_photo_url: string | null
          break_policy_compliant: boolean | null
          break_start: string | null
          break_start_photo_url: string | null
          break_violation_reason: string | null
          clock_in: string
          clock_out: string | null
          created_at: string | null
          dealership_id: number
          early_punch_approved: boolean | null
          employee_id: string
          face_confidence_in: number | null
          face_confidence_out: number | null
          id: string
          ip_address: unknown
          kiosk_id: string | null
          late_punch_approved: boolean | null
          notes: string | null
          overtime_hours: number | null
          photo_in_url: string | null
          photo_out_url: string | null
          punch_in_method: string | null
          punch_out_method: string | null
          regular_hours: number | null
          requires_manual_verification: boolean | null
          schedule_id: string | null
          schedule_variance_minutes: number | null
          status: string | null
          total_hours: number | null
          updated_at: string | null
          user_agent: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          break_duration_minutes?: number | null
          break_end?: string | null
          break_end_photo_url?: string | null
          break_policy_compliant?: boolean | null
          break_start?: string | null
          break_start_photo_url?: string | null
          break_violation_reason?: string | null
          clock_in: string
          clock_out?: string | null
          created_at?: string | null
          dealership_id: number
          early_punch_approved?: boolean | null
          employee_id: string
          face_confidence_in?: number | null
          face_confidence_out?: number | null
          id?: string
          ip_address?: unknown
          kiosk_id?: string | null
          late_punch_approved?: boolean | null
          notes?: string | null
          overtime_hours?: number | null
          photo_in_url?: string | null
          photo_out_url?: string | null
          punch_in_method?: string | null
          punch_out_method?: string | null
          regular_hours?: number | null
          requires_manual_verification?: boolean | null
          schedule_id?: string | null
          schedule_variance_minutes?: number | null
          status?: string | null
          total_hours?: number | null
          updated_at?: string | null
          user_agent?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          break_duration_minutes?: number | null
          break_end?: string | null
          break_end_photo_url?: string | null
          break_policy_compliant?: boolean | null
          break_start?: string | null
          break_start_photo_url?: string | null
          break_violation_reason?: string | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string | null
          dealership_id?: number
          early_punch_approved?: boolean | null
          employee_id?: string
          face_confidence_in?: number | null
          face_confidence_out?: number | null
          id?: string
          ip_address?: unknown
          kiosk_id?: string | null
          late_punch_approved?: boolean | null
          notes?: string | null
          overtime_hours?: number | null
          photo_in_url?: string | null
          photo_out_url?: string | null
          punch_in_method?: string | null
          punch_out_method?: string | null
          regular_hours?: number | null
          requires_manual_verification?: boolean | null
          schedule_id?: string | null
          schedule_variance_minutes?: number | null
          status?: string | null
          total_hours?: number | null
          updated_at?: string | null
          user_agent?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_hub_time_entries_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_hub_time_entries_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_hub_time_entries_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_hub_time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_currently_working"
            referencedColumns: ["employee_id"]
          },
          {
            foreignKeyName: "detail_hub_time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_hub_time_entries_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "detail_hub_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_hub_time_entries_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          dealer_id: number
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string
          notes: string | null
          order_id: string | null
          paid_date: string | null
          payment_method: string | null
          pdf_url: string | null
          status: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          dealer_id: number
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          notes?: string | null
          order_id?: string | null
          paid_date?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          status?: string | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          dealer_id?: number
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          notes?: string | null
          order_id?: string | null
          paid_date?: string | null
          payment_method?: string | null
          pdf_url?: string | null
          status?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_invoices_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_invoices_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_invoices_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_kiosk_stations: {
        Row: {
          created_at: string | null
          created_by: string | null
          dealer_id: number
          id: string
          ip_address: unknown
          is_active: boolean | null
          last_ping: string | null
          location: string | null
          mac_address: string | null
          settings: Json | null
          station_name: string
          station_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dealer_id: number
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_ping?: string | null
          location?: string | null
          mac_address?: string | null
          settings?: Json | null
          station_name: string
          station_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number
          id?: string
          ip_address?: unknown
          is_active?: boolean | null
          last_ping?: string | null
          location?: string | null
          mac_address?: string | null
          settings?: Json | null
          station_name?: string
          station_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_kiosk_stations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_kiosk_stations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_kiosk_stations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      detail_shifts: {
        Row: {
          break_minutes: number | null
          created_at: string | null
          dealer_id: number
          employee_id: string
          id: string
          notes: string | null
          overtime_hours: number | null
          shift_date: string
          shift_end: string | null
          shift_start: string
          status: string | null
          total_hours: number | null
          updated_at: string | null
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string | null
          dealer_id: number
          employee_id: string
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          shift_date: string
          shift_end?: string | null
          shift_start: string
          status?: string | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Update: {
          break_minutes?: number | null
          created_at?: string | null
          dealer_id?: number
          employee_id?: string
          id?: string
          notes?: string | null
          overtime_hours?: number | null
          shift_date?: string
          shift_end?: string | null
          shift_start?: string
          status?: string | null
          total_hours?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_shifts_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_shifts_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_shifts_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_shifts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "detail_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_time_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          dealer_id: number
          device_info: Json | null
          employee_id: string
          entry_type: string
          face_confidence: number | null
          id: string
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          photo_url: string | null
          shift_id: string | null
          timestamp: string | null
          verification_method: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dealer_id: number
          device_info?: Json | null
          employee_id: string
          entry_type: string
          face_confidence?: number | null
          id?: string
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          photo_url?: string | null
          shift_id?: string | null
          timestamp?: string | null
          verification_method?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number
          device_info?: Json | null
          employee_id?: string
          entry_type?: string
          face_confidence?: number | null
          id?: string
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          photo_url?: string | null
          shift_id?: string | null
          timestamp?: string | null
          verification_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_time_entries_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_time_entries_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_time_entries_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_time_entries_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "detail_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_time_entries_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "detail_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      edge_function_logs: {
        Row: {
          created_at: string
          data: Json | null
          dealer_id: number | null
          error_details: Json | null
          function_name: string
          id: string
          level: string
          message: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          dealer_id?: number | null
          error_details?: Json | null
          function_name: string
          id?: string
          level: string
          message: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          dealer_id?: number | null
          error_details?: Json | null
          function_name?: string
          id?: string
          level?: string
          message?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "edge_function_logs_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "edge_function_logs_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "edge_function_logs_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      entity_followers: {
        Row: {
          auto_added_reason: string | null
          created_at: string | null
          dealer_id: number
          entity_id: string
          entity_type: string
          follow_type: Database["public"]["Enums"]["entity_follow_type"]
          followed_at: string | null
          followed_by: string | null
          id: string
          is_active: boolean | null
          notification_level: Database["public"]["Enums"]["notification_level"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_added_reason?: string | null
          created_at?: string | null
          dealer_id: number
          entity_id: string
          entity_type: string
          follow_type?: Database["public"]["Enums"]["entity_follow_type"]
          followed_at?: string | null
          followed_by?: string | null
          id?: string
          is_active?: boolean | null
          notification_level?: Database["public"]["Enums"]["notification_level"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_added_reason?: string | null
          created_at?: string | null
          dealer_id?: number
          entity_id?: string
          entity_type?: string
          follow_type?: Database["public"]["Enums"]["entity_follow_type"]
          followed_at?: string | null
          followed_by?: string | null
          id?: string
          is_active?: boolean | null
          notification_level?: Database["public"]["Enums"]["notification_level"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_followers_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "entity_followers_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_followers_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "fk_entity_followers_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          created_at: string | null
          dealer_id: number
          fcm_token: string
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dealer_id: number
          fcm_token: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dealer_id?: number
          fcm_token?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fcm_tokens_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "fcm_tokens_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fcm_tokens_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      get_ready_approval_history: {
        Row: {
          action: Database["public"]["Enums"]["approval_status"]
          action_at: string
          action_by: string
          created_at: string | null
          dealer_id: number
          id: string
          notes: string | null
          reason: string | null
          vehicle_id: string
          vehicle_priority: string | null
          vehicle_step_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["approval_status"]
          action_at?: string
          action_by: string
          created_at?: string | null
          dealer_id: number
          id?: string
          notes?: string | null
          reason?: string | null
          vehicle_id: string
          vehicle_priority?: string | null
          vehicle_step_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["approval_status"]
          action_at?: string
          action_by?: string
          created_at?: string | null
          dealer_id?: number
          id?: string
          notes?: string | null
          reason?: string | null
          vehicle_id?: string
          vehicle_priority?: string | null
          vehicle_step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "get_ready_approval_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_approval_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_approval_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_approval_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "active_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_approval_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "deleted_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_approval_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_approval_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_step_times_current"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      get_ready_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          dealer_id: number
          dismissed_at: string | null
          expires_at: string | null
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          related_step_id: string | null
          related_vehicle_id: string | null
          related_work_item_id: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          dealer_id: number
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          related_step_id?: string | null
          related_vehicle_id?: string | null
          related_work_item_id?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          dealer_id?: number
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          related_step_id?: string | null
          related_vehicle_id?: string | null
          related_work_item_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_dealer"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "fk_dealer"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dealer"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_notifications_related_vehicle_id_fkey"
            columns: ["related_vehicle_id"]
            isOneToOne: false
            referencedRelation: "active_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_notifications_related_vehicle_id_fkey"
            columns: ["related_vehicle_id"]
            isOneToOne: false
            referencedRelation: "deleted_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_notifications_related_vehicle_id_fkey"
            columns: ["related_vehicle_id"]
            isOneToOne: false
            referencedRelation: "get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_notifications_related_vehicle_id_fkey"
            columns: ["related_vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_step_times_current"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      get_ready_sla_config: {
        Row: {
          business_days: number[] | null
          business_hours_end: string | null
          business_hours_start: string | null
          count_business_hours_only: boolean | null
          count_weekends: boolean | null
          created_at: string | null
          created_by: string | null
          danger_threshold: number
          dealer_id: number
          default_time_goal: number
          enable_notifications: boolean | null
          green_threshold: number
          id: string
          max_time_goal: number
          notification_recipients: string[] | null
          updated_at: string | null
          updated_by: string | null
          warning_threshold: number
        }
        Insert: {
          business_days?: number[] | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          count_business_hours_only?: boolean | null
          count_weekends?: boolean | null
          created_at?: string | null
          created_by?: string | null
          danger_threshold?: number
          dealer_id: number
          default_time_goal?: number
          enable_notifications?: boolean | null
          green_threshold?: number
          id?: string
          max_time_goal?: number
          notification_recipients?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          warning_threshold?: number
        }
        Update: {
          business_days?: number[] | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          count_business_hours_only?: boolean | null
          count_weekends?: boolean | null
          created_at?: string | null
          created_by?: string | null
          danger_threshold?: number
          dealer_id?: number
          default_time_goal?: number
          enable_notifications?: boolean | null
          green_threshold?: number
          id?: string
          max_time_goal?: number
          notification_recipients?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          warning_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "get_ready_sla_config_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_sla_config_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: true
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_sla_config_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: true
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_sla_config_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: true
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_sla_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      get_ready_step_assignments: {
        Row: {
          created_at: string | null
          dealer_id: number
          id: string
          notification_enabled: boolean | null
          role: string | null
          step_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dealer_id: number
          id?: string
          notification_enabled?: boolean | null
          role?: string | null
          step_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dealer_id?: number
          id?: string
          notification_enabled?: boolean | null
          role?: string | null
          step_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "get_ready_step_assignments_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_step_assignments_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_step_assignments_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_step_assignments_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "get_ready_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_step_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      get_ready_step_sla_config: {
        Row: {
          created_at: string | null
          danger_threshold: number
          green_threshold: number
          id: string
          sla_config_id: string
          step_id: string
          time_goal: number
          updated_at: string | null
          warning_threshold: number
        }
        Insert: {
          created_at?: string | null
          danger_threshold: number
          green_threshold: number
          id?: string
          sla_config_id: string
          step_id: string
          time_goal: number
          updated_at?: string | null
          warning_threshold: number
        }
        Update: {
          created_at?: string | null
          danger_threshold?: number
          green_threshold?: number
          id?: string
          sla_config_id?: string
          step_id?: string
          time_goal?: number
          updated_at?: string | null
          warning_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "get_ready_step_sla_config_sla_config_id_fkey"
            columns: ["sla_config_id"]
            isOneToOne: false
            referencedRelation: "get_ready_sla_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_step_sla_config_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "get_ready_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      get_ready_steps: {
        Row: {
          bottleneck_threshold: number | null
          color: string
          cost_per_day: number | null
          created_at: string | null
          dealer_id: number
          description: string | null
          express_lane_eligible: boolean | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          order_index: number
          parallel_capable: boolean | null
          sla_hours: number | null
          target_throughput: number | null
          updated_at: string | null
        }
        Insert: {
          bottleneck_threshold?: number | null
          color?: string
          cost_per_day?: number | null
          created_at?: string | null
          dealer_id: number
          description?: string | null
          express_lane_eligible?: boolean | null
          icon?: string | null
          id: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          order_index: number
          parallel_capable?: boolean | null
          sla_hours?: number | null
          target_throughput?: number | null
          updated_at?: string | null
        }
        Update: {
          bottleneck_threshold?: number | null
          color?: string
          cost_per_day?: number | null
          created_at?: string | null
          dealer_id?: number
          description?: string | null
          express_lane_eligible?: boolean | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          order_index?: number
          parallel_capable?: boolean | null
          sla_hours?: number | null
          target_throughput?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "get_ready_steps_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_steps_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_steps_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      get_ready_vehicle_activity_log: {
        Row: {
          action_at: string
          action_by: string | null
          activity_type: string
          created_at: string | null
          dealer_id: number
          description: string
          field_name: string | null
          id: string
          metadata: Json | null
          new_value: string | null
          old_value: string | null
          vehicle_id: string
        }
        Insert: {
          action_at?: string
          action_by?: string | null
          activity_type: string
          created_at?: string | null
          dealer_id: number
          description: string
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          vehicle_id: string
        }
        Update: {
          action_at?: string
          action_by?: string | null
          activity_type?: string
          created_at?: string | null
          dealer_id?: number
          description?: string
          field_name?: string | null
          id?: string
          metadata?: Json | null
          new_value?: string | null
          old_value?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "get_ready_vehicle_activity_log_action_by_fkey"
            columns: ["action_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicle_activity_log_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_vehicle_activity_log_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicle_activity_log_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_vehicle_activity_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "active_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicle_activity_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "deleted_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicle_activity_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicle_activity_log_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_step_times_current"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      get_ready_vehicles: {
        Row: {
          actual_t2l: number | null
          approval_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_at: string | null
          approved_by: string | null
          assigned_group_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          days_in_step: number | null
          dealer_id: number
          deleted_at: string | null
          deleted_by: string | null
          escalation_level: number | null
          frontline_reached_at: string | null
          holding_cost_daily: number | null
          id: string
          intake_date: string | null
          is_bottlenecked: boolean | null
          media_count: number | null
          metadata: Json | null
          notes: string | null
          notes_count: number | null
          priority: Database["public"]["Enums"]["get_ready_priority"] | null
          priority_score: number | null
          progress: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requires_approval: boolean | null
          sla_hours_remaining: number | null
          sla_status: Database["public"]["Enums"]["get_ready_sla_status"] | null
          status: string | null
          step_id: string
          stock_number: string
          t2l_estimate: number | null
          target_frontline_date: string | null
          timer_paused: boolean | null
          total_holding_cost: number | null
          updated_at: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_trim: string | null
          vehicle_year: number | null
          vin: string | null
        }
        Insert: {
          actual_t2l?: number | null
          approval_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_group_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          days_in_step?: number | null
          dealer_id: number
          deleted_at?: string | null
          deleted_by?: string | null
          escalation_level?: number | null
          frontline_reached_at?: string | null
          holding_cost_daily?: number | null
          id?: string
          intake_date?: string | null
          is_bottlenecked?: boolean | null
          media_count?: number | null
          metadata?: Json | null
          notes?: string | null
          notes_count?: number | null
          priority?: Database["public"]["Enums"]["get_ready_priority"] | null
          priority_score?: number | null
          progress?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
          sla_hours_remaining?: number | null
          sla_status?:
            | Database["public"]["Enums"]["get_ready_sla_status"]
            | null
          status?: string | null
          step_id: string
          stock_number: string
          t2l_estimate?: number | null
          target_frontline_date?: string | null
          timer_paused?: boolean | null
          total_holding_cost?: number | null
          updated_at?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_trim?: string | null
          vehicle_year?: number | null
          vin?: string | null
        }
        Update: {
          actual_t2l?: number | null
          approval_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_group_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          days_in_step?: number | null
          dealer_id?: number
          deleted_at?: string | null
          deleted_by?: string | null
          escalation_level?: number | null
          frontline_reached_at?: string | null
          holding_cost_daily?: number | null
          id?: string
          intake_date?: string | null
          is_bottlenecked?: boolean | null
          media_count?: number | null
          metadata?: Json | null
          notes?: string | null
          notes_count?: number | null
          priority?: Database["public"]["Enums"]["get_ready_priority"] | null
          priority_score?: number | null
          progress?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
          sla_hours_remaining?: number | null
          sla_status?:
            | Database["public"]["Enums"]["get_ready_sla_status"]
            | null
          status?: string | null
          step_id?: string
          stock_number?: string
          t2l_estimate?: number | null
          target_frontline_date?: string | null
          timer_paused?: boolean | null
          total_holding_cost?: number | null
          updated_at?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_trim?: string | null
          vehicle_year?: number | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_get_ready_vehicles_approved_by"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_get_ready_vehicles_rejected_by"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "dealer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "get_ready_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      get_ready_work_items: {
        Row: {
          actual_cost: number | null
          actual_end: string | null
          actual_hours: number | null
          actual_start: string | null
          approval_required: boolean | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_technician: string | null
          assigned_vendor_id: string | null
          blocked_by: string[] | null
          blocked_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          created_at: string | null
          created_by: string | null
          dealer_id: number
          decline_reason: string | null
          description: string | null
          estimated_cost: number | null
          estimated_hours: number | null
          id: string
          on_hold_reason: string | null
          parts_required: Json | null
          parts_status: string | null
          photos_after: string[] | null
          photos_before: string[] | null
          priority: number
          scheduled_end: string | null
          scheduled_start: string | null
          status: Database["public"]["Enums"]["work_item_status"]
          title: string
          updated_at: string | null
          vehicle_id: string
          work_type: Database["public"]["Enums"]["work_item_type"]
        }
        Insert: {
          actual_cost?: number | null
          actual_end?: string | null
          actual_hours?: number | null
          actual_start?: string | null
          approval_required?: boolean | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_technician?: string | null
          assigned_vendor_id?: string | null
          blocked_by?: string[] | null
          blocked_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          dealer_id: number
          decline_reason?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          on_hold_reason?: string | null
          parts_required?: Json | null
          parts_status?: string | null
          photos_after?: string[] | null
          photos_before?: string[] | null
          priority?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["work_item_status"]
          title: string
          updated_at?: string | null
          vehicle_id: string
          work_type?: Database["public"]["Enums"]["work_item_type"]
        }
        Update: {
          actual_cost?: number | null
          actual_end?: string | null
          actual_hours?: number | null
          actual_start?: string | null
          approval_required?: boolean | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_technician?: string | null
          assigned_vendor_id?: string | null
          blocked_by?: string[] | null
          blocked_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number
          decline_reason?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          on_hold_reason?: string | null
          parts_required?: Json | null
          parts_status?: string | null
          photos_after?: string[] | null
          photos_before?: string[] | null
          priority?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["work_item_status"]
          title?: string
          updated_at?: string | null
          vehicle_id?: string
          work_type?: Database["public"]["Enums"]["work_item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "get_ready_work_items_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_work_items_assigned_technician_fkey"
            columns: ["assigned_technician"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_work_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_work_items_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_work_items_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_work_items_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_work_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "active_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_work_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "deleted_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_work_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_work_items_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_step_times_current"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      get_ready_work_items_backup_20251023: {
        Row: {
          actual_cost: number | null
          actual_end: string | null
          actual_hours: number | null
          actual_start: string | null
          approval_required: boolean | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_technician: string | null
          assigned_vendor_id: string | null
          blocked_by: string[] | null
          blocked_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          cancelled_reason: string | null
          created_at: string | null
          created_by: string | null
          dealer_id: number | null
          decline_reason: string | null
          description: string | null
          estimated_cost: number | null
          estimated_hours: number | null
          id: string | null
          on_hold_reason: string | null
          parts_required: Json | null
          parts_status: string | null
          photos_after: string[] | null
          photos_before: string[] | null
          priority: number | null
          scheduled_end: string | null
          scheduled_start: string | null
          status: Database["public"]["Enums"]["work_item_status"] | null
          title: string | null
          updated_at: string | null
          vehicle_id: string | null
          work_type: Database["public"]["Enums"]["work_item_type"] | null
        }
        Insert: {
          actual_cost?: number | null
          actual_end?: string | null
          actual_hours?: number | null
          actual_start?: string | null
          approval_required?: boolean | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_technician?: string | null
          assigned_vendor_id?: string | null
          blocked_by?: string[] | null
          blocked_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number | null
          decline_reason?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string | null
          on_hold_reason?: string | null
          parts_required?: Json | null
          parts_status?: string | null
          photos_after?: string[] | null
          photos_before?: string[] | null
          priority?: number | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["work_item_status"] | null
          title?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
          work_type?: Database["public"]["Enums"]["work_item_type"] | null
        }
        Update: {
          actual_cost?: number | null
          actual_end?: string | null
          actual_hours?: number | null
          actual_start?: string | null
          approval_required?: boolean | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_technician?: string | null
          assigned_vendor_id?: string | null
          blocked_by?: string[] | null
          blocked_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          cancelled_reason?: string | null
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number | null
          decline_reason?: string | null
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string | null
          on_hold_reason?: string | null
          parts_required?: Json | null
          parts_status?: string | null
          photos_after?: string[] | null
          photos_before?: string[] | null
          priority?: number | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          status?: Database["public"]["Enums"]["work_item_status"] | null
          title?: string | null
          updated_at?: string | null
          vehicle_id?: string | null
          work_type?: Database["public"]["Enums"]["work_item_type"] | null
        }
        Relationships: []
      }
      get_ready_work_items_backup_pre_status_migration: {
        Row: {
          approval_required: boolean | null
          approval_status: string | null
          backup_created_at: string | null
          decline_reason: string | null
          id: string | null
          status: Database["public"]["Enums"]["work_item_status"] | null
          updated_at: string | null
        }
        Insert: {
          approval_required?: boolean | null
          approval_status?: string | null
          backup_created_at?: string | null
          decline_reason?: string | null
          id?: string | null
          status?: Database["public"]["Enums"]["work_item_status"] | null
          updated_at?: string | null
        }
        Update: {
          approval_required?: boolean | null
          approval_status?: string | null
          backup_created_at?: string | null
          decline_reason?: string | null
          id?: string | null
          status?: Database["public"]["Enums"]["work_item_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invitation_templates: {
        Row: {
          created_at: string | null
          dealer_id: string
          html_content: string
          id: string
          subject: string
          text_content: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dealer_id: string
          html_content: string
          id?: string
          subject: string
          text_content: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dealer_id?: string
          html_content?: string
          id?: string
          subject?: string
          text_content?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_comments: {
        Row: {
          comment: string
          created_at: string | null
          dealership_id: number
          id: string
          invoice_id: string
          is_edited: boolean | null
          is_internal: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          dealership_id: number
          id?: string
          invoice_id: string
          is_edited?: boolean | null
          is_internal?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          dealership_id?: number
          id?: string
          invoice_id?: string
          is_edited?: boolean | null
          is_internal?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_comments_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "invoice_comments_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_comments_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "invoice_comments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_email_contacts: {
        Row: {
          created_at: string | null
          created_by: string | null
          dealership_id: number
          email: string
          id: string
          is_active: boolean | null
          is_default: boolean | null
          job_title: string | null
          name: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dealership_id: number
          email: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          job_title?: string | null
          name: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dealership_id?: number
          email?: string
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          job_title?: string | null
          name?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_email_contacts_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "invoice_email_contacts_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_email_contacts_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      invoice_email_history: {
        Row: {
          attachments: Json | null
          bcc: string[] | null
          cc: string[] | null
          dealership_id: number
          error_message: string | null
          id: string
          invoice_id: string
          message: string | null
          metadata: Json | null
          provider_response: Json | null
          sent_at: string | null
          sent_by: string | null
          sent_to: string[]
          status: string
          subject: string
        }
        Insert: {
          attachments?: Json | null
          bcc?: string[] | null
          cc?: string[] | null
          dealership_id: number
          error_message?: string | null
          id?: string
          invoice_id: string
          message?: string | null
          metadata?: Json | null
          provider_response?: Json | null
          sent_at?: string | null
          sent_by?: string | null
          sent_to: string[]
          status?: string
          subject: string
        }
        Update: {
          attachments?: Json | null
          bcc?: string[] | null
          cc?: string[] | null
          dealership_id?: number
          error_message?: string | null
          id?: string
          invoice_id?: string
          message?: string | null
          metadata?: Json | null
          provider_response?: Json | null
          sent_at?: string | null
          sent_by?: string | null
          sent_to?: string[]
          status?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_email_history_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "invoice_email_history_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_email_history_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "invoice_email_history_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          discount_amount: number | null
          id: string
          invoice_id: string
          item_type: string
          metadata: Json | null
          quantity: number
          service_reference: string | null
          sort_order: number | null
          tax_rate: number | null
          total_amount: number
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number | null
          id?: string
          invoice_id: string
          item_type: string
          metadata?: Json | null
          quantity?: number
          service_reference?: string | null
          sort_order?: number | null
          tax_rate?: number | null
          total_amount: number
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number | null
          id?: string
          invoice_id?: string
          item_type?: string
          metadata?: Json | null
          quantity?: number
          service_reference?: string | null
          sort_order?: number | null
          tax_rate?: number | null
          total_amount?: number
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          amount_paid: number | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          dealer_id: number
          discount_amount: number | null
          due_date: string
          email_sent: boolean | null
          email_sent_at: string | null
          email_sent_count: number | null
          id: string
          invoice_notes: string | null
          invoice_number: string
          issue_date: string
          last_email_recipient: string | null
          metadata: Json | null
          order_id: string
          paid_at: string | null
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          terms_and_conditions: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          dealer_id: number
          discount_amount?: number | null
          due_date: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          email_sent_count?: number | null
          id?: string
          invoice_notes?: string | null
          invoice_number: string
          issue_date?: string
          last_email_recipient?: string | null
          metadata?: Json | null
          order_id: string
          paid_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms_and_conditions?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          dealer_id?: number
          discount_amount?: number | null
          due_date?: string
          email_sent?: boolean | null
          email_sent_at?: string | null
          email_sent_count?: number | null
          id?: string
          invoice_notes?: string | null
          invoice_number?: string
          issue_date?: string
          last_email_recipient?: string | null
          metadata?: Json | null
          order_id?: string
          paid_at?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tax_rate?: number
          terms_and_conditions?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "invoices_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      module_permissions: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          module: string
          permission_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          module: string
          permission_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          module?: string
          permission_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      module_permissions_v3: {
        Row: {
          created_at: string
          id: string
          module: Database["public"]["Enums"]["app_module_v3"]
          permission_level: Database["public"]["Enums"]["permission_level_v3"]
          role: Database["public"]["Enums"]["base_role_v3"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: Database["public"]["Enums"]["app_module_v3"]
          permission_level?: Database["public"]["Enums"]["permission_level_v3"]
          role: Database["public"]["Enums"]["base_role_v3"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: Database["public"]["Enums"]["app_module_v3"]
          permission_level?: Database["public"]["Enums"]["permission_level_v3"]
          role?: Database["public"]["Enums"]["base_role_v3"]
          updated_at?: string
        }
        Relationships: []
      }
      nfc_scans: {
        Row: {
          action_data: Json
          action_type: string
          context_data: Json
          device_info: Json
          id: string
          is_unique_scan: boolean
          order_id: string | null
          scan_address: string | null
          scan_location: unknown
          scanned_at: string
          scanned_by: string
          session_id: string | null
          tag_id: string
          user_agent: string | null
        }
        Insert: {
          action_data?: Json
          action_type?: string
          context_data?: Json
          device_info?: Json
          id?: string
          is_unique_scan?: boolean
          order_id?: string | null
          scan_address?: string | null
          scan_location?: unknown
          scanned_at?: string
          scanned_by: string
          session_id?: string | null
          tag_id: string
          user_agent?: string | null
        }
        Update: {
          action_data?: Json
          action_type?: string
          context_data?: Json
          device_info?: Json
          id?: string
          is_unique_scan?: boolean
          order_id?: string | null
          scan_address?: string | null
          scan_location?: unknown
          scanned_at?: string
          scanned_by?: string
          session_id?: string | null
          tag_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfc_scans_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "nfc_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_tags: {
        Row: {
          created_at: string
          created_by: string
          dealer_id: number
          description: string | null
          id: string
          is_active: boolean
          is_permanent: boolean
          last_scanned_at: string | null
          location_coordinates: unknown
          location_name: string | null
          name: string
          order_id: string | null
          scan_count: number
          tag_data: Json
          tag_type: string
          tag_uid: string
          updated_at: string
          vehicle_vin: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          dealer_id: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_permanent?: boolean
          last_scanned_at?: string | null
          location_coordinates?: unknown
          location_name?: string | null
          name: string
          order_id?: string | null
          scan_count?: number
          tag_data?: Json
          tag_type?: string
          tag_uid: string
          updated_at?: string
          vehicle_vin?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          dealer_id?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_permanent?: boolean
          last_scanned_at?: string | null
          location_coordinates?: unknown
          location_name?: string | null
          name?: string
          order_id?: string | null
          scan_count?: number
          tag_data?: Json
          tag_type?: string
          tag_uid?: string
          updated_at?: string
          vehicle_vin?: string | null
        }
        Relationships: []
      }
      nfc_workflows: {
        Row: {
          actions: Json
          created_at: string
          created_by: string
          dealer_id: number
          description: string | null
          execution_count: number
          id: string
          is_active: boolean
          last_executed_at: string | null
          name: string
          priority: number
          trigger_conditions: Json
          trigger_tag_type: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          created_at?: string
          created_by: string
          dealer_id: number
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name: string
          priority?: number
          trigger_conditions?: Json
          trigger_tag_type: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          created_at?: string
          created_by?: string
          dealer_id?: number
          description?: string | null
          execution_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name?: string
          priority?: number
          trigger_conditions?: Json
          trigger_tag_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_analytics: {
        Row: {
          batch_id: string | null
          channel: string
          created_at: string | null
          dealer_id: number
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          notification_id: string | null
          notification_type: string
          response_time_ms: number | null
          template_id: string | null
          user_id: string | null
        }
        Insert: {
          batch_id?: string | null
          channel: string
          created_at?: string | null
          dealer_id: number
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          notification_id?: string | null
          notification_type: string
          response_time_ms?: number | null
          template_id?: string | null
          user_id?: string | null
        }
        Update: {
          batch_id?: string | null
          channel?: string
          created_at?: string | null
          dealer_id?: number
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          notification_id?: string | null
          notification_type?: string
          response_time_ms?: number | null
          template_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_analytics_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "notification_analytics_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_analytics_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      notification_log: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          created_by: string | null
          dealer_id: number
          delivery_status: Json | null
          dismissed_at: string | null
          entity_id: string | null
          entity_type: string | null
          event: string
          id: string
          is_dismissed: boolean
          is_read: boolean
          message: string
          metadata: Json | null
          module: string
          parent_notification_id: string | null
          priority: string
          read_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          target_channels: Json
          thread_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          created_by?: string | null
          dealer_id: number
          delivery_status?: Json | null
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message: string
          metadata?: Json | null
          module: string
          parent_notification_id?: string | null
          priority?: string
          read_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          target_channels?: Json
          thread_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          created_by?: string | null
          dealer_id?: number
          delivery_status?: Json | null
          dismissed_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          event?: string
          id?: string
          is_dismissed?: boolean
          is_read?: boolean
          message?: string
          metadata?: Json | null
          module?: string
          parent_notification_id?: string | null
          priority?: string
          read_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          target_channels?: Json
          thread_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "notification_log_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "notification_log_parent_notification_id_fkey"
            columns: ["parent_notification_id"]
            isOneToOne: false
            referencedRelation: "notification_log"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempts: number | null
          batch_id: string | null
          channels: string[]
          created_at: string | null
          dealer_id: number
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          last_attempt_at: string | null
          max_attempts: number | null
          metadata: Json | null
          notification_data: Json
          notification_type: string
          priority: string | null
          processed_at: string | null
          scheduled_for: string | null
          status: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          batch_id?: string | null
          channels?: string[]
          created_at?: string | null
          dealer_id: number
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number | null
          metadata?: Json | null
          notification_data: Json
          notification_type: string
          priority?: string | null
          processed_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          batch_id?: string | null
          channels?: string[]
          created_at?: string | null
          dealer_id?: number
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number | null
          metadata?: Json | null
          notification_data?: Json
          notification_type?: string
          priority?: string | null
          processed_at?: string | null
          scheduled_for?: string | null
          status?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "notification_queue_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      notification_rate_limits: {
        Row: {
          channel: string
          count: number | null
          created_at: string | null
          dealer_id: number
          id: string
          limit_exceeded: boolean | null
          time_window: string
          updated_at: string | null
          user_id: string | null
          window_start: string
        }
        Insert: {
          channel: string
          count?: number | null
          created_at?: string | null
          dealer_id: number
          id?: string
          limit_exceeded?: boolean | null
          time_window: string
          updated_at?: string | null
          user_id?: string | null
          window_start: string
        }
        Update: {
          channel?: string
          count?: number | null
          created_at?: string | null
          dealer_id?: number
          id?: string
          limit_exceeded?: boolean | null
          time_window?: string
          updated_at?: string | null
          user_id?: string | null
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_rate_limits_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "notification_rate_limits_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_rate_limits_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          category: string | null
          channels: Json
          conditions: Json | null
          created_at: string | null
          created_by: string | null
          dealer_id: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system_template: boolean | null
          name: string
          template_type: string
          updated_at: string | null
          variables: Json | null
          version: number | null
        }
        Insert: {
          category?: string | null
          channels?: Json
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name: string
          template_type: string
          updated_at?: string | null
          variables?: Json | null
          version?: number | null
        }
        Update: {
          category?: string | null
          channels?: Json
          conditions?: Json | null
          created_at?: string | null
          created_by?: string | null
          dealer_id?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name?: string
          template_type?: string
          updated_at?: string | null
          variables?: Json | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "notification_templates_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_templates_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      notification_workflows: {
        Row: {
          actions: Json
          conditions: Json
          created_at: string | null
          created_by: string
          dealer_id: number
          description: string | null
          entity_type: string
          execution_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          priority: number | null
          trigger_event: string
          updated_at: string | null
        }
        Insert: {
          actions?: Json
          conditions?: Json
          created_at?: string | null
          created_by: string
          dealer_id: number
          description?: string | null
          entity_type: string
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          priority?: number | null
          trigger_event: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          conditions?: Json
          created_at?: string | null
          created_by?: string
          dealer_id?: number
          description?: string | null
          entity_type?: string
          execution_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          priority?: number | null
          trigger_event?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_workflows_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "notification_workflows_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_workflows_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
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
        Relationships: [
          {
            foreignKeyName: "order_activity_log_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_attachments: {
        Row: {
          comment_id: string | null
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
          comment_id?: string | null
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
          comment_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "order_attachments_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "order_comments"
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
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          comment_type?: string
          created_at?: string
          id?: string
          order_id: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          comment_type?: string
          created_at?: string
          id?: string
          order_id?: string
          parent_comment_id?: string | null
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
          {
            foreignKeyName: "order_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "order_comments"
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
          created_by: string | null
          created_by_group_id: string | null
          custom_order_number: string | null
          customer_email: string | null
          customer_name: string | null
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
          qr_generation_attempts: number | null
          qr_generation_status: string | null
          qr_last_attempt_at: string | null
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
          created_by?: string | null
          created_by_group_id?: string | null
          custom_order_number?: string | null
          customer_email?: string | null
          customer_name?: string | null
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
          qr_generation_attempts?: number | null
          qr_generation_status?: string | null
          qr_last_attempt_at?: string | null
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
          created_by?: string | null
          created_by_group_id?: string | null
          custom_order_number?: string | null
          customer_email?: string | null
          customer_name?: string | null
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
          qr_generation_attempts?: number | null
          qr_generation_status?: string | null
          qr_last_attempt_at?: string | null
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
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "orders_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      password_history: {
        Row: {
          change_reason: string | null
          created_at: string
          created_by: string | null
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          change_reason?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          change_reason?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          admin_id: string
          completed_at: string | null
          created_at: string
          expires_at: string
          force_change_on_login: boolean
          id: string
          metadata: Json | null
          request_type: string
          status: string
          temp_password: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          force_change_on_login?: boolean
          id?: string
          metadata?: Json | null
          request_type?: string
          status?: string
          temp_password?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          force_change_on_login?: boolean
          id?: string
          metadata?: Json | null
          request_type?: string
          status?: string
          temp_password?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          dealer_id: number | null
          id: string
          invoice_id: string
          metadata: Json | null
          notes: string | null
          payment_date: string
          payment_method: string
          payment_number: string
          recorded_by: string | null
          reference_number: string | null
          refunded_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          dealer_id?: number | null
          id?: string
          invoice_id: string
          metadata?: Json | null
          notes?: string | null
          payment_date?: string
          payment_method: string
          payment_number: string
          recorded_by?: string | null
          reference_number?: string | null
          refunded_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          dealer_id?: number | null
          id?: string
          invoice_id?: string
          metadata?: Json | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          payment_number?: string
          recorded_by?: string | null
          reference_number?: string | null
          refunded_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "payments_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_audit_log: {
        Row: {
          action: string
          changed_at: string | null
          changed_by: string | null
          id: string
          metadata: Json | null
          permission_key: string
          permission_type: string
          role_id: string
        }
        Insert: {
          action: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          metadata?: Json | null
          permission_key: string
          permission_type: string
          role_id: string
        }
        Update: {
          action?: string
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          metadata?: Json | null
          permission_key?: string
          permission_type?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_audit_log_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_audit_log_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "dealer_custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_audit_log_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "v_permission_migration_status"
            referencedColumns: ["role_id"]
          },
        ]
      }
      productivity_calendars: {
        Row: {
          calendar_type: string
          color: string | null
          created_at: string
          created_by: string
          dealer_id: number
          description: string | null
          external_calendar_id: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          last_sync_at: string | null
          name: string
          sync_enabled: boolean | null
          sync_settings: Json | null
          updated_at: string
        }
        Insert: {
          calendar_type?: string
          color?: string | null
          created_at?: string
          created_by: string
          dealer_id: number
          description?: string | null
          external_calendar_id?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_sync_at?: string | null
          name: string
          sync_enabled?: boolean | null
          sync_settings?: Json | null
          updated_at?: string
        }
        Update: {
          calendar_type?: string
          color?: string | null
          created_at?: string
          created_by?: string
          dealer_id?: number
          description?: string | null
          external_calendar_id?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          last_sync_at?: string | null
          name?: string
          sync_enabled?: boolean | null
          sync_settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      productivity_events: {
        Row: {
          all_day: boolean | null
          attendees: Json | null
          calendar_id: string
          created_at: string
          created_by: string
          dealer_id: number
          description: string | null
          end_time: string
          event_type: string | null
          external_event_id: string | null
          id: string
          location: string | null
          metadata: Json | null
          order_id: string | null
          recurrence_rule: string | null
          start_time: string
          title: string
          todo_id: string | null
          updated_at: string
        }
        Insert: {
          all_day?: boolean | null
          attendees?: Json | null
          calendar_id: string
          created_at?: string
          created_by: string
          dealer_id: number
          description?: string | null
          end_time: string
          event_type?: string | null
          external_event_id?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          order_id?: string | null
          recurrence_rule?: string | null
          start_time: string
          title: string
          todo_id?: string | null
          updated_at?: string
        }
        Update: {
          all_day?: boolean | null
          attendees?: Json | null
          calendar_id?: string
          created_at?: string
          created_by?: string
          dealer_id?: number
          description?: string | null
          end_time?: string
          event_type?: string | null
          external_event_id?: string | null
          id?: string
          location?: string | null
          metadata?: Json | null
          order_id?: string | null
          recurrence_rule?: string | null
          start_time?: string
          title?: string
          todo_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productivity_events_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "productivity_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productivity_events_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "productivity_todos"
            referencedColumns: ["id"]
          },
        ]
      }
      productivity_notes: {
        Row: {
          color: string | null
          content: string
          created_at: string | null
          created_by: string
          dealer_id: number
          deleted_at: string | null
          id: string
          is_pinned: boolean | null
          search_vector: unknown
          tags: string[] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          content: string
          created_at?: string | null
          created_by: string
          dealer_id: number
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean | null
          search_vector?: unknown
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string | null
          created_by?: string
          dealer_id?: number
          deleted_at?: string | null
          id?: string
          is_pinned?: boolean | null
          search_vector?: unknown
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "productivity_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productivity_notes_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "productivity_notes_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productivity_notes_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      productivity_todos: {
        Row: {
          assigned_to: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          dealer_id: number
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          priority: string
          recurring_config: Json | null
          status: string
          tags: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          dealer_id: number
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          priority?: string
          recurring_config?: Json | null
          status?: string
          tags?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          dealer_id?: number
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          priority?: string
          recurring_config?: Json | null
          status?: string
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_colors: string[] | null
          avatar_seed: string | null
          avatar_url: string | null
          avatar_variant: string | null
          created_at: string | null
          dealership_id: number | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string | null
          presence_status: string
          role: string | null
          updated_at: string | null
          use_new_role_system: boolean | null
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          avatar_colors?: string[] | null
          avatar_seed?: string | null
          avatar_url?: string | null
          avatar_variant?: string | null
          created_at?: string | null
          dealership_id?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone_number?: string | null
          presence_status?: string
          role?: string | null
          updated_at?: string | null
          use_new_role_system?: boolean | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          avatar_colors?: string[] | null
          avatar_seed?: string | null
          avatar_url?: string | null
          avatar_variant?: string | null
          created_at?: string | null
          dealership_id?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string | null
          presence_status?: string
          role?: string | null
          updated_at?: string | null
          use_new_role_system?: boolean | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "profiles_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      profiles_backup_20251023_roles: {
        Row: {
          avatar_colors: string[] | null
          avatar_seed: string | null
          avatar_url: string | null
          avatar_variant: string | null
          created_at: string | null
          dealership_id: number | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          role: string | null
          updated_at: string | null
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          avatar_colors?: string[] | null
          avatar_seed?: string | null
          avatar_url?: string | null
          avatar_variant?: string | null
          created_at?: string | null
          dealership_id?: number | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          avatar_colors?: string[] | null
          avatar_seed?: string | null
          avatar_url?: string | null
          avatar_variant?: string | null
          created_at?: string | null
          dealership_id?: number | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          role?: string | null
          updated_at?: string | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: []
      }
      profiles_backup_role_migration_20251103: {
        Row: {
          avatar_colors: string[] | null
          avatar_seed: string | null
          avatar_url: string | null
          avatar_variant: string | null
          backup_created_at: string | null
          created_at: string | null
          dealership_id: number | null
          email: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          phone_number: string | null
          presence_status: string | null
          role: string | null
          updated_at: string | null
          use_new_role_system: boolean | null
          user_type: Database["public"]["Enums"]["user_type"] | null
        }
        Insert: {
          avatar_colors?: string[] | null
          avatar_seed?: string | null
          avatar_url?: string | null
          avatar_variant?: string | null
          backup_created_at?: string | null
          created_at?: string | null
          dealership_id?: number | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          phone_number?: string | null
          presence_status?: string | null
          role?: string | null
          updated_at?: string | null
          use_new_role_system?: boolean | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Update: {
          avatar_colors?: string[] | null
          avatar_seed?: string | null
          avatar_url?: string | null
          avatar_variant?: string | null
          backup_created_at?: string | null
          created_at?: string | null
          dealership_id?: number | null
          email?: string | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          phone_number?: string | null
          presence_status?: string | null
          role?: string | null
          updated_at?: string | null
          use_new_role_system?: boolean | null
          user_type?: Database["public"]["Enums"]["user_type"] | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          dealer_id: number
          endpoint: string
          id: string
          is_active: boolean | null
          p256dh_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          dealer_id: number
          endpoint: string
          id?: string
          is_active?: boolean | null
          p256dh_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          dealer_id?: number
          endpoint?: string
          id?: string
          is_active?: boolean | null
          p256dh_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "push_subscriptions_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      rate_limit_tracking: {
        Row: {
          created_at: string
          id: string
          identifier: string
          request_count: number
          resource_type: string
          updated_at: string
          window_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          identifier: string
          request_count?: number
          resource_type: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          id?: string
          identifier?: string
          request_count?: number
          resource_type?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      recon_media: {
        Row: {
          category: string | null
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          is_primary: boolean | null
          metadata: Json | null
          mime_type: string | null
          sort_order: number | null
          upload_context: string | null
          uploaded_by: string
          vehicle_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type: string
          file_url: string
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          sort_order?: number | null
          upload_context?: string | null
          uploaded_by: string
          vehicle_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          is_primary?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          sort_order?: number | null
          upload_context?: string | null
          uploaded_by?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      recon_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          is_internal: boolean | null
          mentions: Json | null
          note_type: string | null
          tags: Json | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          is_internal?: boolean | null
          mentions?: Json | null
          note_type?: string | null
          tags?: Json | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          is_internal?: boolean | null
          mentions?: Json | null
          note_type?: string | null
          tags?: Json | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      recon_step_instances: {
        Row: {
          assigned_group_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          notes: string | null
          order_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["recon_step_status"] | null
          step_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_group_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["recon_step_status"] | null
          step_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_group_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["recon_step_status"] | null
          step_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recon_step_instances_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "dealer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recon_step_instances_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recon_step_instances_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "recon_workflow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      recon_steps: {
        Row: {
          color: string | null
          created_at: string
          dealer_id: number | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          order_index: number
          requires_approval: boolean | null
          sla_hours: number | null
          step_type: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          dealer_id?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          order_index?: number
          requires_approval?: boolean | null
          sla_hours?: number | null
          step_type?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          dealer_id?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          order_index?: number
          requires_approval?: boolean | null
          sla_hours?: number | null
          step_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      recon_t2l_metrics: {
        Row: {
          acquisition_date: string
          created_at: string | null
          frontline_ready_date: string | null
          holding_cost_daily: number | null
          id: string
          order_id: string
          updated_at: string | null
        }
        Insert: {
          acquisition_date: string
          created_at?: string | null
          frontline_ready_date?: string | null
          holding_cost_daily?: number | null
          id?: string
          order_id: string
          updated_at?: string | null
        }
        Update: {
          acquisition_date?: string
          created_at?: string | null
          frontline_ready_date?: string | null
          holding_cost_daily?: number | null
          id?: string
          order_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recon_t2l_metrics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      recon_vehicle_locations: {
        Row: {
          coordinates: unknown
          created_at: string | null
          id: string
          location_name: string
          metadata: Json | null
          order_id: string
          qr_code: string | null
          scanned_at: string | null
          scanned_by: string | null
        }
        Insert: {
          coordinates?: unknown
          created_at?: string | null
          id?: string
          location_name: string
          metadata?: Json | null
          order_id: string
          qr_code?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
        }
        Update: {
          coordinates?: unknown
          created_at?: string | null
          id?: string
          location_name?: string
          metadata?: Json | null
          order_id?: string
          qr_code?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recon_vehicle_locations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      recon_vehicle_step_history: {
        Row: {
          changed_by: string | null
          days_in_step: number | null
          entered_at: string
          exited_at: string | null
          hours_in_step: number | null
          id: string
          notes: string | null
          step_id: string
          vehicle_id: string
        }
        Insert: {
          changed_by?: string | null
          days_in_step?: number | null
          entered_at?: string
          exited_at?: string | null
          hours_in_step?: number | null
          id?: string
          notes?: string | null
          step_id: string
          vehicle_id: string
        }
        Update: {
          changed_by?: string | null
          days_in_step?: number | null
          entered_at?: string
          exited_at?: string | null
          hours_in_step?: number | null
          id?: string
          notes?: string | null
          step_id?: string
          vehicle_id?: string
        }
        Relationships: []
      }
      recon_vehicles: {
        Row: {
          acquisition_date: string | null
          created_at: string
          created_by: string | null
          current_step_id: string | null
          dealer_id: number
          id: string
          notes: string | null
          priority: string | null
          retail_value: number | null
          status: string
          stock_number: string
          target_completion_date: string | null
          updated_at: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_trim: string | null
          vehicle_year: number | null
          vin: string
        }
        Insert: {
          acquisition_date?: string | null
          created_at?: string
          created_by?: string | null
          current_step_id?: string | null
          dealer_id: number
          id?: string
          notes?: string | null
          priority?: string | null
          retail_value?: number | null
          status?: string
          stock_number: string
          target_completion_date?: string | null
          updated_at?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_trim?: string | null
          vehicle_year?: number | null
          vin: string
        }
        Update: {
          acquisition_date?: string | null
          created_at?: string
          created_by?: string | null
          current_step_id?: string | null
          dealer_id?: number
          id?: string
          notes?: string | null
          priority?: string | null
          retail_value?: number | null
          status?: string
          stock_number?: string
          target_completion_date?: string | null
          updated_at?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_trim?: string | null
          vehicle_year?: number | null
          vin?: string
        }
        Relationships: []
      }
      recon_vendors: {
        Row: {
          contact_info: Json | null
          created_at: string | null
          dealer_id: number
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          performance_rating: number | null
          specialties: string[] | null
          updated_at: string | null
        }
        Insert: {
          contact_info?: Json | null
          created_at?: string | null
          dealer_id: number
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          performance_rating?: number | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Update: {
          contact_info?: Json | null
          created_at?: string | null
          dealer_id?: number
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          performance_rating?: number | null
          specialties?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recon_vendors_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "recon_vendors_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recon_vendors_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      recon_work_items: {
        Row: {
          actual_cost: number | null
          actual_hours: number | null
          approval_required: boolean | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          assigned_to: string | null
          assigned_vendor_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          estimated_cost: number | null
          estimated_hours: number | null
          id: string
          notes: string | null
          priority: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
          vehicle_id: string
          work_type: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_hours?: number | null
          approval_required?: boolean | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          assigned_vendor_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          started_at?: string | null
          status?: string
          title: string
          updated_at?: string
          vehicle_id: string
          work_type?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_hours?: number | null
          approval_required?: boolean | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          assigned_vendor_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          vehicle_id?: string
          work_type?: string | null
        }
        Relationships: []
      }
      recon_workflow_steps: {
        Row: {
          can_be_parallel: boolean | null
          created_at: string | null
          id: string
          order_index: number
          requires_approval: boolean | null
          sla_hours: number | null
          step_name: string
          step_type: Database["public"]["Enums"]["workflow_step_type"]
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          can_be_parallel?: boolean | null
          created_at?: string | null
          id?: string
          order_index: number
          requires_approval?: boolean | null
          sla_hours?: number | null
          step_name: string
          step_type: Database["public"]["Enums"]["workflow_step_type"]
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          can_be_parallel?: boolean | null
          created_at?: string | null
          id?: string
          order_index?: number
          requires_approval?: boolean | null
          sla_hours?: number | null
          step_name?: string
          step_type?: Database["public"]["Enums"]["workflow_step_type"]
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recon_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "recon_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      recon_workflows: {
        Row: {
          created_at: string | null
          dealer_id: number
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          steps_config: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dealer_id: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          steps_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dealer_id?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          steps_config?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recon_workflows_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "recon_workflows_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recon_workflows_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      report_send_history: {
        Row: {
          created_at: string
          dealer_id: number | null
          error_message: string | null
          export_format: string
          file_size: number | null
          file_url: string | null
          id: string
          metadata: Json | null
          recipients: string[]
          report_type: string
          scheduled_report_id: string | null
          sent_at: string
          status: string
        }
        Insert: {
          created_at?: string
          dealer_id?: number | null
          error_message?: string | null
          export_format: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          recipients: string[]
          report_type: string
          scheduled_report_id?: string | null
          sent_at?: string
          status: string
        }
        Update: {
          created_at?: string
          dealer_id?: number | null
          error_message?: string | null
          export_format?: string
          file_size?: number | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          recipients?: string[]
          report_type?: string
          scheduled_report_id?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_send_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "report_send_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_send_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "report_send_history_scheduled_report_id_fkey"
            columns: ["scheduled_report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      role_module_access: {
        Row: {
          created_at: string
          id: string
          is_enabled: boolean
          module: Database["public"]["Enums"]["app_module"]
          role_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module: Database["public"]["Enums"]["app_module"]
          role_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_enabled?: boolean
          module?: Database["public"]["Enums"]["app_module"]
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_module_access_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "dealer_custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_module_access_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "v_permission_migration_status"
            referencedColumns: ["role_id"]
          },
        ]
      }
      role_module_permissions_new: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_module_permissions_new_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_module_permissions_new_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "module_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_module_permissions_new_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "dealer_custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_module_permissions_new_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "v_permission_migration_status"
            referencedColumns: ["role_id"]
          },
        ]
      }
      role_module_permissions_new_backup_20251023_roles: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string | null
          permission_id: string | null
          role_id: string | null
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string | null
          permission_id?: string | null
          role_id?: string | null
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string | null
          permission_id?: string | null
          role_id?: string | null
        }
        Relationships: []
      }
      role_notification_events: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          event_config: Json | null
          event_type: string
          id: string
          module: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          event_config?: Json | null
          event_type: string
          id?: string
          module: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          event_config?: Json | null
          event_type?: string
          id?: string
          module?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_notification_events_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "dealer_custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_notification_events_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "v_permission_migration_status"
            referencedColumns: ["role_id"]
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
      role_permissions_v2: {
        Row: {
          conditions: Json | null
          created_at: string | null
          id: string
          module: Database["public"]["Enums"]["system_module_v2"]
          permission_level: Database["public"]["Enums"]["permission_level"]
          role_id: string
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          id?: string
          module: Database["public"]["Enums"]["system_module_v2"]
          permission_level: Database["public"]["Enums"]["permission_level"]
          role_id: string
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          id?: string
          module?: Database["public"]["Enums"]["system_module_v2"]
          permission_level?: Database["public"]["Enums"]["permission_level"]
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_v2_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "simplified_roles_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      role_system_permissions: {
        Row: {
          created_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_system_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_system_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "system_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_system_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "dealer_custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_system_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "v_permission_migration_status"
            referencedColumns: ["role_id"]
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
      roles_v2: {
        Row: {
          created_at: string | null
          department: Database["public"]["Enums"]["department_type_v2"] | null
          description: string | null
          display_name: string
          id: string
          is_management: boolean | null
          is_system_role: boolean | null
          name: Database["public"]["Enums"]["system_role_v2"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: Database["public"]["Enums"]["department_type_v2"] | null
          description?: string | null
          display_name: string
          id?: string
          is_management?: boolean | null
          is_system_role?: boolean | null
          name: Database["public"]["Enums"]["system_role_v2"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: Database["public"]["Enums"]["department_type_v2"] | null
          description?: string | null
          display_name?: string
          id?: string
          is_management?: boolean | null
          is_system_role?: boolean | null
          name?: Database["public"]["Enums"]["system_role_v2"]
          updated_at?: string | null
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      scheduled_reports: {
        Row: {
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          dealer_id: number | null
          export_format: string
          filters: Json | null
          frequency: string
          id: string
          include_sections: Json | null
          is_active: boolean | null
          last_sent_at: string | null
          metadata: Json | null
          next_send_at: string | null
          recipients: string[]
          report_name: string
          report_type: string
          schedule_day: number | null
          schedule_time: string
          send_count: number | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          dealer_id?: number | null
          export_format?: string
          filters?: Json | null
          frequency: string
          id?: string
          include_sections?: Json | null
          is_active?: boolean | null
          last_sent_at?: string | null
          metadata?: Json | null
          next_send_at?: string | null
          recipients: string[]
          report_name: string
          report_type: string
          schedule_day?: number | null
          schedule_time?: string
          send_count?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          dealer_id?: number | null
          export_format?: string
          filters?: Json | null
          frequency?: string
          id?: string
          include_sections?: Json | null
          is_active?: boolean | null
          last_sent_at?: string | null
          metadata?: Json | null
          next_send_at?: string | null
          recipients?: string[]
          report_name?: string
          report_type?: string
          schedule_day?: number | null
          schedule_time?: string
          send_count?: number | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "scheduled_reports_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_reports_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          success: boolean | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          success?: boolean | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      security_policies: {
        Row: {
          created_at: string
          created_by: string
          dealer_id: number
          id: string
          is_active: boolean
          policy_name: string
          policy_value: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dealer_id: number
          id?: string
          is_active?: boolean
          policy_name: string
          policy_value?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dealer_id?: number
          id?: string
          is_active?: boolean
          policy_name?: string
          policy_value?: Json
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
      simplified_roles_v2: {
        Row: {
          created_at: string | null
          department: Database["public"]["Enums"]["department_type_v2"] | null
          description: string | null
          display_name: string
          id: string
          is_management: boolean | null
          is_system_role: boolean | null
          name: Database["public"]["Enums"]["system_role_simplified_v2"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department?: Database["public"]["Enums"]["department_type_v2"] | null
          description?: string | null
          display_name: string
          id?: string
          is_management?: boolean | null
          is_system_role?: boolean | null
          name: Database["public"]["Enums"]["system_role_simplified_v2"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department?: Database["public"]["Enums"]["department_type_v2"] | null
          description?: string | null
          display_name?: string
          id?: string
          is_management?: boolean | null
          is_system_role?: boolean | null
          name?: Database["public"]["Enums"]["system_role_simplified_v2"]
          updated_at?: string | null
        }
        Relationships: []
      }
      sms_conversations: {
        Row: {
          created_at: string | null
          customer_name: string | null
          dealer_id: number
          entity_id: string | null
          entity_type: string | null
          id: string
          is_automated: boolean | null
          last_message_at: string | null
          message_count: number | null
          phone_number: string
          status: Database["public"]["Enums"]["conversation_status"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_name?: string | null
          dealer_id: number
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_automated?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          phone_number: string
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_name?: string | null
          dealer_id?: number
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_automated?: boolean | null
          last_message_at?: string | null
          message_count?: number | null
          phone_number?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_conversations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "sms_conversations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_conversations_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          conversation_id: string
          created_at: string | null
          delivered_at: string | null
          direction: Database["public"]["Enums"]["sms_direction"]
          from_number: string
          id: string
          media_urls: Json | null
          message_body: string
          metadata: Json | null
          read_at: string | null
          sent_by: string | null
          status: string
          to_number: string
          twilio_sid: string | null
          updated_at: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          delivered_at?: string | null
          direction: Database["public"]["Enums"]["sms_direction"]
          from_number: string
          id?: string
          media_urls?: Json | null
          message_body: string
          metadata?: Json | null
          read_at?: string | null
          sent_by?: string | null
          status?: string
          to_number: string
          twilio_sid?: string | null
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          delivered_at?: string | null
          direction?: Database["public"]["Enums"]["sms_direction"]
          from_number?: string
          id?: string
          media_urls?: Json | null
          message_body?: string
          metadata?: Json | null
          read_at?: string | null
          sent_by?: string | null
          status?: string
          to_number?: string
          twilio_sid?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_send_history: {
        Row: {
          cost_cents: number | null
          dealer_id: number
          entity_id: string | null
          error_message: string | null
          event_type: string
          id: string
          message_content: string
          module: string
          phone_number: string
          sent_at: string | null
          sent_day: string
          status: string | null
          twilio_sid: string | null
          user_id: string
        }
        Insert: {
          cost_cents?: number | null
          dealer_id: number
          entity_id?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          message_content: string
          module: string
          phone_number: string
          sent_at?: string | null
          sent_day?: string
          status?: string | null
          twilio_sid?: string | null
          user_id: string
        }
        Update: {
          cost_cents?: number | null
          dealer_id?: number
          entity_id?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          message_content?: string
          module?: string
          phone_number?: string
          sent_at?: string | null
          sent_day?: string
          status?: string | null
          twilio_sid?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_send_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "sms_send_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_send_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "sms_send_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          permission_key: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          permission_key: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          permission_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_encrypted: boolean | null
          is_public: boolean | null
          setting_key: string
          setting_type: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          is_public?: boolean | null
          setting_key: string
          setting_type?: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_encrypted?: boolean | null
          is_public?: boolean | null
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      trigger_debug_log: {
        Row: {
          created_at: string | null
          id: number
          message: string | null
          order_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          message?: string | null
          order_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          message?: string | null
          order_id?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action_description: string | null
          action_type: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_description?: string | null
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_description?: string | null
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_allowed_modules: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          module: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          module: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          module?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_allowed_modules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_allowed_modules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_audit_log: {
        Row: {
          created_at: string
          dealer_id: number | null
          entity_id: string
          entity_type: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          dealer_id?: number | null
          entity_id: string
          entity_type: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          dealer_id?: number | null
          entity_id?: string
          entity_type?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_audit_log_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_audit_log_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_audit_log_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
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
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_contact_permissions_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_contact_permissions_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      user_custom_role_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          custom_role_id: string
          dealer_id: number
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          custom_role_id: string
          dealer_id: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          custom_role_id?: string
          dealer_id?: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_role_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_custom_role_assignments_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "dealer_custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_custom_role_assignments_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "v_permission_migration_status"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "user_custom_role_assignments_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_custom_role_assignments_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_custom_role_assignments_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_custom_role_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_custom_role_assignments_backup_role_migration_20251103: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          backup_created_at: string | null
          created_at: string | null
          custom_role_id: string | null
          dealer_id: number | null
          id: string | null
          is_active: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          backup_created_at?: string | null
          created_at?: string | null
          custom_role_id?: string | null
          dealer_id?: number | null
          id?: string | null
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          backup_created_at?: string | null
          created_at?: string | null
          custom_role_id?: string | null
          dealer_id?: number | null
          id?: string | null
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_dealership_memberships_v2: {
        Row: {
          created_at: string | null
          dealership_id: string
          id: string
          joined_at: string | null
          primary_dealership: boolean | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dealership_id: string
          id?: string
          joined_at?: string | null
          primary_dealership?: boolean | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dealership_id?: string
          id?: string
          joined_at?: string | null
          primary_dealership?: boolean | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dealership_memberships_v2_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_dealership_memberships_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_memberships: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          group_id: string
          id: string
          is_active: boolean | null
          notes: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          group_id: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          group_id?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "dealer_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_memberships_backup_20250920: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          group_id: string | null
          id: string | null
          is_active: boolean | null
          notes: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          group_id?: string | null
          id?: string | null
          is_active?: boolean | null
          notes?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          group_id?: string | null
          id?: string | null
          is_active?: boolean | null
          notes?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_invitations_v2: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          dealership_id: string
          department_id: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          metadata: Json | null
          role: Database["public"]["Enums"]["system_role_v2"]
          status: Database["public"]["Enums"]["invitation_status_v2"] | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          dealership_id: string
          department_id?: string | null
          email: string
          expires_at: string
          id?: string
          invitation_token: string
          invited_by: string
          metadata?: Json | null
          role: Database["public"]["Enums"]["system_role_v2"]
          status?: Database["public"]["Enums"]["invitation_status_v2"] | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          dealership_id?: string
          department_id?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string
          metadata?: Json | null
          role?: Database["public"]["Enums"]["system_role_v2"]
          status?: Database["public"]["Enums"]["invitation_status_v2"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_v2_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_v2_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_v2_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations_v3: {
        Row: {
          accepted_at: string | null
          created_at: string
          dealer_id: number
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string
          role: Database["public"]["Enums"]["base_role_v3"]
          status: string
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
          invited_by: string
          role: Database["public"]["Enums"]["base_role_v3"]
          status?: string
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
          invited_by?: string
          role?: Database["public"]["Enums"]["base_role_v3"]
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notification_preferences: {
        Row: {
          approval_notifications_enabled: boolean
          auto_dismiss_read_after_days: number | null
          auto_dismiss_unread_after_days: number | null
          bottleneck_alerts_enabled: boolean
          created_at: string
          dealer_id: number
          deprecated_at: string | null
          desktop_enabled: boolean
          email_enabled: boolean
          in_app_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sla_critical_enabled: boolean
          sla_warnings_enabled: boolean
          sound_enabled: boolean
          step_completion_enabled: boolean
          system_alerts_enabled: boolean
          updated_at: string
          user_id: string
          vehicle_status_enabled: boolean
          work_item_notifications_enabled: boolean
        }
        Insert: {
          approval_notifications_enabled?: boolean
          auto_dismiss_read_after_days?: number | null
          auto_dismiss_unread_after_days?: number | null
          bottleneck_alerts_enabled?: boolean
          created_at?: string
          dealer_id: number
          deprecated_at?: string | null
          desktop_enabled?: boolean
          email_enabled?: boolean
          in_app_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sla_critical_enabled?: boolean
          sla_warnings_enabled?: boolean
          sound_enabled?: boolean
          step_completion_enabled?: boolean
          system_alerts_enabled?: boolean
          updated_at?: string
          user_id: string
          vehicle_status_enabled?: boolean
          work_item_notifications_enabled?: boolean
        }
        Update: {
          approval_notifications_enabled?: boolean
          auto_dismiss_read_after_days?: number | null
          auto_dismiss_unread_after_days?: number | null
          bottleneck_alerts_enabled?: boolean
          created_at?: string
          dealer_id?: number
          deprecated_at?: string | null
          desktop_enabled?: boolean
          email_enabled?: boolean
          in_app_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sla_critical_enabled?: boolean
          sla_warnings_enabled?: boolean
          sound_enabled?: boolean
          step_completion_enabled?: boolean
          system_alerts_enabled?: boolean
          updated_at?: string
          user_id?: string
          vehicle_status_enabled?: boolean
          work_item_notifications_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_dealer"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "fk_dealer"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_dealer"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      user_notification_preferences_universal: {
        Row: {
          auto_dismiss_read_after_days: number | null
          auto_dismiss_unread_after_days: number | null
          created_at: string
          dealer_id: number
          email_enabled: boolean
          event_preferences: Json
          frequency: string
          id: string
          in_app_enabled: boolean
          metadata: Json | null
          module: string
          phone_number_override: string | null
          push_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quiet_hours_timezone: string | null
          rate_limits: Json
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_dismiss_read_after_days?: number | null
          auto_dismiss_unread_after_days?: number | null
          created_at?: string
          dealer_id: number
          email_enabled?: boolean
          event_preferences?: Json
          frequency?: string
          id?: string
          in_app_enabled?: boolean
          metadata?: Json | null
          module: string
          phone_number_override?: string | null
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          rate_limits?: Json
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_dismiss_read_after_days?: number | null
          auto_dismiss_unread_after_days?: number | null
          created_at?: string
          dealer_id?: number
          email_enabled?: boolean
          event_preferences?: Json
          frequency?: string
          id?: string
          in_app_enabled?: boolean
          metadata?: Json | null
          module?: string
          phone_number_override?: string | null
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          rate_limits?: Json
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_universal_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_notification_preferences_universal_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_universal_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          created_at: string
          dealer_id: number | null
          email_notifications: boolean
          id: string
          in_app_notifications: boolean
          notification_frequency: string
          notification_types: Json | null
          push_notifications: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dealer_id?: number | null
          email_notifications?: boolean
          id?: string
          in_app_notifications?: boolean
          notification_frequency?: string
          notification_types?: Json | null
          push_notifications?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dealer_id?: number | null
          email_notifications?: boolean
          id?: string
          in_app_notifications?: boolean
          notification_frequency?: string
          notification_types?: Json | null
          push_notifications?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_settings_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_notification_settings_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_settings_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          data: Json | null
          dealer_id: number | null
          expires_at: string | null
          id: string
          message: string
          notification_type: string
          priority: string
          read_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          data?: Json | null
          dealer_id?: number | null
          expires_at?: string | null
          id?: string
          message: string
          notification_type: string
          priority?: string
          read_at?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          data?: Json | null
          dealer_id?: number | null
          expires_at?: string | null
          id?: string
          message?: string
          notification_type?: string
          priority?: string
          read_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_notifications_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          date_format: string | null
          department: string | null
          id: string
          job_title: string | null
          language_preference: string | null
          notification_email: boolean | null
          notification_frequency: string | null
          notification_in_app: boolean | null
          notification_push: boolean | null
          notification_sms: boolean | null
          phone: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          time_format: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_format?: string | null
          department?: string | null
          id?: string
          job_title?: string | null
          language_preference?: string | null
          notification_email?: boolean | null
          notification_frequency?: string | null
          notification_in_app?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          phone?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          date_format?: string | null
          department?: string | null
          id?: string
          job_title?: string | null
          language_preference?: string | null
          notification_email?: boolean | null
          notification_frequency?: string | null
          notification_in_app?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          phone?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          time_format?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          auto_away_minutes: number | null
          created_at: string
          custom_status: string | null
          dealer_id: number
          id: string
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_presence_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_presence_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_presence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      user_role_assignments_v2: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          dealership_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          role_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          dealership_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          role_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          dealership_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          role_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_v2_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_v2_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_v2_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "simplified_roles_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_v2_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments_v2_backup: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          dealership_id: string | null
          department_id: string | null
          expires_at: string | null
          id: string | null
          is_active: boolean | null
          role: Database["public"]["Enums"]["system_role_v2"] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          dealership_id?: string | null
          department_id?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["system_role_v2"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          dealership_id?: string | null
          department_id?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["system_role_v2"] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles_v3: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          created_at: string
          dealer_id: number
          expires_at: string | null
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["base_role_v3"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          dealer_id: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["base_role_v3"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          created_at?: string
          dealer_id?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["base_role_v3"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          ip_address: unknown
          is_current: boolean | null
          last_activity: string | null
          location_info: Json | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_current?: boolean | null
          last_activity?: string | null
          location_info?: Json | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          ip_address?: unknown
          is_current?: boolean | null
          last_activity?: string | null
          location_info?: Json | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_sms_notification_preferences: {
        Row: {
          created_at: string | null
          dealer_id: number
          deprecated_at: string | null
          email_enabled: boolean | null
          event_preferences: Json | null
          id: string
          in_app_enabled: boolean | null
          max_sms_per_day: number | null
          max_sms_per_hour: number | null
          module: string
          phone_number: string | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dealer_id: number
          deprecated_at?: string | null
          email_enabled?: boolean | null
          event_preferences?: Json | null
          id?: string
          in_app_enabled?: boolean | null
          max_sms_per_day?: number | null
          max_sms_per_hour?: number | null
          module: string
          phone_number?: string | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dealer_id?: number
          deprecated_at?: string | null
          email_enabled?: boolean | null
          event_preferences?: Json | null
          id?: string
          in_app_enabled?: boolean | null
          max_sms_per_day?: number | null
          max_sms_per_hour?: number | null
          module?: string
          phone_number?: string | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sms_notification_preferences_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_sms_notification_preferences_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_sms_notification_preferences_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_sms_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_status: {
        Row: {
          auto_status_enabled: boolean | null
          created_at: string | null
          current_location: string | null
          custom_status: string | null
          dealer_id: number
          id: string
          is_available_for_chat: boolean | null
          last_seen_at: string | null
          presence_status: Database["public"]["Enums"]["presence_status"]
          status_emoji: string | null
          status_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_status_enabled?: boolean | null
          created_at?: string | null
          current_location?: string | null
          custom_status?: string | null
          dealer_id: number
          id?: string
          is_available_for_chat?: boolean | null
          last_seen_at?: string | null
          presence_status?: Database["public"]["Enums"]["presence_status"]
          status_emoji?: string | null
          status_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_status_enabled?: boolean | null
          created_at?: string | null
          current_location?: string | null
          custom_status?: string | null
          dealer_id?: number
          id?: string
          is_available_for_chat?: boolean | null
          last_seen_at?: string | null
          presence_status?: Database["public"]["Enums"]["presence_status"]
          status_emoji?: string | null
          status_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_status_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_status_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_status_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      users_v2: {
        Row: {
          auth_user_id: string | null
          avatar_settings: Json | null
          avatar_url: string | null
          created_at: string | null
          email: string
          employee_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          primary_dealership_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar_settings?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          email: string
          employee_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          primary_dealership_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar_settings?: Json | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          employee_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          primary_dealership_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vehicle_media: {
        Row: {
          annotations: Json | null
          category: string
          created_at: string | null
          dealer_id: number
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_required: boolean | null
          linked_work_item_id: string | null
          metadata: Json | null
          thumbnail_path: string | null
          uploaded_by: string | null
          vehicle_id: string
        }
        Insert: {
          annotations?: Json | null
          category: string
          created_at?: string | null
          dealer_id: number
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_required?: boolean | null
          linked_work_item_id?: string | null
          metadata?: Json | null
          thumbnail_path?: string | null
          uploaded_by?: string | null
          vehicle_id: string
        }
        Update: {
          annotations?: Json | null
          category?: string
          created_at?: string | null
          dealer_id?: number
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_required?: boolean | null
          linked_work_item_id?: string | null
          metadata?: Json | null
          thumbnail_path?: string | null
          uploaded_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_media_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "vehicle_media_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_media_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "vehicle_media_linked_work_item_id_fkey"
            columns: ["linked_work_item_id"]
            isOneToOne: false
            referencedRelation: "get_ready_work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_media_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_media_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "active_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_media_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "deleted_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_media_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_media_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_step_times_current"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      vehicle_note_replies: {
        Row: {
          author_id: string | null
          content: string
          created_at: string | null
          dealer_id: number
          id: string
          note_id: string
        }
        Insert: {
          author_id?: string | null
          content: string
          created_at?: string | null
          dealer_id: number
          id?: string
          note_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string | null
          dealer_id?: number
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_note_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_note_replies_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "vehicle_note_replies_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_note_replies_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      vehicle_notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          dealer_id: number | null
          id: string
          is_pinned: boolean
          linked_work_item_id: string | null
          note_type: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          dealer_id?: number | null
          id?: string
          is_pinned?: boolean
          linked_work_item_id?: string | null
          note_type?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          dealer_id?: number | null
          id?: string
          is_pinned?: boolean
          linked_work_item_id?: string | null
          note_type?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_notes_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "vehicle_notes_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_notes_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "vehicle_notes_linked_work_item_id_fkey"
            columns: ["linked_work_item_id"]
            isOneToOne: false
            referencedRelation: "get_ready_work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_notes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "active_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_notes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "deleted_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_notes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_notes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_step_times_current"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      vehicle_step_history: {
        Row: {
          created_at: string | null
          dealer_id: number
          entry_date: string
          exit_date: string | null
          hours_accumulated: number | null
          id: string
          is_backtrack: boolean | null
          is_current_visit: boolean | null
          metadata: Json | null
          notes: string | null
          priority_at_entry: string | null
          step_color: string | null
          step_id: string
          step_name: string
          updated_at: string | null
          vehicle_id: string
          visit_number: number
          work_items_pending_at_entry: number | null
        }
        Insert: {
          created_at?: string | null
          dealer_id: number
          entry_date: string
          exit_date?: string | null
          hours_accumulated?: number | null
          id?: string
          is_backtrack?: boolean | null
          is_current_visit?: boolean | null
          metadata?: Json | null
          notes?: string | null
          priority_at_entry?: string | null
          step_color?: string | null
          step_id: string
          step_name: string
          updated_at?: string | null
          vehicle_id: string
          visit_number?: number
          work_items_pending_at_entry?: number | null
        }
        Update: {
          created_at?: string | null
          dealer_id?: number
          entry_date?: string
          exit_date?: string | null
          hours_accumulated?: number | null
          id?: string
          is_backtrack?: boolean | null
          is_current_visit?: boolean | null
          metadata?: Json | null
          notes?: string | null
          priority_at_entry?: string | null
          step_color?: string | null
          step_id?: string
          step_name?: string
          updated_at?: string | null
          vehicle_id?: string
          visit_number?: number
          work_items_pending_at_entry?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_step_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "vehicle_step_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_step_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "vehicle_step_history_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "get_ready_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_step_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "active_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_step_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "deleted_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_step_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_step_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_step_times_current"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      vehicle_timeline_events: {
        Row: {
          cost_impact: number | null
          dealer_id: number
          delay_reason: string | null
          duration_hours: number | null
          event_color: string | null
          event_description: string | null
          event_icon: string | null
          event_title: string
          event_type: Database["public"]["Enums"]["timeline_event_type"]
          id: string
          linked_vendor_id: string | null
          linked_work_item: string | null
          metadata: Json | null
          timestamp: string | null
          user_id: string | null
          user_triggered: boolean | null
          vehicle_id: string
        }
        Insert: {
          cost_impact?: number | null
          dealer_id: number
          delay_reason?: string | null
          duration_hours?: number | null
          event_color?: string | null
          event_description?: string | null
          event_icon?: string | null
          event_title: string
          event_type: Database["public"]["Enums"]["timeline_event_type"]
          id?: string
          linked_vendor_id?: string | null
          linked_work_item?: string | null
          metadata?: Json | null
          timestamp?: string | null
          user_id?: string | null
          user_triggered?: boolean | null
          vehicle_id: string
        }
        Update: {
          cost_impact?: number | null
          dealer_id?: number
          delay_reason?: string | null
          duration_hours?: number | null
          event_color?: string | null
          event_description?: string | null
          event_icon?: string | null
          event_title?: string
          event_type?: Database["public"]["Enums"]["timeline_event_type"]
          id?: string
          linked_vendor_id?: string | null
          linked_work_item?: string | null
          metadata?: Json | null
          timestamp?: string | null
          user_id?: string | null
          user_triggered?: boolean | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_timeline_events_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "vehicle_timeline_events_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_timeline_events_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "vehicle_timeline_events_linked_work_item_fkey"
            columns: ["linked_work_item"]
            isOneToOne: false
            referencedRelation: "get_ready_work_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_timeline_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_timeline_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "active_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_timeline_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "deleted_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_timeline_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_timeline_events_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_step_times_current"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      vin_cache: {
        Row: {
          body_class: string | null
          cache_hits: number
          cached_at: string
          created_at: string
          last_hit_at: string | null
          make: string | null
          model: string | null
          raw_response: Json
          trim: string | null
          updated_at: string
          vehicle_info: string
          vehicle_type: string | null
          vin: string
          year: string | null
        }
        Insert: {
          body_class?: string | null
          cache_hits?: number
          cached_at?: string
          created_at?: string
          last_hit_at?: string | null
          make?: string | null
          model?: string | null
          raw_response: Json
          trim?: string | null
          updated_at?: string
          vehicle_info: string
          vehicle_type?: string | null
          vin: string
          year?: string | null
        }
        Update: {
          body_class?: string | null
          cache_hits?: number
          cached_at?: string
          created_at?: string
          last_hit_at?: string | null
          make?: string | null
          model?: string | null
          raw_response?: Json
          trim?: string | null
          updated_at?: string
          vehicle_info?: string
          vehicle_type?: string | null
          vin?: string
          year?: string | null
        }
        Relationships: []
      }
      work_item_templates: {
        Row: {
          approval_required: boolean | null
          auto_assign: boolean | null
          created_at: string | null
          dealer_id: number
          description: string | null
          estimated_cost: number | null
          estimated_hours: number | null
          id: string
          is_active: boolean | null
          name: string
          order_index: number | null
          priority: number | null
          step_id: string | null
          updated_at: string | null
          work_type: Database["public"]["Enums"]["work_item_type"]
        }
        Insert: {
          approval_required?: boolean | null
          auto_assign?: boolean | null
          created_at?: string | null
          dealer_id: number
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          order_index?: number | null
          priority?: number | null
          step_id?: string | null
          updated_at?: string | null
          work_type: Database["public"]["Enums"]["work_item_type"]
        }
        Update: {
          approval_required?: boolean | null
          auto_assign?: boolean | null
          created_at?: string | null
          dealer_id?: number
          description?: string | null
          estimated_cost?: number | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          order_index?: number | null
          priority?: number | null
          step_id?: string | null
          updated_at?: string | null
          work_type?: Database["public"]["Enums"]["work_item_type"]
        }
        Relationships: [
          {
            foreignKeyName: "work_item_templates_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "work_item_templates_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_item_templates_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "work_item_templates_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "get_ready_steps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_get_ready_vehicles: {
        Row: {
          actual_t2l: number | null
          approval_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_at: string | null
          approved_by: string | null
          assigned_group_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          days_in_step: number | null
          dealer_id: number | null
          deleted_at: string | null
          deleted_by: string | null
          escalation_level: number | null
          frontline_reached_at: string | null
          holding_cost_daily: number | null
          id: string | null
          intake_date: string | null
          is_bottlenecked: boolean | null
          media_count: number | null
          metadata: Json | null
          notes: string | null
          notes_count: number | null
          priority: Database["public"]["Enums"]["get_ready_priority"] | null
          priority_score: number | null
          progress: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requires_approval: boolean | null
          sla_hours_remaining: number | null
          sla_status: Database["public"]["Enums"]["get_ready_sla_status"] | null
          status: string | null
          step_id: string | null
          stock_number: string | null
          t2l_estimate: number | null
          target_frontline_date: string | null
          timer_paused: boolean | null
          total_holding_cost: number | null
          updated_at: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_trim: string | null
          vehicle_year: number | null
          vin: string | null
        }
        Insert: {
          actual_t2l?: number | null
          approval_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_group_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          days_in_step?: number | null
          dealer_id?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          escalation_level?: number | null
          frontline_reached_at?: string | null
          holding_cost_daily?: number | null
          id?: string | null
          intake_date?: string | null
          is_bottlenecked?: boolean | null
          media_count?: number | null
          metadata?: Json | null
          notes?: string | null
          notes_count?: number | null
          priority?: Database["public"]["Enums"]["get_ready_priority"] | null
          priority_score?: number | null
          progress?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
          sla_hours_remaining?: number | null
          sla_status?:
            | Database["public"]["Enums"]["get_ready_sla_status"]
            | null
          status?: string | null
          step_id?: string | null
          stock_number?: string | null
          t2l_estimate?: number | null
          target_frontline_date?: string | null
          timer_paused?: boolean | null
          total_holding_cost?: number | null
          updated_at?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_trim?: string | null
          vehicle_year?: number | null
          vin?: string | null
        }
        Update: {
          actual_t2l?: number | null
          approval_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_group_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          days_in_step?: number | null
          dealer_id?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          escalation_level?: number | null
          frontline_reached_at?: string | null
          holding_cost_daily?: number | null
          id?: string | null
          intake_date?: string | null
          is_bottlenecked?: boolean | null
          media_count?: number | null
          metadata?: Json | null
          notes?: string | null
          notes_count?: number | null
          priority?: Database["public"]["Enums"]["get_ready_priority"] | null
          priority_score?: number | null
          progress?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
          sla_hours_remaining?: number | null
          sla_status?:
            | Database["public"]["Enums"]["get_ready_sla_status"]
            | null
          status?: string | null
          step_id?: string | null
          stock_number?: string | null
          t2l_estimate?: number | null
          target_frontline_date?: string | null
          timer_paused?: boolean | null
          total_holding_cost?: number | null
          updated_at?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_trim?: string | null
          vehicle_year?: number | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_get_ready_vehicles_approved_by"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_get_ready_vehicles_rejected_by"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "dealer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "get_ready_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_slots_health: {
        Row: {
          avg_utilization_pct: number | null
          dates_with_slots: number | null
          dealer_id: number | null
          dealer_name: string | null
          earliest_slot_date: string | null
          latest_slot_date: string | null
          total_available: number | null
          total_booked: number | null
          total_capacity: number | null
          total_slot_records: number | null
        }
        Relationships: []
      }
      deleted_get_ready_vehicles: {
        Row: {
          actual_t2l: number | null
          approval_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          approved_at: string | null
          approved_by: string | null
          assigned_group_id: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string | null
          days_in_step: number | null
          dealer_id: number | null
          deleted_at: string | null
          deleted_by: string | null
          escalation_level: number | null
          frontline_reached_at: string | null
          holding_cost_daily: number | null
          id: string | null
          intake_date: string | null
          is_bottlenecked: boolean | null
          media_count: number | null
          metadata: Json | null
          notes: string | null
          notes_count: number | null
          priority: Database["public"]["Enums"]["get_ready_priority"] | null
          priority_score: number | null
          progress: number | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          requires_approval: boolean | null
          sla_hours_remaining: number | null
          sla_status: Database["public"]["Enums"]["get_ready_sla_status"] | null
          status: string | null
          step_id: string | null
          stock_number: string | null
          t2l_estimate: number | null
          target_frontline_date: string | null
          timer_paused: boolean | null
          total_holding_cost: number | null
          updated_at: string | null
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_trim: string | null
          vehicle_year: number | null
          vin: string | null
        }
        Insert: {
          actual_t2l?: number | null
          approval_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_group_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          days_in_step?: number | null
          dealer_id?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          escalation_level?: number | null
          frontline_reached_at?: string | null
          holding_cost_daily?: number | null
          id?: string | null
          intake_date?: string | null
          is_bottlenecked?: boolean | null
          media_count?: number | null
          metadata?: Json | null
          notes?: string | null
          notes_count?: number | null
          priority?: Database["public"]["Enums"]["get_ready_priority"] | null
          priority_score?: number | null
          progress?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
          sla_hours_remaining?: number | null
          sla_status?:
            | Database["public"]["Enums"]["get_ready_sla_status"]
            | null
          status?: string | null
          step_id?: string | null
          stock_number?: string | null
          t2l_estimate?: number | null
          target_frontline_date?: string | null
          timer_paused?: boolean | null
          total_holding_cost?: number | null
          updated_at?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_trim?: string | null
          vehicle_year?: number | null
          vin?: string | null
        }
        Update: {
          actual_t2l?: number | null
          approval_notes?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          approved_at?: string | null
          approved_by?: string | null
          assigned_group_id?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string | null
          days_in_step?: number | null
          dealer_id?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          escalation_level?: number | null
          frontline_reached_at?: string | null
          holding_cost_daily?: number | null
          id?: string | null
          intake_date?: string | null
          is_bottlenecked?: boolean | null
          media_count?: number | null
          metadata?: Json | null
          notes?: string | null
          notes_count?: number | null
          priority?: Database["public"]["Enums"]["get_ready_priority"] | null
          priority_score?: number | null
          progress?: number | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
          sla_hours_remaining?: number | null
          sla_status?:
            | Database["public"]["Enums"]["get_ready_sla_status"]
            | null
          status?: string | null
          step_id?: string | null
          stock_number?: string | null
          t2l_estimate?: number | null
          target_frontline_date?: string | null
          timer_paused?: boolean | null
          total_holding_cost?: number | null
          updated_at?: string | null
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_trim?: string | null
          vehicle_year?: number | null
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_get_ready_vehicles_approved_by"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_get_ready_vehicles_rejected_by"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_assigned_group_id_fkey"
            columns: ["assigned_group_id"]
            isOneToOne: false
            referencedRelation: "dealer_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "get_ready_vehicles_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "get_ready_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      detail_hub_currently_working: {
        Row: {
          break_elapsed_minutes: number | null
          break_start: string | null
          clock_in: string | null
          dealership_id: number | null
          department: string | null
          elapsed_hours: number | null
          elapsed_time_formatted: string | null
          employee_id: string | null
          employee_name: string | null
          employee_number: string | null
          first_name: string | null
          is_on_break: boolean | null
          kiosk_code: string | null
          kiosk_id: string | null
          kiosk_name: string | null
          last_name: string | null
          profile_photo_url: string | null
          role: string | null
          schedule_variance_minutes: number | null
          scheduled_end: string | null
          scheduled_start: string | null
          time_entry_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detail_hub_time_entries_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "detail_hub_time_entries_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detail_hub_time_entries_dealership_id_fkey"
            columns: ["dealership_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      mv_dealership_stats: {
        Row: {
          active_user_count: number | null
          carwash_orders_count: number | null
          completed_orders_count: number | null
          contacts_count: number | null
          dealer_id: number | null
          dealer_name: string | null
          dealer_status: string | null
          in_progress_orders_count: number | null
          last_order_date: string | null
          last_updated_at: string | null
          pending_orders_count: number | null
          recon_orders_count: number | null
          sales_orders_count: number | null
          service_orders_count: number | null
          subscription_plan: string | null
        }
        Relationships: []
      }
      sms_analytics: {
        Row: {
          avg_cost_cents: number | null
          dealer_id: number | null
          delivered: number | null
          event_type: string | null
          failed: number | null
          module: string | null
          sent_date: string | null
          total_cost_cents: number | null
          total_sent: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_send_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "sms_send_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_send_history_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      user_notification_preferences_legacy: {
        Row: {
          approval_notifications_enabled: boolean | null
          auto_dismiss_read_after_days: number | null
          auto_dismiss_unread_after_days: number | null
          bottleneck_alerts_enabled: boolean | null
          created_at: string | null
          dealer_id: number | null
          desktop_enabled: boolean | null
          email_enabled: boolean | null
          in_app_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sla_critical_enabled: boolean | null
          sla_warnings_enabled: boolean | null
          step_completion_enabled: boolean | null
          system_alerts_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
          vehicle_status_enabled: boolean | null
          work_item_notifications_enabled: boolean | null
        }
        Insert: {
          approval_notifications_enabled?: never
          auto_dismiss_read_after_days?: number | null
          auto_dismiss_unread_after_days?: number | null
          bottleneck_alerts_enabled?: never
          created_at?: string | null
          dealer_id?: number | null
          desktop_enabled?: boolean | null
          email_enabled?: boolean | null
          in_app_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sla_critical_enabled?: never
          sla_warnings_enabled?: never
          step_completion_enabled?: never
          system_alerts_enabled?: never
          updated_at?: string | null
          user_id?: string | null
          vehicle_status_enabled?: never
          work_item_notifications_enabled?: never
        }
        Update: {
          approval_notifications_enabled?: never
          auto_dismiss_read_after_days?: number | null
          auto_dismiss_unread_after_days?: number | null
          bottleneck_alerts_enabled?: never
          created_at?: string | null
          dealer_id?: number | null
          desktop_enabled?: boolean | null
          email_enabled?: boolean | null
          in_app_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sla_critical_enabled?: never
          sla_warnings_enabled?: never
          step_completion_enabled?: never
          system_alerts_enabled?: never
          updated_at?: string | null
          user_id?: string | null
          vehicle_status_enabled?: never
          work_item_notifications_enabled?: never
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_universal_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_notification_preferences_universal_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_universal_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      user_sms_notification_preferences_legacy: {
        Row: {
          created_at: string | null
          dealer_id: number | null
          event_preferences: Json | null
          id: string | null
          max_sms_per_day: number | null
          max_sms_per_hour: number | null
          module: string | null
          phone_number: string | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          dealer_id?: number | null
          event_preferences?: Json | null
          id?: string | null
          max_sms_per_day?: never
          max_sms_per_hour?: never
          module?: string | null
          phone_number?: string | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          dealer_id?: number | null
          event_preferences?: Json | null
          id?: string | null
          max_sms_per_day?: never
          max_sms_per_hour?: never
          module?: string | null
          phone_number?: string | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_universal_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "user_notification_preferences_universal_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notification_preferences_universal_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      v_permission_migration_status: {
        Row: {
          dealer_id: number | null
          display_name: string | null
          migration_status: string | null
          new_module_permission_count: number | null
          new_system_permission_count: number | null
          old_permission_count: number | null
          role_id: string | null
          role_name: string | null
        }
        Insert: {
          dealer_id?: number | null
          display_name?: string | null
          migration_status?: never
          new_module_permission_count?: never
          new_system_permission_count?: never
          old_permission_count?: never
          role_id?: string | null
          role_name?: string | null
        }
        Update: {
          dealer_id?: number | null
          display_name?: string | null
          migration_status?: never
          new_module_permission_count?: never
          new_system_permission_count?: never
          old_permission_count?: never
          role_id?: string | null
          role_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dealer_custom_roles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "appointment_slots_health"
            referencedColumns: ["dealer_id"]
          },
          {
            foreignKeyName: "dealer_custom_roles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "dealerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dealer_custom_roles_dealer_id_fkey"
            columns: ["dealer_id"]
            isOneToOne: false
            referencedRelation: "mv_dealership_stats"
            referencedColumns: ["dealer_id"]
          },
        ]
      }
      vehicle_step_time_summary: {
        Row: {
          avg_hours_per_visit: number | null
          backtrack_count: number | null
          first_entry: string | null
          is_current_step: boolean | null
          last_exit: string | null
          max_hours: number | null
          min_hours: number | null
          step_color: string | null
          step_id: string | null
          step_name: string | null
          total_hours: number | null
          vehicle_id: string | null
          visit_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_step_history_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "get_ready_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_step_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "active_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_step_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "deleted_get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_step_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "get_ready_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_step_history_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_step_times_current"
            referencedColumns: ["vehicle_id"]
          },
        ]
      }
      vehicle_step_times_current: {
        Row: {
          current_step_entry: string | null
          current_step_name: string | null
          current_visit_days: number | null
          current_visit_hours: number | null
          previous_visits_hours: number | null
          stock_number: string | null
          vehicle_id: string | null
          vin: string | null
          visit_number: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_dealer_invitation: {
        Args: { token_input: string }
        Returns: undefined
      }
      accept_dealer_invitation_v2: {
        Args: { token_input: string }
        Returns: boolean
      }
      approve_vehicle: {
        Args: { p_notes?: string; p_vehicle_id: string }
        Returns: Json
      }
      approve_vehicle_v1_backup: {
        Args: { p_notes?: string; p_vehicle_id: string }
        Returns: Json
      }
      assign_basic_permissions_to_role: {
        Args: { p_role_id: string; p_role_name: string }
        Returns: undefined
      }
      assign_role:
        | {
            Args: {
              expires_at?: string
              role_name: string
              target_user_id: string
            }
            Returns: boolean
          }
        | { Args: { p_role_name: string; p_user_id: string }; Returns: boolean }
      audit_role_inconsistencies: {
        Args: never
        Returns: {
          assigned_role_display: string
          assigned_role_name: string
          dealership_id: number
          has_dealer_membership: boolean
          has_role_assignment: boolean
          inconsistency_type: string
          profile_role: string
          profile_user_type: Database["public"]["Enums"]["user_type"]
          recommended_action: string
          severity: string
          user_email: string
          user_id: string
        }[]
      }
      auto_add_follower: {
        Args: {
          p_dealer_id: number
          p_entity_id: string
          p_entity_type: string
          p_reason?: string
          p_user_id: string
        }
        Returns: string
      }
      bulk_set_role_module_access: {
        Args: { p_modules_access: Json; p_role_id: string }
        Returns: boolean
      }
      calculate_step_hours: {
        Args: { p_entry_date: string; p_exit_date: string }
        Returns: number
      }
      can_access_dealership: {
        Args: { dealer_id: number; user_id: string }
        Returns: boolean
      }
      can_punch_in_now: {
        Args: {
          p_current_time?: string
          p_employee_id: string
          p_kiosk_id: string
        }
        Returns: {
          allowed: boolean
          minutes_until_allowed: number
          reason: string
          schedule_id: string
          shift_end_time: string
          shift_start_time: string
        }[]
      }
      can_user_access_order_type: {
        Args: { target_order_type: string; user_uuid: string }
        Returns: boolean
      }
      can_user_edit_order: {
        Args: { target_order_id: string; user_uuid: string }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          p_identifier: string
          p_max_requests?: number
          p_resource_type: string
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_user_permission_v2: {
        Args: { module_name: string; permission_level: string; user_id: string }
        Returns: boolean
      }
      check_vehicle_approval_needed: {
        Args: { p_vehicle_id: string }
        Returns: boolean
      }
      cleanup_expired_slots: {
        Args: never
        Returns: {
          deleted_count: number
          execution_time_ms: number
          oldest_date_removed: string
        }[]
      }
      cleanup_old_edge_logs: { Args: never; Returns: undefined }
      cleanup_old_notifications: { Args: never; Returns: number }
      cleanup_old_vin_cache: {
        Args: never
        Returns: {
          deleted_count: number
        }[]
      }
      create_dealer_invitation: {
        Args: { p_dealer_id: number; p_email: string; p_role_name: string }
        Returns: Json
      }
      create_default_get_ready_steps: {
        Args: { p_dealer_id: number }
        Returns: undefined
      }
      create_default_notification_events_for_role: {
        Args: { p_module: string; p_role_id: string; p_role_name: string }
        Returns: undefined
      }
      create_default_notification_preferences: {
        Args: { p_dealer_id: number; p_module: string; p_user_id: string }
        Returns: string
      }
      create_get_ready_notification: {
        Args: {
          p_action_label?: string
          p_action_url?: string
          p_dealer_id: number
          p_message: string
          p_metadata?: Json
          p_priority: Database["public"]["Enums"]["notification_priority"]
          p_step_id?: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user_id: string
          p_vehicle_id?: string
        }
        Returns: string
      }
      create_role_system_backup: { Args: never; Returns: string }
      dealership_has_module_access: {
        Args: {
          p_dealer_id: number
          p_module: Database["public"]["Enums"]["app_module"]
        }
        Returns: boolean
      }
      debug_user_permissions: {
        Args: { target_dealer_id?: number; user_uuid: string }
        Returns: {
          allowed_order_types: string[]
          dealership_id: number
          group_memberships: string[]
          has_dealer_membership: boolean
          user_id: string
          user_role: string
          user_type: string
        }[]
      }
      detect_schedule_conflicts: {
        Args: {
          p_employee_id: string
          p_exclude_schedule_id?: string
          p_shift_date: string
          p_shift_end_time: string
          p_shift_start_time: string
        }
        Returns: boolean
      }
      dismiss_get_ready_notification: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      dismiss_notification: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      execute_nfc_workflows: {
        Args: { p_scan_data?: Json; p_tag_id: string }
        Returns: Json
      }
      expire_old_password_resets: { Args: never; Returns: undefined }
      format_dh: { Args: { interval_val: unknown }; Returns: string }
      generate_all_employee_schedules: {
        Args: {
          p_days_ahead?: number
          p_dealership_id: number
          p_start_date?: string
        }
        Returns: {
          employee_id: string
          employee_name: string
          schedules_created: number
          schedules_skipped: number
        }[]
      }
      generate_avatar_seed: { Args: { user_uuid: string }; Returns: string }
      generate_car_wash_order_number: { Args: never; Returns: string }
      generate_custom_order_number: { Args: never; Returns: string }
      generate_detail_hub_invoice_number: {
        Args: { p_dealership_id: number }
        Returns: string
      }
      generate_employee_number: {
        Args: { p_dealer_id: number }
        Returns: string
      }
      generate_employee_schedules: {
        Args: {
          p_days_ahead?: number
          p_employee_id: string
          p_overwrite_existing?: boolean
          p_start_date?: string
        }
        Returns: {
          date_range: string
          schedules_created: number
          schedules_skipped: number
        }[]
      }
      generate_invoice_number: {
        Args: { p_dealer_id: number }
        Returns: string
      }
      generate_payment_number: {
        Args: { p_dealer_id: number }
        Returns: string
      }
      generate_recon_order_number: { Args: never; Returns: string }
      generate_sales_order_number: { Args: never; Returns: string }
      generate_service_order_number: { Args: never; Returns: string }
      generate_unique_slug: { Args: never; Returns: string }
      get_accumulated_hours_in_step: {
        Args: { p_step_id: string; p_vehicle_id: string }
        Returns: number
      }
      get_active_announcements: {
        Args: never
        Returns: {
          content: string
          created_at: string | null
          created_by: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          priority: number | null
          start_date: string | null
          target_dealer_ids: number[] | null
          target_roles: string[] | null
          title: string
          type: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "announcements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_approval_vehicles: {
        Args: { p_dealer_id: number; p_limit?: number; p_offset?: number }
        Returns: {
          pending_work_items: Json
          priority: string
          stock_number: string
          total_work_items: number
          vehicle_id: string
          vehicle_make: string
          vehicle_model: string
          vehicle_year: number
          vin: string
        }[]
      }
      get_available_slots: {
        Args: { p_date_slot: string; p_dealer_id: number; p_hour_slot?: number }
        Returns: {
          available_slots: number
          date_slot: string
          hour_slot: number
          is_available: boolean
          max_capacity: number
        }[]
      }
      get_bottleneck_alerts: {
        Args: { p_dealer_id: number }
        Returns: {
          avg_wait_time: number
          created_at: string
          recommended_action: string
          severity: string
          step_id: string
          step_name: string
          vehicle_count: number
        }[]
      }
      get_break_violations: {
        Args: {
          p_dealership_id: number
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          break_minutes: number
          employee_id: string
          employee_name: string
          required_minutes: number
          shift_date: string
          shift_hours: number
          shortage_minutes: number
          time_entry_id: string
          violation_reason: string
        }[]
      }
      get_chat_effective_permissions: {
        Args: {
          p_conversation_id: string
          p_dealer_id: number
          p_user_id: string
        }
        Returns: Json
      }
      get_comment_reactions_summary: {
        Args: { p_comment_id: string }
        Returns: {
          count: number
          reaction_type: string
          user_reacted: boolean
        }[]
      }
      get_comment_thread: {
        Args: { p_comment_id: string }
        Returns: {
          comment_text: string
          comment_type: string
          created_at: string
          id: string
          order_id: string
          parent_comment_id: string
          thread_level: number
          updated_at: string
          user_id: string
        }[]
      }
      get_conversation_last_messages: {
        Args: { conversation_ids: string[] }
        Returns: {
          conversation_id: string
          last_message_at: string
          last_message_content: string
          last_message_type: string
          last_message_user_id: string
        }[]
      }
      get_conversation_participants: {
        Args: { conversation_uuid: string; requesting_user_id: string }
        Returns: {
          is_active: boolean
          last_read_at: string
          permission_level: string
          presence_status: string
          user_avatar_url: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_current_user_dealership: { Args: never; Returns: number }
      get_current_user_role: { Args: never; Returns: string }
      get_current_vehicles_per_step: {
        Args: { p_dealer_id: number }
        Returns: {
          avg_days_in_step: number
          current_vehicle_count: number
          step_id: string
          step_name: string
          step_order: number
          vehicles_over_sla: number
        }[]
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
      get_dealer_channel_defaults: {
        Args: { p_dealer_id: number; p_module: string }
        Returns: Json
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
      get_dealer_services_by_department: {
        Args: { p_dealer_id: number; p_department_name: string }
        Returns: {
          category_color: string
          category_id: string
          category_name: string
          color: string
          description: string
          duration: number
          id: string
          name: string
          price: number
        }[]
      }
      get_dealer_services_for_user: {
        Args: { p_dealer_id: number }
        Returns: {
          assigned_groups: string[]
          category_color: string
          category_id: string
          category_name: string
          color: string
          description: string
          duration: number
          id: string
          is_active: boolean
          name: string
          price: number
        }[]
      }
      get_dealer_step_analytics: {
        Args: { p_days_back?: number; p_dealer_id: number }
        Returns: {
          avg_time_first_visit: number
          avg_time_revisits: number
          avg_total_time: number
          backtrack_count: number
          max_revisits: number
          revisit_rate: number
          step_id: string
          step_name: string
          total_vehicles: number
        }[]
      }
      get_dealer_t2l_stats: {
        Args: { p_dealer_id: number }
        Returns: {
          average_holding_cost: number
          average_t2l_hours: number
          best_t2l_hours: number
          completed_vehicles: number
          total_vehicles: number
          worst_active_t2l_hours: number
        }[]
      }
      get_dealership_contacts: {
        Args: { p_dealership_id: number }
        Returns: {
          email: string
          id: string
          is_default: boolean
          job_title: string
          name: string
        }[]
      }
      get_dealership_modules: {
        Args: { p_dealer_id: number }
        Returns: {
          is_enabled: boolean
          module: string
        }[]
      }
      get_dealership_performance_stats: {
        Args: never
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
          active_user_count: number
          carwash_orders_count: number
          completed_orders_count: number
          contacts_count: number
          dealer_id: number
          dealer_name: string
          dealer_status: string
          in_progress_orders_count: number
          last_order_date: string
          last_updated_at: string
          pending_orders_count: number
          recon_orders_count: number
          sales_orders_count: number
          service_orders_count: number
          subscription_plan: string
        }[]
      }
      get_default_contact: {
        Args: { p_dealership_id: number }
        Returns: {
          email: string
          id: string
          job_title: string
          name: string
        }[]
      }
      get_deleted_users: {
        Args: never
        Returns: {
          deleted_at: string
          deleted_by: string
          deleter_email: string
          deletion_reason: string
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
      get_department_revenue: {
        Args: {
          p_dealer_id: number
          p_end_date: string
          p_order_type?: string
          p_service_ids?: string[]
          p_start_date: string
          p_status?: string
        }
        Returns: {
          avg_order_value: number
          completed: number
          completion_rate: number
          department: string
          orders: number
          revenue: number
        }[]
      }
      get_detail_hub_invoice_statistics: {
        Args: { p_dealership_id: number }
        Returns: {
          draft_count: number
          overdue_amount: number
          overdue_count: number
          paid_count: number
          pending_amount: number
          pending_count: number
          total_invoices: number
          total_revenue: number
        }[]
      }
      get_employee_schedule: {
        Args: { p_date?: string; p_employee_id: string }
        Returns: {
          assigned_kiosk_id: string | null
          break_is_paid: boolean
          created_at: string
          created_by: string | null
          dealership_id: number
          early_punch_allowed_minutes: number
          employee_id: string
          id: string
          late_punch_grace_minutes: number
          notes: string | null
          required_break_minutes: number
          shift_date: string
          shift_end_time: string
          shift_start_time: string
          status: Database["public"]["Enums"]["detail_hub_shift_status"]
          time_entry_id: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "detail_hub_schedules"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_entity_followers: {
        Args: {
          p_dealer_id: number
          p_entity_id: string
          p_entity_type: string
        }
        Returns: {
          follow_type: string
          followed_at: string
          id: string
          notification_level: string
          presence_status: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_historical_kpis: {
        Args: { p_dealer_id: number; p_end_date: string; p_start_date: string }
        Returns: {
          active_vehicles: number
          avg_t2l: number
          daily_throughput: number
          date: string
          sla_compliance: number
          vehicles_completed: number
        }[]
      }
      get_invoice_analytics: {
        Args: { p_dealer_id: number; p_end_date: string; p_start_date: string }
        Returns: {
          avg_days_to_payment: number
          monthly_trend: Json
          overdue_count: number
          paid_count: number
          payment_method_distribution: Json
          pending_count: number
          total_amount: number
          total_due: number
          total_invoices: number
          total_paid: number
        }[]
      }
      get_invoice_comments_with_users: {
        Args: { p_invoice_id: string }
        Returns: {
          comment: string
          created_at: string
          id: string
          invoice_id: string
          is_edited: boolean
          is_internal: boolean
          updated_at: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_invoice_items_with_order_info: {
        Args: { p_invoice_id: string }
        Returns: {
          created_at: string
          description: string
          discount_amount: number
          id: string
          invoice_id: string
          item_type: string
          metadata: Json
          order_number: string
          order_type: string
          po: string
          quantity: number
          ro: string
          service_names: string
          service_reference: string
          sort_order: number
          tag: string
          tax_rate: number
          total_amount: number
          unit_price: number
          updated_at: string
        }[]
      }
      get_invoices_with_filters: {
        Args: {
          p_dealer_id?: number
          p_end_date?: string
          p_order_type?: string
          p_search_term?: string
          p_start_date?: string
          p_status?: string
        }
        Returns: {
          amount_due: number
          amount_paid: number
          cancelled_at: string
          comments_count: number
          created_at: string
          created_by: string
          custom_order_number: string
          customer_email: string
          customer_name: string
          customer_phone: string
          dealer_id: number
          dealership_address: string
          dealership_email: string
          dealership_id: number
          dealership_logo_url: string
          dealership_name: string
          dealership_phone: string
          discount_amount: number
          due_date: string
          email_sent: boolean
          email_sent_at: string
          email_sent_count: number
          id: string
          invoice_notes: string
          invoice_number: string
          issue_date: string
          last_email_recipient: string
          metadata: Json
          order_id: string
          order_number: string
          order_services: Json
          order_status: string
          order_total_amount: number
          order_type: string
          paid_at: string
          status: string
          subtotal: number
          tax_amount: number
          tax_rate: number
          terms_and_conditions: string
          total_amount: number
          updated_at: string
          vehicle_info: string
          vehicle_make: string
          vehicle_model: string
          vehicle_vin: string
          vehicle_year: number
        }[]
      }
      get_live_dashboard_stats: {
        Args: { p_dealership_id: number }
        Returns: {
          avg_elapsed_hours: number
          total_clocked_in: number
          total_hours_today: number
          total_on_break: number
          unique_departments: number
        }[]
      }
      get_nfc_analytics: {
        Args: {
          p_dealer_id: number
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          active_tags: number
          avg_scans_per_tag: number
          daily_scan_trends: Json
          popular_locations: Json
          total_scans: number
          total_tags: number
          unique_scanners: number
        }[]
      }
      get_ny_timezone_date: { Args: { timestamp_val: string }; Returns: string }
      get_ny_timezone_hour: { Args: { timestamp_val: string }; Returns: number }
      get_operational_orders_list: {
        Args: {
          p_dealer_id: number
          p_end_date: string
          p_order_type?: string
          p_service_ids?: string[]
          p_start_date: string
          p_status?: string
        }
        Returns: {
          assigned_group_id: string
          assigned_to_name: string
          completed_at: string
          created_at: string
          custom_order_number: string
          customer_name: string
          due_date: string
          id: number
          invoice_number: string
          order_number: string
          order_type: string
          po: string
          ro: string
          services: Json
          status: string
          stock_number: string
          tag: string
          total_amount: number
          vehicle_make: string
          vehicle_model: string
          vehicle_vin: string
          vehicle_year: number
        }[]
      }
      get_order_summary_stats: {
        Args: { p_dealer_id: number; p_order_type?: string }
        Returns: Json
      }
      get_order_with_relations: { Args: { p_order_id: string }; Returns: Json }
      get_orders_analytics: {
        Args: {
          p_dealer_id: number
          p_end_date: string
          p_order_type?: string
          p_service_ids?: string[]
          p_start_date: string
          p_status?: string
        }
        Returns: {
          avg_order_value: number
          avg_processing_time_hours: number
          cancelled_orders: number
          completed_orders: number
          completion_rate: number
          daily_data: Json
          in_progress_orders: number
          pending_orders: number
          sla_compliance_rate: number
          status_distribution: Json
          total_orders: number
          total_revenue: number
          total_volume: number
          type_distribution: Json
        }[]
      }
      get_orders_for_reports: {
        Args: {
          p_dealer_id?: number
          p_end_date?: string
          p_limit?: number
          p_order_type?: string
          p_start_date?: string
          p_status?: string
        }
        Returns: {
          assigned_group_id: string
          completed_at: string
          created_at: string
          custom_order_number: string
          customer_name: string
          id: string
          order_number: string
          order_type: string
          po: string
          ro: string
          services: Json
          status: string
          stock_number: string
          tag: string
          total_amount: number
          updated_at: string
          vehicle_make: string
          vehicle_model: string
          vehicle_vin: string
          vehicle_year: number
        }[]
      }
      get_orders_with_filters: {
        Args: {
          p_dealer_id: number
          p_limit?: number
          p_offset?: number
          p_order_type?: string
          p_search?: string
          p_status?: string[]
        }
        Returns: {
          comment_count: number
          created_at: string
          created_by: string
          customer_name: string
          days_since_created: number
          dealer_id: number
          id: string
          is_overdue: boolean
          order_number: string
          order_type: string
          status: string
          status_badge: Json
          updated_at: string
          vehicle_info: string
          vehicle_make: string
          vehicle_model: string
          vehicle_vin: string
          vehicle_year: number
        }[]
      }
      get_overview_table: {
        Args: { p_dealer_id: number }
        Returns: {
          created_at: string
          current_step_color: string
          current_step_name: string
          current_step_order: number
          days_in_step: string
          id: string
          media_count: number
          notes_preview: string
          priority: string
          retail_value: number
          short_vin: string
          status: string
          stock_number: string
          vehicle_make: string
          vehicle_model: string
          vehicle_trim: string
          vehicle_year: number
          vin: string
          work_item_counts: Json
        }[]
      }
      get_pending_approvals_count: {
        Args: { p_dealer_id: number }
        Returns: {
          by_priority: Json
          total_pending: number
        }[]
      }
      get_pending_work_items_for_vehicle: {
        Args: { p_vehicle_id: string }
        Returns: {
          description: string
          estimated_cost: number
          estimated_hours: number
          id: string
          priority: number
          title: string
          work_type: string
        }[]
      }
      get_performance_trends: {
        Args: {
          p_dealer_id: number
          p_end_date: string
          p_service_ids?: string[]
          p_start_date: string
        }
        Returns: {
          department_performance: Json
          efficiency_trends: Json
          sla_trends: Json
          volume_trends: Json
        }[]
      }
      get_ready_activity_stats: {
        Args: { p_days?: number; p_dealer_id: number }
        Returns: {
          activities_today: number
          activity_trend: Json
          most_active_user_id: string
          top_activity_type: string
          total_activities: number
        }[]
      }
      get_ready_kpis: {
        Args: { p_dealer_id: number }
        Returns: {
          avg_holding_cost: number
          avg_t2l: number
          daily_throughput: number
          sla_compliance: number
          target_t2l: number
          total_holding_costs: number
          weekly_capacity: number
        }[]
      }
      get_recent_orders_by_user: {
        Args: { p_dealer_id: number; p_limit?: number; p_user_id: string }
        Returns: {
          created_at: string
          customer_name: string
          id: string
          order_number: string
          order_type: string
          status: string
          updated_at: string
          vehicle_info: string
        }[]
      }
      get_recent_system_activity: {
        Args: never
        Returns: {
          activity_description: string
          activity_type: string
          created_at: string
          entity_id: string
          entity_type: string
          user_email: string
        }[]
      }
      get_revenue_analytics: {
        Args: {
          p_dealer_id: number
          p_end_date: string
          p_grouping?: string
          p_order_type?: string
          p_service_ids?: string[]
          p_start_date: string
          p_status?: string
        }
        Returns: {
          avg_revenue_per_period: number
          growth_rate: number
          period_data: Json
          top_services: Json
          total_orders: number
          total_revenue: number
        }[]
      }
      get_role_module_access: {
        Args: { p_role_id: string }
        Returns: {
          created_at: string
          is_enabled: boolean
          module: Database["public"]["Enums"]["app_module"]
          updated_at: string
        }[]
      }
      get_role_statistics: {
        Args: never
        Returns: {
          count: number
          details: Json
          metric: string
        }[]
      }
      get_schedule_compliance_report: {
        Args: {
          p_dealership_id: number
          p_end_date?: string
          p_start_date?: string
        }
        Returns: {
          compliance_percentage: number
          early_shifts: number
          employee_id: string
          employee_name: string
          late_shifts: number
          missed_shifts: number
          on_time_shifts: number
          total_shifts: number
        }[]
      }
      get_sla_alerts: {
        Args: { p_dealer_id: number }
        Returns: {
          created_at: string
          escalation_level: number
          hours_overdue: number
          severity: string
          stock_number: string
          vehicle_id: string
          vehicle_info: string
        }[]
      }
      get_sla_config_for_dealer: {
        Args: { p_dealer_id: number }
        Returns: {
          config_id: string
          danger_threshold: number
          default_time_goal: number
          green_threshold: number
          max_time_goal: number
          step_danger_threshold: number
          step_green_threshold: number
          step_id: string
          step_time_goal: number
          step_warning_threshold: number
          warning_threshold: number
        }[]
      }
      get_sla_status_for_vehicle: {
        Args: { p_dealer_id: number; p_vehicle_id: string }
        Returns: string
      }
      get_step_assigned_users: {
        Args: { p_step_id: string }
        Returns: {
          email: string
          first_name: string
          last_name: string
          notification_enabled: boolean
          role: string
          user_id: string
        }[]
      }
      get_step_vehicle_counts: {
        Args: { p_dealer_id: number }
        Returns: {
          avg_days_in_step: number
          step_id: string
          step_name: string
          vehicle_count: number
        }[]
      }
      get_step_visit_breakdown: {
        Args: { p_step_id: string; p_vehicle_id: string }
        Returns: {
          entry_date: string
          exit_date: string
          hours_spent: number
          is_current: boolean
          visit_number: number
        }[]
      }
      get_steps_with_counts: {
        Args: { p_dealer_id: number }
        Returns: {
          color: string
          description: string
          icon: string
          id: string
          is_default: boolean
          name: string
          order_index: number
          vehicle_count: number
        }[]
      }
      get_system_stats: {
        Args: never
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
      get_unread_notification_count: {
        Args: { p_dealer_id: number; p_user_id: string }
        Returns: number
      }
      get_user_accessible_dealers: {
        Args: { user_uuid: string }
        Returns: {
          address: string
          city: string
          country: string
          email: string
          id: number
          logo_url: string
          name: string
          phone: string
          state: string
          status: string
          subscription_plan: string
          thumbnail_logo_url: string
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
      get_user_allowed_modules: {
        Args: { target_user_id: string }
        Returns: string[]
      }
      get_user_allowed_order_types: {
        Args: { user_uuid: string }
        Returns: string[]
      }
      get_user_data_v2: { Args: { p_user_id: string }; Returns: Json }
      get_user_dealership: { Args: { user_id: string }; Returns: number }
      get_user_effective_permissions: {
        Args: { user_uuid: string }
        Returns: Json
      }
      get_user_notification_config: {
        Args: { p_dealer_id: number; p_module: string; p_user_id: string }
        Returns: {
          config_exists: boolean
          email_enabled: boolean
          event_preferences: Json
          in_app_enabled: boolean
          phone_number_override: string
          push_enabled: boolean
          quiet_hours_enabled: boolean
          sms_enabled: boolean
        }[]
      }
      get_user_permissions: {
        Args: { user_uuid: string }
        Returns: {
          module: string
          permission_level: string
          role_name: string
        }[]
      }
      get_user_permissions_batch: {
        Args: { p_user_id: string }
        Returns: {
          allowed_modules: Json
          module_access: Json
          module_permissions: Json
          roles: Json
          system_permissions: Json
        }[]
      }
      get_user_permissions_v3:
        | {
            Args: { p_dealer_id: number; p_user_id: string }
            Returns: {
              module: string
              permission_level: string
            }[]
          }
        | {
            Args: { p_dealer_id: number; p_user_id: string }
            Returns: {
              module: Database["public"]["Enums"]["app_module_v3"]
              permission_level: Database["public"]["Enums"]["permission_level_v3"]
              role_name: Database["public"]["Enums"]["base_role_v3"]
            }[]
          }
      get_user_role_v3:
        | { Args: { p_dealer_id: number; p_user_id: string }; Returns: string }
        | {
            Args: { p_dealer_id: number; p_user_id: string }
            Returns: Database["public"]["Enums"]["base_role_v3"]
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
      get_user_roles_v2: {
        Args: { p_user_id: string }
        Returns: {
          dealership_name: string
          department: Database["public"]["Enums"]["department_type_v2"]
          is_management: boolean
          role: Database["public"]["Enums"]["system_role_simplified_v2"]
          role_display_name: string
          role_id: string
        }[]
      }
      get_users_with_module_access: {
        Args: { p_dealer_id: number; p_module: string }
        Returns: {
          email: string
          first_name: string
          is_system_admin: boolean
          last_name: string
          role_name: string
          user_id: string
        }[]
      }
      get_users_with_module_permission: {
        Args: {
          p_dealer_id: number
          p_module: string
          p_permission_key: string
        }
        Returns: {
          user_id: string
        }[]
      }
      get_vehicle_detail: {
        Args: { p_vehicle_id: string }
        Returns: {
          media: Json
          notes: Json
          timeline: Json
          vehicle_info: Json
          work_items: Json
        }[]
      }
      get_vehicle_step_times: {
        Args: { p_vehicle_id: string }
        Returns: {
          is_current_step: boolean
          step_id: string
          step_name: string
          total_days: number
          total_hours: number
          visit_count: number
        }[]
      }
      get_vehicles_by_days_in_step: {
        Args: { p_dealer_id: number; p_step_id?: string }
        Returns: {
          avg_days_in_step: number
          cost_per_day: number
          sla_hours: number
          step_id: string
          step_name: string
          total_vehicles: number
          vehicles_1_day: number
          vehicles_2_3_days: number
          vehicles_4_plus_days: number
        }[]
      }
      get_vin_cache_stats: {
        Args: never
        Returns: {
          avg_hits_per_entry: number
          cache_size_mb: number
          newest_entry: string
          oldest_entry: string
          total_entries: number
          total_hits: number
        }[]
      }
      get_weekly_schedules: {
        Args: { p_dealership_id: number; p_week_start_date: string }
        Returns: {
          assigned_kiosk_id: string | null
          break_is_paid: boolean
          created_at: string
          created_by: string | null
          dealership_id: number
          early_punch_allowed_minutes: number
          employee_id: string
          id: string
          late_punch_grace_minutes: number
          notes: string | null
          required_break_minutes: number
          shift_date: string
          shift_end_time: string
          shift_start_time: string
          status: Database["public"]["Enums"]["detail_hub_shift_status"]
          time_entry_id: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "detail_hub_schedules"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_permission: {
        Args: {
          check_module: Database["public"]["Enums"]["app_module"]
          required_level: Database["public"]["Enums"]["permission_level"]
          user_uuid: string
        }
        Returns: boolean
      }
      has_permission_v3:
        | {
            Args: {
              p_dealer_id: number
              p_module: string
              p_required_level: string
              p_user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              p_dealer_id: number
              p_module: Database["public"]["Enums"]["app_module_v3"]
              p_required_level: Database["public"]["Enums"]["permission_level_v3"]
              p_user_id: string
            }
            Returns: boolean
          }
      increment_vin_cache_hit: {
        Args: { vin_param: string }
        Returns: undefined
      }
      initialize_dealership_modules: {
        Args: { p_dealer_id: number }
        Returns: boolean
      }
      initialize_supermanager_access: {
        Args: { p_user_id: string }
        Returns: Json
      }
      invalidate_role_permission_cache: {
        Args: { p_role_id: string }
        Returns: {
          affected_user_id: string
        }[]
      }
      is_admin:
        | { Args: { user_id: string }; Returns: boolean }
        | { Args: never; Returns: boolean }
      is_dealer_admin_v3: {
        Args: { p_dealer_id: number; p_user_id: string }
        Returns: boolean
      }
      is_dealer_channel_enabled: {
        Args: {
          p_channel: string
          p_dealer_id: number
          p_event_type: string
          p_module: string
        }
        Returns: boolean
      }
      is_slack_enabled_for_event: {
        Args: { p_dealer_id: number; p_event_type: string; p_module: string }
        Returns: boolean
      }
      is_system_admin:
        | { Args: { user_id: string }; Returns: boolean }
        | { Args: never; Returns: boolean }
      is_system_admin_v3: { Args: { p_user_id: string }; Returns: boolean }
      is_user_member_of_dealer: {
        Args: { p_dealer_id: number }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_dealer_id?: number
          p_event_details?: Json
          p_event_type: string
          p_success?: boolean
          p_target_user_id?: string
        }
        Returns: string
      }
      map_specialized_to_simplified_role: {
        Args: {
          specialized_role: Database["public"]["Enums"]["system_role_v2"]
        }
        Returns: Database["public"]["Enums"]["system_role_simplified_v2"]
      }
      mark_all_get_ready_notifications_read: {
        Args: { p_dealer_id: number; p_user_id: string }
        Returns: number
      }
      mark_get_ready_notification_as_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mark_notification_as_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mark_notifications_as_read: {
        Args: { p_notification_ids: string[] }
        Returns: number
      }
      migrate_dealership_to_v2: {
        Args: { dealership_id_old: number }
        Returns: string
      }
      migrate_permission_level_to_granular: {
        Args: {
          p_module: string
          p_permission_level: string
          p_role_id: string
        }
        Returns: undefined
      }
      migrate_user_to_v2: { Args: { user_auth_id: string }; Returns: string }
      preview_role_fixes: {
        Args: never
        Returns: {
          current_state: string
          proposed_action: string
          risk_level: string
          safe_to_apply: boolean
          user_email: string
        }[]
      }
      refresh_dealership_stats: { Args: never; Returns: undefined }
      regenerate_employee_schedules: {
        Args: { p_employee_id: string; p_from_date?: string }
        Returns: {
          date_range: string
          schedules_created: number
          schedules_skipped: number
        }[]
      }
      reject_vehicle: {
        Args: { p_notes?: string; p_reason: string; p_vehicle_id: string }
        Returns: Json
      }
      release_appointment_slot: {
        Args: { p_date_slot: string; p_dealer_id: number; p_hour_slot: number }
        Returns: boolean
      }
      request_approval: {
        Args: { p_notes?: string; p_vehicle_id: string }
        Returns: Json
      }
      reserve_appointment_slot: {
        Args: { p_date_slot: string; p_dealer_id: number; p_hour_slot: number }
        Returns: boolean
      }
      restore_deleted_user: { Args: { target_user_id: string }; Returns: Json }
      restore_vehicle: {
        Args: { p_user_id?: string; p_vehicle_id: string }
        Returns: Json
      }
      safely_assign_missing_roles: {
        Args: never
        Returns: {
          action_taken: string
          error_message: string
          membership_created: boolean
          new_role_assigned: string
          success: boolean
          user_email: string
        }[]
      }
      search_orders_advanced: {
        Args: { p_dealer_id: number; p_limit?: number; p_search_term: string }
        Returns: {
          created_at: string
          customer_name: string
          id: string
          match_type: string
          order_number: string
          order_type: string
          relevance_score: number
          status: string
          vehicle_info: string
          vehicle_vin: string
        }[]
      }
      set_membership_groups: {
        Args: { p_group_ids: string[]; p_membership_id: string }
        Returns: boolean
      }
      set_user_allowed_modules: {
        Args: { modules: string[]; target_user_id: string }
        Returns: undefined
      }
      short_vin: { Args: { vin_text: string }; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      soft_delete_user: {
        Args: { reason?: string; target_user_id: string }
        Returns: Json
      }
      soft_delete_vehicle: {
        Args: { p_user_id?: string; p_vehicle_id: string }
        Returns: Json
      }
      toggle_role_module_access: {
        Args: { p_is_enabled: boolean; p_module: string; p_role_id: string }
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
      update_qr_generation_status: {
        Args: {
          p_increment_attempts?: boolean
          p_order_id: string
          p_status: string
        }
        Returns: undefined
      }
      update_qr_status_only: {
        Args: {
          p_increment_attempts?: boolean
          p_order_id: string
          p_status: string
        }
        Returns: undefined
      }
      update_user_presence: {
        Args: { p_activity?: string; p_dealer_id: number; p_status?: string }
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
      user_has_conversation_access: {
        Args: { conv_id: string; user_uuid: string }
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
      user_has_internal_notes_permission: {
        Args: { user_uuid: string }
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
      user_has_permission_v2: {
        Args: {
          p_module: Database["public"]["Enums"]["system_module_v2"]
          p_permission: Database["public"]["Enums"]["permission_level"]
          p_user_id: string
        }
        Returns: boolean
      }
      user_is_system_admin: { Args: { user_id?: string }; Returns: boolean }
      validate_break_duration: {
        Args: {
          p_break_end: string
          p_break_start: string
          p_time_entry_id: string
        }
        Returns: {
          compliant: boolean
          duration_minutes: number
          reason: string
          required_minutes: number
        }[]
      }
      validate_order_due_date: {
        Args: { due_date_param: string }
        Returns: boolean
      }
      validate_order_due_date_v2: {
        Args: { due_date_param: string }
        Returns: boolean
      }
      validate_role_system: {
        Args: never
        Returns: {
          check_name: string
          description: string
          issue_count: number
          status: string
        }[]
      }
      verify_invitation_token: { Args: { token_input: string }; Returns: Json }
      verify_invitation_token_v2: {
        Args: { token_input: string }
        Returns: Json
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
        | "stock"
        | "productivity"
        | "get_ready"
        | "vin_scanner"
        | "contacts"
        | "detail_hub"
        | "nfc_tracking"
      app_module_v3:
        | "dashboard"
        | "sales_orders"
        | "service_orders"
        | "recon_orders"
        | "car_wash"
        | "contacts"
        | "reports"
        | "users"
        | "settings"
        | "get_ready"
        | "vin_scanner"
        | "productivity"
      approval_status: "pending" | "approved" | "rejected" | "not_required"
      audit_action_v2:
        | "create"
        | "update"
        | "delete"
        | "login"
        | "logout"
        | "role_assigned"
        | "role_removed"
        | "permission_granted"
        | "permission_revoked"
      base_role_v3:
        | "system_admin"
        | "dealer_admin"
        | "dealer_manager"
        | "sales_user"
        | "service_user"
        | "detail_user"
        | "viewer"
      chat_conversation_type: "direct" | "group" | "channel" | "announcement"
      chat_message_type: "text" | "voice" | "file" | "image" | "system"
      chat_permission_level:
        | "read"
        | "write"
        | "moderate"
        | "admin"
        | "none"
        | "restricted_write"
      contact_department: "sales" | "service" | "parts" | "management" | "other"
      conversation_status: "active" | "closed" | "archived"
      dealer_role:
        | "salesperson"
        | "service_advisor"
        | "lot_guy"
        | "sales_manager"
        | "service_manager"
        | "dispatcher"
        | "receptionist"
      dealership_status: "active" | "inactive" | "suspended"
      department_type_v2:
        | "sales"
        | "service"
        | "recon"
        | "carwash"
        | "parts"
        | "administrative"
        | "management"
      detail_hub_invoice_status:
        | "draft"
        | "pending"
        | "sent"
        | "paid"
        | "overdue"
        | "cancelled"
      detail_hub_shift_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "missed"
        | "cancelled"
      detail_role:
        | "super_manager"
        | "detail_manager"
        | "detail_staff"
        | "quality_inspector"
        | "mobile_technician"
      entity_follow_type:
        | "manual"
        | "auto"
        | "assigned"
        | "creator"
        | "auto_role"
      get_ready_priority: "low" | "normal" | "medium" | "high" | "urgent"
      get_ready_sla_status: "on_track" | "warning" | "critical"
      get_ready_workflow_type: "standard" | "express" | "priority"
      invitation_status_v2: "pending" | "accepted" | "expired" | "cancelled"
      language_code: "en" | "es" | "pt-BR"
      note_type:
        | "general"
        | "issue"
        | "decision"
        | "vendor_communication"
        | "cost_change"
        | "timeline_change"
        | "quality_concern"
      notification_frequency: "all" | "mentions" | "none" | "scheduled"
      notification_level: "all" | "important" | "mentions" | "none"
      notification_priority: "low" | "normal" | "high" | "urgent"
      notification_status: "pending" | "sent" | "delivered" | "failed" | "read"
      notification_type:
        | "sla_warning"
        | "sla_critical"
        | "approval_pending"
        | "approval_approved"
        | "approval_rejected"
        | "bottleneck_detected"
        | "bottleneck_resolved"
        | "vehicle_status_change"
        | "work_item_completed"
        | "work_item_created"
        | "step_completed"
        | "system_alert"
        | "vehicle_assigned"
      permission_level: "none" | "read" | "write" | "delete" | "admin"
      permission_level_v3: "none" | "read" | "write" | "admin"
      presence_status: "online" | "away" | "busy" | "offline"
      recon_step_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "blocked"
        | "skipped"
      sms_direction: "inbound" | "outbound"
      subscription_plan: "basic" | "premium" | "enterprise"
      system_module_v2:
        | "dashboard"
        | "sales_orders"
        | "service_orders"
        | "recon_orders"
        | "car_wash"
        | "stock"
        | "chat"
        | "reports"
        | "settings"
        | "dealerships"
        | "users"
        | "management"
        | "productivity"
        | "contacts"
        | "analytics"
      system_role_simplified_v2:
        | "super_admin"
        | "platform_admin"
        | "dealership_admin"
        | "dealership_manager"
        | "dealership_user"
        | "dealership_viewer"
      system_role_v2:
        | "platform_admin"
        | "dealership_owner"
        | "sales_manager"
        | "service_manager"
        | "recon_manager"
        | "carwash_manager"
        | "sales_associate"
        | "finance_manager"
        | "service_advisor"
        | "technician"
        | "recon_technician"
        | "carwash_attendant"
        | "office_manager"
        | "receptionist"
        | "parts_manager"
        | "quality_inspector"
        | "porter"
      timeline_event_type:
        | "arrival"
        | "step_change"
        | "work_started"
        | "work_completed"
        | "vendor_sent"
        | "vendor_returned"
        | "parts_ordered"
        | "parts_received"
        | "inspection"
        | "approval_needed"
        | "cost_change"
        | "delay"
        | "completion"
      user_department: "detailing" | "wash" | "service"
      user_presence_status: "online" | "away" | "busy" | "offline" | "invisible"
      user_role: "admin" | "manager" | "technician" | "viewer"
      user_type: "dealer" | "detail" | "system_admin"
      work_item_status:
        | "awaiting_approval"
        | "approved"
        | "pending"
        | "rejected"
        | "queued"
        | "ready"
        | "scheduled"
        | "in_progress"
        | "on_hold"
        | "blocked"
        | "completed"
        | "cancelled"
        | "declined"
      work_item_type:
        | "mechanical"
        | "body_repair"
        | "detailing"
        | "safety_inspection"
        | "reconditioning"
        | "parts_ordering"
        | "other"
      workflow_step_type:
        | "created"
        | "bring_to_recon"
        | "inspection"
        | "mechanical"
        | "body_work"
        | "detailing"
        | "photos"
        | "needs_approval"
        | "wholesale"
        | "front_line"
        | "not_for_sale"
        | "cant_find_keys"
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
        "stock",
        "productivity",
        "get_ready",
        "vin_scanner",
        "contacts",
        "detail_hub",
        "nfc_tracking",
      ],
      app_module_v3: [
        "dashboard",
        "sales_orders",
        "service_orders",
        "recon_orders",
        "car_wash",
        "contacts",
        "reports",
        "users",
        "settings",
        "get_ready",
        "vin_scanner",
        "productivity",
      ],
      approval_status: ["pending", "approved", "rejected", "not_required"],
      audit_action_v2: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "role_assigned",
        "role_removed",
        "permission_granted",
        "permission_revoked",
      ],
      base_role_v3: [
        "system_admin",
        "dealer_admin",
        "dealer_manager",
        "sales_user",
        "service_user",
        "detail_user",
        "viewer",
      ],
      chat_conversation_type: ["direct", "group", "channel", "announcement"],
      chat_message_type: ["text", "voice", "file", "image", "system"],
      chat_permission_level: [
        "read",
        "write",
        "moderate",
        "admin",
        "none",
        "restricted_write",
      ],
      contact_department: ["sales", "service", "parts", "management", "other"],
      conversation_status: ["active", "closed", "archived"],
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
      department_type_v2: [
        "sales",
        "service",
        "recon",
        "carwash",
        "parts",
        "administrative",
        "management",
      ],
      detail_hub_invoice_status: [
        "draft",
        "pending",
        "sent",
        "paid",
        "overdue",
        "cancelled",
      ],
      detail_hub_shift_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "missed",
        "cancelled",
      ],
      detail_role: [
        "super_manager",
        "detail_manager",
        "detail_staff",
        "quality_inspector",
        "mobile_technician",
      ],
      entity_follow_type: [
        "manual",
        "auto",
        "assigned",
        "creator",
        "auto_role",
      ],
      get_ready_priority: ["low", "normal", "medium", "high", "urgent"],
      get_ready_sla_status: ["on_track", "warning", "critical"],
      get_ready_workflow_type: ["standard", "express", "priority"],
      invitation_status_v2: ["pending", "accepted", "expired", "cancelled"],
      language_code: ["en", "es", "pt-BR"],
      note_type: [
        "general",
        "issue",
        "decision",
        "vendor_communication",
        "cost_change",
        "timeline_change",
        "quality_concern",
      ],
      notification_frequency: ["all", "mentions", "none", "scheduled"],
      notification_level: ["all", "important", "mentions", "none"],
      notification_priority: ["low", "normal", "high", "urgent"],
      notification_status: ["pending", "sent", "delivered", "failed", "read"],
      notification_type: [
        "sla_warning",
        "sla_critical",
        "approval_pending",
        "approval_approved",
        "approval_rejected",
        "bottleneck_detected",
        "bottleneck_resolved",
        "vehicle_status_change",
        "work_item_completed",
        "work_item_created",
        "step_completed",
        "system_alert",
        "vehicle_assigned",
      ],
      permission_level: ["none", "read", "write", "delete", "admin"],
      permission_level_v3: ["none", "read", "write", "admin"],
      presence_status: ["online", "away", "busy", "offline"],
      recon_step_status: [
        "pending",
        "in_progress",
        "completed",
        "blocked",
        "skipped",
      ],
      sms_direction: ["inbound", "outbound"],
      subscription_plan: ["basic", "premium", "enterprise"],
      system_module_v2: [
        "dashboard",
        "sales_orders",
        "service_orders",
        "recon_orders",
        "car_wash",
        "stock",
        "chat",
        "reports",
        "settings",
        "dealerships",
        "users",
        "management",
        "productivity",
        "contacts",
        "analytics",
      ],
      system_role_simplified_v2: [
        "super_admin",
        "platform_admin",
        "dealership_admin",
        "dealership_manager",
        "dealership_user",
        "dealership_viewer",
      ],
      system_role_v2: [
        "platform_admin",
        "dealership_owner",
        "sales_manager",
        "service_manager",
        "recon_manager",
        "carwash_manager",
        "sales_associate",
        "finance_manager",
        "service_advisor",
        "technician",
        "recon_technician",
        "carwash_attendant",
        "office_manager",
        "receptionist",
        "parts_manager",
        "quality_inspector",
        "porter",
      ],
      timeline_event_type: [
        "arrival",
        "step_change",
        "work_started",
        "work_completed",
        "vendor_sent",
        "vendor_returned",
        "parts_ordered",
        "parts_received",
        "inspection",
        "approval_needed",
        "cost_change",
        "delay",
        "completion",
      ],
      user_department: ["detailing", "wash", "service"],
      user_presence_status: ["online", "away", "busy", "offline", "invisible"],
      user_role: ["admin", "manager", "technician", "viewer"],
      user_type: ["dealer", "detail", "system_admin"],
      work_item_status: [
        "awaiting_approval",
        "approved",
        "pending",
        "rejected",
        "queued",
        "ready",
        "scheduled",
        "in_progress",
        "on_hold",
        "blocked",
        "completed",
        "cancelled",
        "declined",
      ],
      work_item_type: [
        "mechanical",
        "body_repair",
        "detailing",
        "safety_inspection",
        "reconditioning",
        "parts_ordering",
        "other",
      ],
      workflow_step_type: [
        "created",
        "bring_to_recon",
        "inspection",
        "mechanical",
        "body_work",
        "detailing",
        "photos",
        "needs_approval",
        "wholesale",
        "front_line",
        "not_for_sale",
        "cant_find_keys",
      ],
    },
  },
} as const
