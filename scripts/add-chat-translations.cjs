/**
 * Script para añadir traducciones del módulo Team Chat
 * Fase 1G: ConversationList, Permissions, Templates, Moderation, Channels, Threading, Messages, Emoji, Mentions
 */

const fs = require('fs');
const path = require('path');

// Nuevas traducciones organizadas por sección
const newTranslations = {
  en: {
    // FASE 1G: ConversationList
    no_messages_yet: "No messages yet",
    just_now: "Just now",
    minutes_ago: "{{count}} min ago",
    minutes_ago_plural: "{{count}} min ago",
    hours_ago: "{{count}}h ago",
    hours_ago_plural: "{{count}}h ago",
    days_ago: "{{count}}d ago",
    days_ago_plural: "{{count}}d ago",
    start_conversation_hint: "Start a new conversation to collaborate with your team",

    // Sistema de Permisos
    permissions: {
      restricted: "You can only send text messages",
      no_access: "You don't have access to this conversation",
      read_only: "Read-only access",
      banned: "You have been removed from this conversation",
      restricted_write: "Text messages only (no files or voice)",
      level_none: "No access",
      level_read: "View only",
      level_restricted_write: "Text only",
      level_write: "Full access",
      level_moderate: "Moderator",
      level_admin: "Administrator"
    },

    // Templates de Roles (Admin UI)
    templates: {
      title: "Chat Permission Templates",
      description: "Configure default chat permissions for each role in your dealership",
      role_name: "Role Name",
      permission_level: "Permission Level",
      capabilities: "Capabilities",
      conversation_types: "Can Create",
      actions: "Actions",
      edit_template: "Edit Template",
      save_changes: "Save Changes",
      cancel: "Cancel",
      messages_section: "Message Permissions",
      participants_section: "Participant Management",
      conversation_section: "Conversation Settings",
      send_text: "Send text messages",
      send_voice: "Send voice messages",
      send_files: "Send files and attachments",
      edit_own: "Edit own messages",
      delete_own: "Delete own messages",
      delete_others: "Delete others' messages",
      invite_users: "Invite users",
      remove_users: "Remove users",
      change_permissions: "Change permissions",
      update_settings: "Update conversation settings",
      archive: "Archive conversations",
      delete: "Delete conversations",
      create_direct: "Direct messages",
      create_group: "Group chats",
      create_channel: "Channels",
      create_announcement: "Announcements"
    },

    // Moderación
    moderation: {
      mute_user: "Mute User",
      unmute_user: "Unmute User",
      kick_user: "Remove from Conversation",
      ban_user: "Ban User",
      mute_duration: "Mute Duration",
      mute_1h: "1 hour",
      mute_24h: "24 hours",
      mute_7d: "7 days",
      mute_30d: "30 days",
      mute_permanent: "Permanent",
      reason: "Reason",
      confirm_mute: "Are you sure you want to mute {{userName}}?",
      confirm_kick: "Are you sure you want to remove {{userName}} from this conversation?",
      confirm_ban: "Are you sure you want to ban {{userName}}? They won't be able to rejoin.",
      muted_successfully: "User muted successfully",
      kicked_successfully: "User removed successfully",
      banned_successfully: "User banned successfully"
    },

    // Channels
    channels: {
      create_channel: "Create Channel",
      channel_name: "Channel Name",
      channel_description: "Description",
      channel_type: "Channel Type",
      public_channel: "Public Channel",
      private_channel: "Private Channel",
      public_description: "Anyone in the dealership can join",
      private_description: "Only invited members can join",
      join_channel: "Join Channel",
      leave_channel: "Leave Channel",
      members_count: "{{count}} members",
      members_count_plural: "{{count}} members",
      no_channels: "No channels available",
      create_first_channel: "Create the first channel to organize team communication"
    },

    // Threading
    threading: {
      view_thread: "View Thread",
      reply_in_thread: "Reply in thread",
      replies_count: "{{count}} replies",
      replies_count_plural: "{{count}} replies",
      reply_count_singular: "1 reply",
      back_to_conversation: "Back to conversation",
      thread_with: "Thread with {{userName}}",
      start_thread: "Start a thread",
      no_replies: "No replies yet"
    },

    // Mensajes (editar/eliminar) - Complementar existentes
    messages: {
      edit_message: "Edit Message",
      delete_message: "Delete Message",
      confirm_delete: "Are you sure you want to delete this message?",
      confirm_delete_description: "This action cannot be undone",
      message_edited: "Message edited successfully",
      edit_time_expired: "Messages can only be edited within 15 minutes"
    },

    // Emoji Picker
    emoji: {
      pick_reaction: "Pick a reaction",
      recent: "Recent",
      smileys: "Smileys & Emotion",
      people: "People & Body",
      animals: "Animals & Nature",
      food: "Food & Drink",
      travel: "Travel & Places",
      activities: "Activities",
      objects: "Objects",
      symbols: "Symbols",
      flags: "Flags",
      search: "Search emoji...",
      no_results: "No emoji found"
    },

    // Menciones
    mentions: {
      mention_someone: "Mention someone with @",
      searching: "Searching...",
      no_results: "No users found",
      all_members: "Notify all members"
    }
  },

  es: {
    // FASE 1G: ConversationList
    no_messages_yet: "Sin mensajes aún",
    just_now: "Justo ahora",
    minutes_ago: "hace {{count}} min",
    minutes_ago_plural: "hace {{count}} min",
    hours_ago: "hace {{count}}h",
    hours_ago_plural: "hace {{count}}h",
    days_ago: "hace {{count}}d",
    days_ago_plural: "hace {{count}}d",
    start_conversation_hint: "Inicia una nueva conversación para colaborar con tu equipo",

    // Sistema de Permisos
    permissions: {
      restricted: "Solo puedes enviar mensajes de texto",
      no_access: "No tienes acceso a esta conversación",
      read_only: "Acceso de solo lectura",
      banned: "Has sido eliminado de esta conversación",
      restricted_write: "Solo mensajes de texto (sin archivos ni voz)",
      level_none: "Sin acceso",
      level_read: "Solo lectura",
      level_restricted_write: "Solo texto",
      level_write: "Acceso completo",
      level_moderate: "Moderador",
      level_admin: "Administrador"
    },

    // Templates de Roles (Admin UI)
    templates: {
      title: "Plantillas de Permisos de Chat",
      description: "Configura los permisos predeterminados de chat para cada rol en tu concesionario",
      role_name: "Nombre del Rol",
      permission_level: "Nivel de Permiso",
      capabilities: "Capacidades",
      conversation_types: "Puede Crear",
      actions: "Acciones",
      edit_template: "Editar Plantilla",
      save_changes: "Guardar Cambios",
      cancel: "Cancelar",
      messages_section: "Permisos de Mensajes",
      participants_section: "Gestión de Participantes",
      conversation_section: "Configuración de Conversaciones",
      send_text: "Enviar mensajes de texto",
      send_voice: "Enviar mensajes de voz",
      send_files: "Enviar archivos y adjuntos",
      edit_own: "Editar mensajes propios",
      delete_own: "Eliminar mensajes propios",
      delete_others: "Eliminar mensajes de otros",
      invite_users: "Invitar usuarios",
      remove_users: "Eliminar usuarios",
      change_permissions: "Cambiar permisos",
      update_settings: "Actualizar configuración de conversación",
      archive: "Archivar conversaciones",
      delete: "Eliminar conversaciones",
      create_direct: "Mensajes directos",
      create_group: "Grupos de chat",
      create_channel: "Canales",
      create_announcement: "Anuncios"
    },

    // Moderación
    moderation: {
      mute_user: "Silenciar Usuario",
      unmute_user: "Desactivar Silencio",
      kick_user: "Eliminar de la Conversación",
      ban_user: "Banear Usuario",
      mute_duration: "Duración del Silencio",
      mute_1h: "1 hora",
      mute_24h: "24 horas",
      mute_7d: "7 días",
      mute_30d: "30 días",
      mute_permanent: "Permanente",
      reason: "Motivo",
      confirm_mute: "¿Estás seguro que deseas silenciar a {{userName}}?",
      confirm_kick: "¿Estás seguro que deseas eliminar a {{userName}} de esta conversación?",
      confirm_ban: "¿Estás seguro que deseas banear a {{userName}}? No podrá volver a unirse.",
      muted_successfully: "Usuario silenciado exitosamente",
      kicked_successfully: "Usuario eliminado exitosamente",
      banned_successfully: "Usuario baneado exitosamente"
    },

    // Channels
    channels: {
      create_channel: "Crear Canal",
      channel_name: "Nombre del Canal",
      channel_description: "Descripción",
      channel_type: "Tipo de Canal",
      public_channel: "Canal Público",
      private_channel: "Canal Privado",
      public_description: "Cualquiera en el concesionario puede unirse",
      private_description: "Solo miembros invitados pueden unirse",
      join_channel: "Unirse al Canal",
      leave_channel: "Salir del Canal",
      members_count: "{{count}} miembros",
      members_count_plural: "{{count}} miembros",
      no_channels: "No hay canales disponibles",
      create_first_channel: "Crea el primer canal para organizar la comunicación del equipo"
    },

    // Threading
    threading: {
      view_thread: "Ver Hilo",
      reply_in_thread: "Responder en hilo",
      replies_count: "{{count}} respuestas",
      replies_count_plural: "{{count}} respuestas",
      reply_count_singular: "1 respuesta",
      back_to_conversation: "Volver a la conversación",
      thread_with: "Hilo con {{userName}}",
      start_thread: "Iniciar un hilo",
      no_replies: "Sin respuestas aún"
    },

    // Mensajes (editar/eliminar) - Complementar existentes
    messages: {
      edit_message: "Editar Mensaje",
      delete_message: "Eliminar Mensaje",
      confirm_delete: "¿Estás seguro que deseas eliminar este mensaje?",
      confirm_delete_description: "Esta acción no se puede deshacer",
      message_edited: "Mensaje editado exitosamente",
      edit_time_expired: "Los mensajes solo se pueden editar dentro de los 15 minutos"
    },

    // Emoji Picker
    emoji: {
      pick_reaction: "Elige una reacción",
      recent: "Recientes",
      smileys: "Caritas y Emociones",
      people: "Personas y Cuerpo",
      animals: "Animales y Naturaleza",
      food: "Comida y Bebida",
      travel: "Viajes y Lugares",
      activities: "Actividades",
      objects: "Objetos",
      symbols: "Símbolos",
      flags: "Banderas",
      search: "Buscar emoji...",
      no_results: "No se encontraron emojis"
    },

    // Menciones
    mentions: {
      mention_someone: "Menciona a alguien con @",
      searching: "Buscando...",
      no_results: "No se encontraron usuarios",
      all_members: "Notificar a todos los miembros"
    }
  },

  "pt-BR": {
    // FASE 1G: ConversationList
    no_messages_yet: "Sem mensagens ainda",
    just_now: "Agora mesmo",
    minutes_ago: "{{count}} min atrás",
    minutes_ago_plural: "{{count}} min atrás",
    hours_ago: "{{count}}h atrás",
    hours_ago_plural: "{{count}}h atrás",
    days_ago: "{{count}}d atrás",
    days_ago_plural: "{{count}}d atrás",
    start_conversation_hint: "Inicie uma nova conversa para colaborar com sua equipe",

    // Sistema de Permisos
    permissions: {
      restricted: "Você só pode enviar mensagens de texto",
      no_access: "Você não tem acesso a esta conversa",
      read_only: "Acesso somente leitura",
      banned: "Você foi removido desta conversa",
      restricted_write: "Apenas mensagens de texto (sem arquivos ou voz)",
      level_none: "Sem acesso",
      level_read: "Apenas visualização",
      level_restricted_write: "Apenas texto",
      level_write: "Acesso completo",
      level_moderate: "Moderador",
      level_admin: "Administrador"
    },

    // Templates de Roles (Admin UI)
    templates: {
      title: "Modelos de Permissões de Chat",
      description: "Configure as permissões padrão de chat para cada função na sua concessionária",
      role_name: "Nome da Função",
      permission_level: "Nível de Permissão",
      capabilities: "Capacidades",
      conversation_types: "Pode Criar",
      actions: "Ações",
      edit_template: "Editar Modelo",
      save_changes: "Salvar Alterações",
      cancel: "Cancelar",
      messages_section: "Permissões de Mensagens",
      participants_section: "Gerenciamento de Participantes",
      conversation_section: "Configurações de Conversa",
      send_text: "Enviar mensagens de texto",
      send_voice: "Enviar mensagens de voz",
      send_files: "Enviar arquivos e anexos",
      edit_own: "Editar mensagens próprias",
      delete_own: "Excluir mensagens próprias",
      delete_others: "Excluir mensagens de outros",
      invite_users: "Convidar usuários",
      remove_users: "Remover usuários",
      change_permissions: "Alterar permissões",
      update_settings: "Atualizar configurações da conversa",
      archive: "Arquivar conversas",
      delete: "Excluir conversas",
      create_direct: "Mensagens diretas",
      create_group: "Grupos de chat",
      create_channel: "Canais",
      create_announcement: "Anúncios"
    },

    // Moderación
    moderation: {
      mute_user: "Silenciar Usuário",
      unmute_user: "Desativar Silêncio",
      kick_user: "Remover da Conversa",
      ban_user: "Banir Usuário",
      mute_duration: "Duração do Silêncio",
      mute_1h: "1 hora",
      mute_24h: "24 horas",
      mute_7d: "7 dias",
      mute_30d: "30 dias",
      mute_permanent: "Permanente",
      reason: "Motivo",
      confirm_mute: "Tem certeza que deseja silenciar {{userName}}?",
      confirm_kick: "Tem certeza que deseja remover {{userName}} desta conversa?",
      confirm_ban: "Tem certeza que deseja banir {{userName}}? Eles não poderão entrar novamente.",
      muted_successfully: "Usuário silenciado com sucesso",
      kicked_successfully: "Usuário removido com sucesso",
      banned_successfully: "Usuário banido com sucesso"
    },

    // Channels
    channels: {
      create_channel: "Criar Canal",
      channel_name: "Nome do Canal",
      channel_description: "Descrição",
      channel_type: "Tipo de Canal",
      public_channel: "Canal Público",
      private_channel: "Canal Privado",
      public_description: "Qualquer pessoa na concessionária pode participar",
      private_description: "Apenas membros convidados podem participar",
      join_channel: "Entrar no Canal",
      leave_channel: "Sair do Canal",
      members_count: "{{count}} membros",
      members_count_plural: "{{count}} membros",
      no_channels: "Nenhum canal disponível",
      create_first_channel: "Crie o primeiro canal para organizar a comunicação da equipe"
    },

    // Threading
    threading: {
      view_thread: "Ver Thread",
      reply_in_thread: "Responder na thread",
      replies_count: "{{count}} respostas",
      replies_count_plural: "{{count}} respostas",
      reply_count_singular: "1 resposta",
      back_to_conversation: "Voltar à conversa",
      thread_with: "Thread com {{userName}}",
      start_thread: "Iniciar uma thread",
      no_replies: "Sem respostas ainda"
    },

    // Mensajes (editar/eliminar) - Complementar existentes
    messages: {
      edit_message: "Editar Mensagem",
      delete_message: "Excluir Mensagem",
      confirm_delete: "Tem certeza que deseja excluir esta mensagem?",
      confirm_delete_description: "Esta ação não pode ser desfeita",
      message_edited: "Mensagem editada com sucesso",
      edit_time_expired: "Mensagens só podem ser editadas dentro de 15 minutos"
    },

    // Emoji Picker
    emoji: {
      pick_reaction: "Escolha uma reação",
      recent: "Recentes",
      smileys: "Rostos e Emoções",
      people: "Pessoas e Corpo",
      animals: "Animais e Natureza",
      food: "Comida e Bebida",
      travel: "Viagens e Lugares",
      activities: "Atividades",
      objects: "Objetos",
      symbols: "Símbolos",
      flags: "Bandeiras",
      search: "Buscar emoji...",
      no_results: "Nenhum emoji encontrado"
    },

    // Menciones
    mentions: {
      mention_someone: "Mencione alguém com @",
      searching: "Buscando...",
      no_results: "Nenhum usuário encontrado",
      all_members: "Notificar todos os membros"
    }
  }
};

// Función para hacer merge profundo de objetos
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

// Función principal para actualizar archivos
function updateTranslationFile(language) {
  const filePath = path.join(__dirname, '..', 'public', 'translations', `${language}.json`);

  try {
    // Leer archivo existente
    const existingContent = fs.readFileSync(filePath, 'utf8');
    const existingData = JSON.parse(existingContent);

    // Guardar claves existentes de chat
    const existingChatKeys = Object.keys(existingData.chat || {});

    // Hacer merge de las nuevas traducciones con las existentes
    existingData.chat = deepMerge(existingData.chat || {}, newTranslations[language]);

    // Escribir archivo actualizado con formato consistente (2 espacios)
    fs.writeFileSync(
      filePath,
      JSON.stringify(existingData, null, 2) + '\n',
      'utf8'
    );

    // Calcular nuevas claves añadidas
    const newChatKeys = Object.keys(existingData.chat);
    const addedKeysCount = newChatKeys.length - existingChatKeys.length;

    console.log(`✅ ${language}.json actualizado exitosamente`);
    console.log(`   - Claves existentes preservadas: ${existingChatKeys.length}`);
    console.log(`   - Nuevas claves añadidas: ${addedKeysCount}`);
    console.log(`   - Total de claves en chat: ${newChatKeys.length}\n`);

    return {
      language,
      existingKeys: existingChatKeys.length,
      addedKeys: addedKeysCount,
      totalKeys: newChatKeys.length
    };
  } catch (error) {
    console.error(`❌ Error actualizando ${language}.json:`, error.message);
    throw error;
  }
}

// Ejecutar actualización para los 3 idiomas
console.log('🌍 Iniciando actualización de traducciones del módulo Team Chat...\n');

const results = [];
const languages = ['en', 'es', 'pt-BR'];

for (const language of languages) {
  results.push(updateTranslationFile(language));
}

console.log('═══════════════════════════════════════════════════════════');
console.log('📊 RESUMEN DE ACTUALIZACIÓN');
console.log('═══════════════════════════════════════════════════════════\n');

results.forEach(result => {
  console.log(`${result.language.toUpperCase()}:`);
  console.log(`  Claves preservadas: ${result.existingKeys}`);
  console.log(`  Nuevas claves: ${result.addedKeys}`);
  console.log(`  Total: ${result.totalKeys}\n`);
});

console.log('═══════════════════════════════════════════════════════════');
console.log('✨ Todas las traducciones del Team Chat han sido añadidas exitosamente');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📝 Nuevas secciones añadidas:');
console.log('  ✓ ConversationList (FASE 1G)');
console.log('  ✓ Sistema de Permisos');
console.log('  ✓ Templates de Roles (Admin UI)');
console.log('  ✓ Moderación');
console.log('  ✓ Channels');
console.log('  ✓ Threading');
console.log('  ✓ Messages (complementado)');
console.log('  ✓ Emoji Picker');
console.log('  ✓ Menciones\n');
