#!/usr/bin/env node

/**
 * Translation Keys Generator
 * Generates the missing translation keys based on the fixes we've applied
 */

const fs = require('fs');
const path = require('path');

const translationKeys = {
  // Common status messages
  common: {
    status: {
      online: 'Online',
      offline: 'Offline',
      active: 'Active',
      inactive: 'Inactive',
      pending: 'Pending',
      in_progress: 'In Progress',
      complete: 'Complete',
      completed: 'Completed',
      cancelled: 'Cancelled',
      failed: 'Failed',
      success: 'Success',
      error: 'Error',
      warning: 'Warning',
      info: 'Info',
      enabled: 'Enabled',
      disabled: 'Disabled',
      available: 'Available',
      unavailable: 'Unavailable',
      connected: 'Connected',
      disconnected: 'Disconnected',
      loading: 'Loading'
    },
    actions: {
      save: 'Save',
      edit: 'Edit',
      delete: 'Delete',
      cancel: 'Cancel',
      create: 'Create',
      update: 'Update',
      submit: 'Submit',
      continue: 'Continue',
      back: 'Back',
      next: 'Next',
      finish: 'Finish',
      close: 'Close',
      open: 'Open',
      add: 'Add',
      remove: 'Remove',
      clear: 'Clear',
      reset: 'Reset',
      search: 'Search',
      filter: 'Filter',
      sort: 'Sort',
      export: 'Export',
      import: 'Import',
      download: 'Download',
      upload: 'Upload',
      print: 'Print',
      refresh: 'Refresh',
      reload: 'Reload',
      copy: 'Copy',
      paste: 'Paste',
      cut: 'Cut',
      undo: 'Undo',
      redo: 'Redo'
    },
    unknown_error: 'Unknown error',
    toggle_theme: 'Toggle theme'
  },

  // Cloud sync specific translations
  cloud_sync: {
    title: 'Cloud Sync Dashboard',
    online: 'Online',
    offline: 'Offline',
    force_sync_all: 'Force Sync All',
    total_items: 'Total Items',
    synced: 'Synced',
    pending: 'Pending',
    errors: 'Errors',
    sync_progress: 'Sync Progress',
    overall_sync_status: 'Overall Sync Status',
    complete: 'Complete',
    session_recovery: 'Session Recovery',
    recovery_available: 'Recovery Available',
    session_backup_found: 'Session backup found in cloud',
    no_recovery_data: 'No recovery data available',
    available: 'Available',
    none: 'None',
    recovering: 'Recovering...',
    restore_session: 'Restore Session',
    create_snapshot: 'Create Snapshot',
    storage_information: 'Storage Information',
    total_keys: 'Total Keys',
    storage_size: 'Storage Size',
    clear_cache: 'Clear Cache',
    sync_settings: 'Sync Settings',
    automatic_sync: 'Automatic Sync',
    automatic_sync_description: 'Automatically sync changes to cloud',
    sync_status_details: 'Sync Status Details',
    all_data_synced_successfully: 'All data synced successfully',
    sync_failed: 'Sync failed',
    cache_cleared_successfully: 'Cache cleared successfully',
    failed_to_clear_cache: 'Failed to clear cache',
    session_snapshot_created: 'Session snapshot created',
    failed_to_create_snapshot: 'Failed to create snapshot',
    snapshot_creation_failed: 'Snapshot creation failed'
  },

  // Message translations
  messages: {
    success: {
      saved: 'Successfully saved',
      updated: 'Successfully updated',
      deleted: 'Successfully deleted',
      created: 'Successfully created',
      uploaded: 'Successfully uploaded',
      downloaded: 'Successfully downloaded',
      operation_completed: 'Operation completed successfully',
      changes_saved: 'Changes saved successfully'
    },
    error: {
      something_went_wrong: 'Something went wrong',
      please_try_again: 'Please try again',
      operation_failed: 'Operation failed',
      network_error: 'Network error',
      server_error: 'Server error',
      invalid_request: 'Invalid request',
      access_denied: 'Access denied',
      not_found: 'Not found',
      forbidden: 'Forbidden',
      unauthorized: 'Unauthorized',
      session_expired: 'Session expired',
      connection_failed: 'Connection failed',
      timeout: 'Timeout error',
      fix_validation_errors: 'Please fix the validation errors'
    },
    info: {
      loading: 'Loading...',
      no_data: 'No data available',
      processing: 'Processing...'
    },
    descriptions: {
      network_error: 'Check your internet connection and try again',
      server_error: 'Our servers are experiencing issues. Please try again later.'
    }
  },

  // Form related translations
  forms: {
    labels: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      city: 'City',
      state: 'State',
      country: 'Country',
      zip_code: 'Zip Code',
      postal_code: 'Postal Code',
      date: 'Date',
      time: 'Time',
      description: 'Description',
      notes: 'Notes',
      comments: 'Comments',
      message: 'Message',
      subject: 'Subject',
      title: 'Title',
      category: 'Category',
      type: 'Type',
      status: 'Status',
      priority: 'Priority',
      tags: 'Tags',
      password: 'Password',
      confirm_password: 'Confirm Password',
      username: 'Username',
      first_name: 'First Name',
      last_name: 'Last Name',
      full_name: 'Full Name',
      company: 'Company',
      organization: 'Organization',
      department: 'Department',
      position: 'Position',
      role: 'Role'
    },
    placeholders: {
      enter_name: 'Enter name',
      enter_email: 'Enter email address',
      enter_phone: 'Enter phone number',
      select_option: 'Select an option',
      search_placeholder: 'Search...',
      type_message: 'Type your message...'
    }
  },

  // Navigation and UI
  navigation: {
    dashboard: 'Dashboard',
    settings: 'Settings',
    profile: 'Profile',
    account: 'Account',
    home: 'Home',
    about: 'About',
    contact: 'Contact',
    help: 'Help',
    support: 'Support',
    documentation: 'Documentation',
    faq: 'FAQ',
    terms: 'Terms',
    privacy: 'Privacy',
    legal: 'Legal'
  },

  // UI elements
  ui: {
    headers: {
      welcome: 'Welcome',
      overview: 'Overview',
      details: 'Details',
      settings: 'Settings',
      advanced: 'Advanced',
      summary: 'Summary'
    },
    buttons: {
      get_started: 'Get Started',
      learn_more: 'Learn More',
      try_again: 'Try Again',
      go_back: 'Go Back',
      view_details: 'View Details',
      show_more: 'Show More',
      show_less: 'Show Less'
    }
  },

  // Time and date
  time: {
    today: 'Today',
    yesterday: 'Yesterday',
    tomorrow: 'Tomorrow',
    this_week: 'This Week',
    last_week: 'Last Week',
    next_week: 'Next Week',
    this_month: 'This Month',
    last_month: 'Last Month',
    next_month: 'Next Month',
    this_year: 'This Year',
    last_year: 'Last Year',
    next_year: 'Next Year'
  },

  // Validation messages
  validation: {
    required: 'This field is required',
    email_invalid: 'Please enter a valid email',
    phone_invalid: 'Please enter a valid phone number',
    password_too_short: 'Password is too short',
    passwords_no_match: 'Passwords do not match',
    option_required: 'Please select an option',
    file_too_large: 'File size is too large',
    file_type_not_supported: 'File type not supported',
    max_length_exceeded: 'Maximum length exceeded',
    min_length_not_met: 'Minimum length not met'
  }
};

// Spanish translations
const spanishTranslations = {
  common: {
    status: {
      online: 'En línea',
      offline: 'Desconectado',
      active: 'Activo',
      inactive: 'Inactivo',
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      complete: 'Completo',
      completed: 'Completado',
      cancelled: 'Cancelado',
      failed: 'Fallido',
      success: 'Éxito',
      error: 'Error',
      warning: 'Advertencia',
      info: 'Información',
      enabled: 'Habilitado',
      disabled: 'Deshabilitado',
      available: 'Disponible',
      unavailable: 'No disponible',
      connected: 'Conectado',
      disconnected: 'Desconectado',
      loading: 'Cargando'
    },
    actions: {
      save: 'Guardar',
      edit: 'Editar',
      delete: 'Eliminar',
      cancel: 'Cancelar',
      create: 'Crear',
      update: 'Actualizar',
      submit: 'Enviar',
      continue: 'Continuar',
      back: 'Atrás',
      next: 'Siguiente',
      finish: 'Finalizar',
      close: 'Cerrar',
      open: 'Abrir',
      add: 'Añadir',
      remove: 'Quitar',
      clear: 'Limpiar',
      reset: 'Reiniciar',
      search: 'Buscar',
      filter: 'Filtrar',
      sort: 'Ordenar',
      export: 'Exportar',
      import: 'Importar',
      download: 'Descargar',
      upload: 'Subir',
      print: 'Imprimir',
      refresh: 'Actualizar',
      reload: 'Recargar',
      copy: 'Copiar',
      paste: 'Pegar',
      cut: 'Cortar',
      undo: 'Deshacer',
      redo: 'Rehacer'
    },
    unknown_error: 'Error desconocido',
    toggle_theme: 'Cambiar tema'
  },

  cloud_sync: {
    title: 'Panel de Sincronización en la Nube',
    online: 'En línea',
    offline: 'Desconectado',
    force_sync_all: 'Forzar Sincronización Total',
    total_items: 'Elementos Totales',
    synced: 'Sincronizado',
    pending: 'Pendiente',
    errors: 'Errores',
    sync_progress: 'Progreso de Sincronización',
    overall_sync_status: 'Estado General de Sincronización',
    complete: 'Completo',
    session_recovery: 'Recuperación de Sesión',
    recovery_available: 'Recuperación Disponible',
    session_backup_found: 'Copia de seguridad de sesión encontrada en la nube',
    no_recovery_data: 'No hay datos de recuperación disponibles',
    available: 'Disponible',
    none: 'Ninguno',
    recovering: 'Recuperando...',
    restore_session: 'Restaurar Sesión',
    create_snapshot: 'Crear Instantánea',
    storage_information: 'Información de Almacenamiento',
    total_keys: 'Claves Totales',
    storage_size: 'Tamaño de Almacenamiento',
    clear_cache: 'Limpiar Caché',
    sync_settings: 'Configuración de Sincronización',
    automatic_sync: 'Sincronización Automática',
    automatic_sync_description: 'Sincronizar cambios automáticamente en la nube',
    sync_status_details: 'Detalles del Estado de Sincronización',
    all_data_synced_successfully: 'Todos los datos sincronizados exitosamente',
    sync_failed: 'La sincronización falló',
    cache_cleared_successfully: 'Caché limpiado exitosamente',
    failed_to_clear_cache: 'Error al limpiar el caché',
    session_snapshot_created: 'Instantánea de sesión creada',
    failed_to_create_snapshot: 'Error al crear la instantánea',
    snapshot_creation_failed: 'La creación de instantánea falló'
  },

  messages: {
    success: {
      saved: 'Guardado exitosamente',
      updated: 'Actualizado exitosamente',
      deleted: 'Eliminado exitosamente',
      created: 'Creado exitosamente',
      uploaded: 'Subido exitosamente',
      downloaded: 'Descargado exitosamente',
      operation_completed: 'Operación completada exitosamente',
      changes_saved: 'Cambios guardados exitosamente'
    },
    error: {
      something_went_wrong: 'Algo salió mal',
      please_try_again: 'Por favor intenta de nuevo',
      operation_failed: 'La operación falló',
      network_error: 'Error de red',
      server_error: 'Error del servidor',
      invalid_request: 'Solicitud inválida',
      access_denied: 'Acceso denegado',
      not_found: 'No encontrado',
      forbidden: 'Prohibido',
      unauthorized: 'No autorizado',
      session_expired: 'Sesión expirada',
      connection_failed: 'Conexión fallida',
      timeout: 'Error de tiempo de espera',
      fix_validation_errors: 'Por favor corrige los errores de validación'
    },
    info: {
      loading: 'Cargando...',
      no_data: 'No hay datos disponibles',
      processing: 'Procesando...'
    }
  }
};

// Portuguese (Brazilian) translations
const portugueseTranslations = {
  common: {
    status: {
      online: 'Online',
      offline: 'Offline',
      active: 'Ativo',
      inactive: 'Inativo',
      pending: 'Pendente',
      in_progress: 'Em Andamento',
      complete: 'Completo',
      completed: 'Concluído',
      cancelled: 'Cancelado',
      failed: 'Falhou',
      success: 'Sucesso',
      error: 'Erro',
      warning: 'Aviso',
      info: 'Informação',
      enabled: 'Habilitado',
      disabled: 'Desabilitado',
      available: 'Disponível',
      unavailable: 'Indisponível',
      connected: 'Conectado',
      disconnected: 'Desconectado',
      loading: 'Carregando'
    },
    actions: {
      save: 'Salvar',
      edit: 'Editar',
      delete: 'Excluir',
      cancel: 'Cancelar',
      create: 'Criar',
      update: 'Atualizar',
      submit: 'Enviar',
      continue: 'Continuar',
      back: 'Voltar',
      next: 'Próximo',
      finish: 'Finalizar',
      close: 'Fechar',
      open: 'Abrir',
      add: 'Adicionar',
      remove: 'Remover',
      clear: 'Limpar',
      reset: 'Redefinir',
      search: 'Pesquisar',
      filter: 'Filtrar',
      sort: 'Ordenar',
      export: 'Exportar',
      import: 'Importar',
      download: 'Baixar',
      upload: 'Enviar',
      print: 'Imprimir',
      refresh: 'Atualizar',
      reload: 'Recarregar',
      copy: 'Copiar',
      paste: 'Colar',
      cut: 'Recortar',
      undo: 'Desfazer',
      redo: 'Refazer'
    },
    unknown_error: 'Erro desconhecido',
    toggle_theme: 'Alternar tema'
  },

  cloud_sync: {
    title: 'Painel de Sincronização na Nuvem',
    online: 'Online',
    offline: 'Offline',
    force_sync_all: 'Forçar Sincronização Total',
    total_items: 'Itens Totais',
    synced: 'Sincronizado',
    pending: 'Pendente',
    errors: 'Erros',
    sync_progress: 'Progresso da Sincronização',
    overall_sync_status: 'Status Geral da Sincronização',
    complete: 'Completo',
    session_recovery: 'Recuperação de Sessão',
    recovery_available: 'Recuperação Disponível',
    session_backup_found: 'Backup da sessão encontrado na nuvem',
    no_recovery_data: 'Nenhum dado de recuperação disponível',
    available: 'Disponível',
    none: 'Nenhum',
    recovering: 'Recuperando...',
    restore_session: 'Restaurar Sessão',
    create_snapshot: 'Criar Snapshot',
    storage_information: 'Informações de Armazenamento',
    total_keys: 'Chaves Totais',
    storage_size: 'Tamanho do Armazenamento',
    clear_cache: 'Limpar Cache',
    sync_settings: 'Configurações de Sincronização',
    automatic_sync: 'Sincronização Automática',
    automatic_sync_description: 'Sincronizar alterações automaticamente na nuvem',
    sync_status_details: 'Detalhes do Status de Sincronização',
    all_data_synced_successfully: 'Todos os dados sincronizados com sucesso',
    sync_failed: 'A sincronização falhou',
    cache_cleared_successfully: 'Cache limpo com sucesso',
    failed_to_clear_cache: 'Falha ao limpar o cache',
    session_snapshot_created: 'Snapshot da sessão criado',
    failed_to_create_snapshot: 'Falha ao criar snapshot',
    snapshot_creation_failed: 'Criação de snapshot falhou'
  },

  messages: {
    success: {
      saved: 'Salvo com sucesso',
      updated: 'Atualizado com sucesso',
      deleted: 'Excluído com sucesso',
      created: 'Criado com sucesso',
      uploaded: 'Enviado com sucesso',
      downloaded: 'Baixado com sucesso',
      operation_completed: 'Operação concluída com sucesso',
      changes_saved: 'Alterações salvas com sucesso'
    },
    error: {
      something_went_wrong: 'Algo deu errado',
      please_try_again: 'Por favor, tente novamente',
      operation_failed: 'A operação falhou',
      network_error: 'Erro de rede',
      server_error: 'Erro do servidor',
      invalid_request: 'Solicitação inválida',
      access_denied: 'Acesso negado',
      not_found: 'Não encontrado',
      forbidden: 'Proibido',
      unauthorized: 'Não autorizado',
      session_expired: 'Sessão expirada',
      connection_failed: 'Conexão falhou',
      timeout: 'Erro de timeout',
      fix_validation_errors: 'Por favor, corrija os erros de validação'
    },
    info: {
      loading: 'Carregando...',
      no_data: 'Nenhum dado disponível',
      processing: 'Processando...'
    }
  }
};

// Generate the translation files
function generateTranslationFiles() {
  const outputDir = path.join(__dirname, '../public/translations');

  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write English translations
  fs.writeFileSync(
    path.join(outputDir, 'en.json'),
    JSON.stringify(translationKeys, null, 2),
    'utf8'
  );

  // Write Spanish translations
  fs.writeFileSync(
    path.join(outputDir, 'es.json'),
    JSON.stringify(spanishTranslations, null, 2),
    'utf8'
  );

  // Write Portuguese translations
  fs.writeFileSync(
    path.join(outputDir, 'pt-BR.json'),
    JSON.stringify(portugueseTranslations, null, 2),
    'utf8'
  );

  console.log('✅ Translation files generated successfully!');
  console.log(`📁 Files created in: ${outputDir}`);
  console.log('   ├── en.json (English)');
  console.log('   ├── es.json (Spanish)');
  console.log('   └── pt-BR.json (Portuguese - Brazil)');

  console.log('\n🎯 Next steps:');
  console.log('1. Review the generated translation files');
  console.log('2. Adjust any translations that need refinement');
  console.log('3. Test the application with different languages');
  console.log('4. Add any missing keys as you find them');
}

// Execute if run directly
if (require.main === module) {
  generateTranslationFiles();
}

module.exports = { translationKeys, spanishTranslations, portugueseTranslations };