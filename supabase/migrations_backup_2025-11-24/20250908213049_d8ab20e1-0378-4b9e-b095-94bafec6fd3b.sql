-- FASE 1: Estructura de Base de Datos para Módulo de Chat Independiente

-- ============================================================================
-- ENUMS Y TIPOS
-- ============================================================================

-- Tipos de conversación
CREATE TYPE chat_conversation_type AS ENUM ('direct', 'group', 'channel', 'announcement');

-- Estados de presencia de usuarios
CREATE TYPE user_presence_status AS ENUM ('online', 'away', 'busy', 'offline', 'invisible');

-- Tipos de mensajes
CREATE TYPE chat_message_type AS ENUM ('text', 'voice', 'file', 'image', 'system');

-- Niveles de permisos en chat
CREATE TYPE chat_permission_level AS ENUM ('read', 'write', 'moderate', 'admin');

-- Estados de notificación
CREATE TYPE notification_frequency AS ENUM ('all', 'mentions', 'none', 'scheduled');

-- ============================================================================
-- TABLA: chat_conversations
-- ============================================================================
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  conversation_type chat_conversation_type NOT NULL DEFAULT 'direct',
  name TEXT, -- Nombre del grupo/canal (null para conversaciones directas)
  description TEXT, -- Descripción para grupos/canales
  avatar_url TEXT, -- Avatar del grupo/canal
  is_private BOOLEAN NOT NULL DEFAULT true, -- Si es privado o público
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Configuración específica por tipo
  auto_delete_after_days INTEGER, -- Auto-eliminación de mensajes
  max_participants INTEGER DEFAULT 100, -- Límite de participantes
  allow_external_users BOOLEAN DEFAULT false, -- Permitir usuarios externos
  
  -- Metadatos adicionales
  metadata JSONB DEFAULT '{}',
  
  CONSTRAINT check_conversation_name CHECK (
    (conversation_type = 'direct' AND name IS NULL) OR 
    (conversation_type IN ('group', 'channel', 'announcement') AND name IS NOT NULL)
  )
);

-- ============================================================================
-- TABLA: chat_participants
-- ============================================================================
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level chat_permission_level NOT NULL DEFAULT 'write',
  
  -- Estado del participante
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps importantes
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  
  -- Configuración de notificaciones específica
  notification_frequency notification_frequency DEFAULT 'all',
  
  -- Metadatos del participante
  custom_nickname TEXT, -- Nombre personalizado en el grupo
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(conversation_id, user_id)
);

-- ============================================================================
-- TABLA: chat_messages
-- ============================================================================
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Contenido del mensaje
  message_type chat_message_type NOT NULL DEFAULT 'text',
  content TEXT, -- Contenido de texto
  
  -- Archivos y multimedia
  file_url TEXT, -- URL del archivo
  file_name TEXT, -- Nombre original del archivo
  file_size BIGINT, -- Tamaño en bytes
  file_type TEXT, -- MIME type
  
  -- Mensajes de voz
  voice_duration_ms INTEGER, -- Duración en milisegundos
  voice_transcription TEXT, -- Transcripción automática
  
  -- Threading y respuestas
  parent_message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  thread_count INTEGER DEFAULT 0, -- Número de respuestas
  
  -- Estado y metadatos
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  is_system_message BOOLEAN DEFAULT false,
  
  -- Reacciones y menciones
  reactions JSONB DEFAULT '{}', -- {emoji: [user_ids]}
  mentions JSONB DEFAULT '[]', -- [user_ids] mencionados
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadatos adicionales
  metadata JSONB DEFAULT '{}',
  
  -- Índices para búsqueda
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', COALESCE(content, '') || ' ' || COALESCE(voice_transcription, ''))
  ) STORED
);

-- ============================================================================
-- TABLA: user_contact_permissions
-- ============================================================================
CREATE TABLE public.user_contact_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  
  -- Configuración de contacto
  allow_direct_messages BOOLEAN NOT NULL DEFAULT true,
  allow_group_invitations BOOLEAN NOT NULL DEFAULT true,
  allow_channel_mentions BOOLEAN NOT NULL DEFAULT true,
  
  -- Listas de usuarios
  blocked_users JSONB DEFAULT '[]', -- [user_ids] bloqueados
  favorite_contacts JSONB DEFAULT '[]', -- [user_ids] favoritos
  
  -- Configuración de privacidad
  show_online_status BOOLEAN NOT NULL DEFAULT true,
  show_last_seen BOOLEAN NOT NULL DEFAULT true,
  auto_accept_invites BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, dealer_id)
);

-- ============================================================================
-- TABLA: user_presence
-- ============================================================================
CREATE TABLE public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  
  -- Estado de presencia
  status user_presence_status NOT NULL DEFAULT 'offline',
  custom_status TEXT, -- Estado personalizado
  status_emoji TEXT, -- Emoji del estado
  
  -- Timestamps de actividad
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Información de sesión
  is_mobile BOOLEAN DEFAULT false,
  user_agent TEXT,
  ip_address INET,
  
  -- Auto-away configuration
  auto_away_minutes INTEGER DEFAULT 15,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, dealer_id)
);

-- ============================================================================
-- TABLA: chat_notification_settings
-- ============================================================================
CREATE TABLE public.chat_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  
  -- Configuración global de notificaciones
  enable_push_notifications BOOLEAN NOT NULL DEFAULT true,
  enable_desktop_notifications BOOLEAN NOT NULL DEFAULT true,
  enable_email_notifications BOOLEAN NOT NULL DEFAULT false,
  
  -- Configuración por tipo
  direct_message_notifications notification_frequency DEFAULT 'all',
  group_message_notifications notification_frequency DEFAULT 'mentions',
  channel_message_notifications notification_frequency DEFAULT 'mentions',
  
  -- Configuración de horarios (Do Not Disturb)
  quiet_hours_start TIME, -- Ejemplo: '22:00:00'
  quiet_hours_end TIME,   -- Ejemplo: '08:00:00'
  quiet_days JSONB DEFAULT '[]', -- [0,6] para weekends
  
  -- Configuración de sonidos
  enable_message_sounds BOOLEAN NOT NULL DEFAULT true,
  enable_mention_sounds BOOLEAN NOT NULL DEFAULT true,
  custom_sound_url TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, dealer_id)
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

-- Índices para chat_conversations
CREATE INDEX idx_chat_conversations_dealer_id ON public.chat_conversations(dealer_id);
CREATE INDEX idx_chat_conversations_type ON public.chat_conversations(conversation_type);
CREATE INDEX idx_chat_conversations_last_message ON public.chat_conversations(last_message_at DESC);
CREATE INDEX idx_chat_conversations_created_by ON public.chat_conversations(created_by);

-- Índices para chat_participants
CREATE INDEX idx_chat_participants_conversation ON public.chat_participants(conversation_id);
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id);
CREATE INDEX idx_chat_participants_active ON public.chat_participants(conversation_id, is_active);
CREATE INDEX idx_chat_participants_last_read ON public.chat_participants(last_read_at);

-- Índices para chat_messages
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_parent ON public.chat_messages(parent_message_id);
CREATE INDEX idx_chat_messages_type ON public.chat_messages(message_type);
CREATE INDEX idx_chat_messages_search ON public.chat_messages USING GIN(search_vector);
CREATE INDEX idx_chat_messages_mentions ON public.chat_messages USING GIN(mentions);
CREATE INDEX idx_chat_messages_not_deleted ON public.chat_messages(conversation_id, created_at) WHERE is_deleted = false;

-- Índices para user_presence
CREATE INDEX idx_user_presence_dealer ON public.user_presence(dealer_id);
CREATE INDEX idx_user_presence_status ON public.user_presence(status);
CREATE INDEX idx_user_presence_last_seen ON public.user_presence(last_seen_at DESC);
CREATE INDEX idx_user_presence_active ON public.user_presence(dealer_id, status) WHERE status != 'offline';

-- ============================================================================
-- TRIGGERS PARA TIMESTAMPS AUTOMÁTICOS
-- ============================================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_chat_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas
CREATE TRIGGER update_chat_conversations_updated_at
    BEFORE UPDATE ON public.chat_conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_chat_updated_at_column();

CREATE TRIGGER update_chat_participants_updated_at
    BEFORE UPDATE ON public.chat_participants
    FOR EACH ROW EXECUTE FUNCTION public.update_chat_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.update_chat_updated_at_column();

CREATE TRIGGER update_user_contact_permissions_updated_at
    BEFORE UPDATE ON public.user_contact_permissions
    FOR EACH ROW EXECUTE FUNCTION public.update_chat_updated_at_column();

CREATE TRIGGER update_user_presence_updated_at
    BEFORE UPDATE ON public.user_presence
    FOR EACH ROW EXECUTE FUNCTION public.update_chat_updated_at_column();

CREATE TRIGGER update_chat_notification_settings_updated_at
    BEFORE UPDATE ON public.chat_notification_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_chat_updated_at_column();

-- ============================================================================
-- TRIGGER PARA THREAD COUNT
-- ============================================================================

-- Función para actualizar el contador de threads
CREATE OR REPLACE FUNCTION public.update_thread_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_message_id IS NOT NULL THEN
    UPDATE public.chat_messages 
    SET thread_count = thread_count + 1 
    WHERE id = NEW.parent_message_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_message_id IS NOT NULL THEN
    UPDATE public.chat_messages 
    SET thread_count = thread_count - 1 
    WHERE id = OLD.parent_message_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_message_thread_count
    AFTER INSERT OR DELETE ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.update_thread_count();

-- ============================================================================
-- TRIGGER PARA ACTUALIZAR LAST_MESSAGE_AT
-- ============================================================================

-- Función para actualizar last_message_at en conversaciones
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.chat_conversations 
    SET last_message_at = NEW.created_at 
    WHERE id = NEW.conversation_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_last_message_trigger
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- ============================================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================================

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_contact_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_notification_settings ENABLE ROW LEVEL SECURITY;