-- ============================================================================
-- RLS POLICIES PARA MÓDULO DE CHAT INDEPENDIENTE
-- ============================================================================

-- ============================================================================
-- POLÍTICAS PARA chat_conversations
-- ============================================================================

-- Usuarios pueden ver conversaciones donde son participantes
CREATE POLICY "Users can view conversations they participate in"
ON public.chat_conversations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = id 
    AND cp.user_id = auth.uid()
    AND cp.is_active = true
  )
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM public.dealer_memberships dm
    WHERE dm.user_id = auth.uid()
    AND dm.dealer_id = chat_conversations.dealer_id
    AND dm.is_active = true
    AND user_has_group_permission(auth.uid(), dealer_id, 'chat.moderate')
  )
);

-- Usuarios pueden crear conversaciones en su dealer
CREATE POLICY "Users can create conversations in their dealer"
ON public.chat_conversations
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin()
  OR (
    EXISTS (
      SELECT 1 FROM public.dealer_memberships dm
      WHERE dm.user_id = auth.uid()
      AND dm.dealer_id = dealer_id
      AND dm.is_active = true
    )
    AND user_has_group_permission(auth.uid(), dealer_id, 'chat.create')
  )
);

-- Usuarios pueden actualizar conversaciones donde son moderadores o admins
CREATE POLICY "Users can update conversations they moderate"
ON public.chat_conversations
FOR UPDATE
TO authenticated
USING (
  is_admin()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = id 
    AND cp.user_id = auth.uid()
    AND cp.permission_level IN ('moderate', 'admin')
    AND cp.is_active = true
  )
);

-- Solo admins y creadores pueden eliminar conversaciones
CREATE POLICY "Admins and creators can delete conversations"
ON public.chat_conversations
FOR DELETE
TO authenticated
USING (
  is_admin()
  OR created_by = auth.uid()
);

-- ============================================================================
-- POLÍTICAS PARA chat_participants
-- ============================================================================

-- Usuarios pueden ver participantes de conversaciones donde participan
CREATE POLICY "Users can view participants in their conversations"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp2
    WHERE cp2.conversation_id = conversation_id
    AND cp2.user_id = auth.uid()
    AND cp2.is_active = true
  )
  OR is_admin()
);

-- Moderadores pueden agregar participantes
CREATE POLICY "Moderators can add participants"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = conversation_id
    AND cp.user_id = auth.uid()
    AND cp.permission_level IN ('moderate', 'admin')
    AND cp.is_active = true
  )
);

-- Usuarios pueden actualizar su propio estado, moderadores pueden actualizar otros
CREATE POLICY "Users can update own status, moderators can update others"
ON public.chat_participants
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = conversation_id
    AND cp.user_id = auth.uid()
    AND cp.permission_level IN ('moderate', 'admin')
    AND cp.is_active = true
  )
);

-- Usuarios pueden salirse, moderadores pueden remover otros
CREATE POLICY "Users can leave, moderators can remove others"
ON public.chat_participants
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = conversation_id
    AND cp.user_id = auth.uid()
    AND cp.permission_level IN ('moderate', 'admin')
    AND cp.is_active = true
  )
);

-- ============================================================================
-- POLÍTICAS PARA chat_messages
-- ============================================================================

-- Usuarios pueden ver mensajes de conversaciones donde participan
CREATE POLICY "Users can view messages in their conversations"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = conversation_id
    AND cp.user_id = auth.uid()
    AND cp.is_active = true
  )
  OR is_admin()
);

-- Usuarios con permisos de escritura pueden crear mensajes
CREATE POLICY "Users with write permission can send messages"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.conversation_id = conversation_id
      AND cp.user_id = auth.uid()
      AND cp.permission_level IN ('write', 'moderate', 'admin')
      AND cp.is_active = true
    )
  )
);

-- Usuarios pueden editar sus propios mensajes
CREATE POLICY "Users can edit their own messages"
ON public.chat_messages
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = conversation_id
    AND cp.user_id = auth.uid()
    AND cp.permission_level IN ('moderate', 'admin')
    AND cp.is_active = true
  )
);

-- Usuarios pueden eliminar sus propios mensajes, moderadores pueden eliminar otros
CREATE POLICY "Users can delete own messages, moderators can delete others"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = conversation_id
    AND cp.user_id = auth.uid()
    AND cp.permission_level IN ('moderate', 'admin')
    AND cp.is_active = true
  )
);

-- ============================================================================
-- POLÍTICAS PARA user_contact_permissions
-- ============================================================================

-- Usuarios pueden ver y gestionar sus propias configuraciones de contacto
CREATE POLICY "Users can manage their own contact permissions"
ON public.user_contact_permissions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins pueden ver todas las configuraciones
CREATE POLICY "Admins can view all contact permissions"
ON public.user_contact_permissions
FOR SELECT
TO authenticated
USING (is_admin());

-- ============================================================================
-- POLÍTICAS PARA user_presence
-- ============================================================================

-- Usuarios pueden ver presencia de otros en el mismo dealer
CREATE POLICY "Users can view presence in their dealer"
ON public.user_presence
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM public.dealer_memberships dm1, public.dealer_memberships dm2
    WHERE dm1.user_id = auth.uid()
    AND dm2.user_id = user_presence.user_id
    AND dm1.dealer_id = dm2.dealer_id
    AND dm1.is_active = true
    AND dm2.is_active = true
  )
);

-- Usuarios pueden actualizar solo su propia presencia
CREATE POLICY "Users can update their own presence"
ON public.user_presence
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- POLÍTICAS PARA chat_notification_settings
-- ============================================================================

-- Usuarios pueden gestionar solo sus propias configuraciones de notificaciones
CREATE POLICY "Users can manage their own notification settings"
ON public.chat_notification_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins pueden ver todas las configuraciones de notificaciones
CREATE POLICY "Admins can view all notification settings"
ON public.chat_notification_settings
FOR SELECT
TO authenticated
USING (is_admin());

-- ============================================================================
-- FIX SEARCH PATH EN FUNCIONES EXISTENTES
-- ============================================================================

-- Actualizar funciones para incluir search_path
ALTER FUNCTION public.update_chat_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_thread_count() SET search_path = public;
ALTER FUNCTION public.update_conversation_last_message() SET search_path = public;