# Team Chat - Traducciones Añadidas (FASE 1G)

## Resumen de Actualización

**Fecha:** 2025-10-24
**Módulo:** Team Chat (MyDetailArea)
**Idiomas:** English (en), Spanish (es), Portuguese Brazil (pt-BR)

### Estadísticas

- **Total de keys de traducción en `chat`:** 220 keys por idioma
- **Keys existentes preservadas:** 108 keys
- **Nuevas keys añadidas:** 112 keys
- **Archivos actualizados:**
  - `public/translations/en.json`
  - `public/translations/es.json`
  - `public/translations/pt-BR.json`

---

## 1. ConversationList (FASE 1G)

### Keys añadidas:

```typescript
// Timestamps relativos
chat.no_messages_yet          // "No messages yet" | "Sin mensajes aún" | "Sem mensagens ainda"
chat.just_now                 // "Just now" | "Justo ahora" | "Agora mesmo"
chat.minutes_ago              // "{{count}} min ago" | "hace {{count}} min" | "{{count}} min atrás"
chat.hours_ago                // "{{count}}h ago" | "hace {{count}}h" | "{{count}}h atrás"
chat.days_ago                 // "{{count}}d ago" | "hace {{count}}d" | "{{count}}d atrás"

// Estado vacío
chat.start_conversation_hint  // "Start a new conversation..." | "Inicia una nueva conversación..." | "Inicie uma nova conversa..."
```

### Ejemplo de uso:

```tsx
import { useTranslation } from 'react-i18next';

function ConversationTimestamp({ timestamp }: { timestamp: Date }) {
  const { t } = useTranslation();
  const now = Date.now();
  const diff = now - timestamp.getTime();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return <span>{t('chat.just_now')}</span>;
  if (minutes < 60) return <span>{t('chat.minutes_ago', { count: minutes })}</span>;
  if (hours < 24) return <span>{t('chat.hours_ago', { count: hours })}</span>;
  return <span>{t('chat.days_ago', { count: days })}</span>;
}

function EmptyConversationState() {
  const { t } = useTranslation();

  return (
    <div className="empty-state">
      <p>{t('chat.no_messages_yet')}</p>
      <p className="hint">{t('chat.start_conversation_hint')}</p>
    </div>
  );
}
```

---

## 2. Sistema de Permisos

### Keys añadidas:

```typescript
// Mensajes de restricción
chat.permissions.restricted             // "You can only send text messages"
chat.permissions.no_access             // "You don't have access to this conversation"
chat.permissions.read_only             // "Read-only access"
chat.permissions.banned                // "You have been removed from this conversation"
chat.permissions.restricted_write      // "Text messages only (no files or voice)"

// Niveles de permiso
chat.permissions.level_none            // "No access"
chat.permissions.level_read            // "View only"
chat.permissions.level_restricted_write // "Text only"
chat.permissions.level_write           // "Full access"
chat.permissions.level_moderate        // "Moderator"
chat.permissions.level_admin           // "Administrator"
```

### Ejemplo de uso:

```tsx
import { useTranslation } from 'react-i18next';

type PermissionLevel = 'none' | 'read' | 'restricted_write' | 'write' | 'moderate' | 'admin';

function PermissionBadge({ level }: { level: PermissionLevel }) {
  const { t } = useTranslation();

  const getLabelKey = () => {
    switch (level) {
      case 'none': return 'chat.permissions.level_none';
      case 'read': return 'chat.permissions.level_read';
      case 'restricted_write': return 'chat.permissions.level_restricted_write';
      case 'write': return 'chat.permissions.level_write';
      case 'moderate': return 'chat.permissions.level_moderate';
      case 'admin': return 'chat.permissions.level_admin';
    }
  };

  return (
    <Badge variant={level === 'admin' ? 'default' : 'secondary'}>
      {t(getLabelKey())}
    </Badge>
  );
}

function PermissionRestrictionMessage({ userPermission }: { userPermission: PermissionLevel }) {
  const { t } = useTranslation();

  if (userPermission === 'none') {
    return <Alert variant="destructive">{t('chat.permissions.no_access')}</Alert>;
  }

  if (userPermission === 'read') {
    return <Alert variant="warning">{t('chat.permissions.read_only')}</Alert>;
  }

  if (userPermission === 'restricted_write') {
    return <Alert variant="info">{t('chat.permissions.restricted_write')}</Alert>;
  }

  return null;
}
```

---

## 3. Templates de Roles (Admin UI)

### Keys añadidas:

```typescript
// Encabezados
chat.templates.title                  // "Chat Permission Templates"
chat.templates.description            // "Configure default chat permissions..."
chat.templates.role_name              // "Role Name"
chat.templates.permission_level       // "Permission Level"
chat.templates.capabilities           // "Capabilities"

// Secciones de permisos
chat.templates.messages_section       // "Message Permissions"
chat.templates.participants_section   // "Participant Management"
chat.templates.conversation_section   // "Conversation Settings"

// Permisos de mensajes
chat.templates.send_text              // "Send text messages"
chat.templates.send_voice             // "Send voice messages"
chat.templates.send_files             // "Send files and attachments"
chat.templates.edit_own               // "Edit own messages"
chat.templates.delete_own             // "Delete own messages"
chat.templates.delete_others          // "Delete others' messages"

// Gestión de participantes
chat.templates.invite_users           // "Invite users"
chat.templates.remove_users           // "Remove users"
chat.templates.change_permissions     // "Change permissions"

// Configuración de conversación
chat.templates.update_settings        // "Update conversation settings"
chat.templates.archive                // "Archive conversations"
chat.templates.delete                 // "Delete conversations"

// Tipos de conversación que puede crear
chat.templates.create_direct          // "Direct messages"
chat.templates.create_group           // "Group chats"
chat.templates.create_channel         // "Channels"
chat.templates.create_announcement    // "Announcements"
```

### Ejemplo de uso:

```tsx
import { useTranslation } from 'react-i18next';

interface PermissionTemplate {
  roleId: string;
  roleName: string;
  permissions: {
    sendText: boolean;
    sendVoice: boolean;
    sendFiles: boolean;
    editOwn: boolean;
    deleteOwn: boolean;
    deleteOthers: boolean;
    inviteUsers: boolean;
    removeUsers: boolean;
    changePermissions: boolean;
    updateSettings: boolean;
    archive: boolean;
    delete: boolean;
  };
  canCreate: {
    direct: boolean;
    group: boolean;
    channel: boolean;
    announcement: boolean;
  };
}

function PermissionTemplateEditor({ template }: { template: PermissionTemplate }) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('chat.templates.title')}</CardTitle>
        <CardDescription>{t('chat.templates.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Message Permissions Section */}
        <div className="space-y-4">
          <h3 className="font-semibold">{t('chat.templates.messages_section')}</h3>

          <Checkbox
            checked={template.permissions.sendText}
            label={t('chat.templates.send_text')}
          />
          <Checkbox
            checked={template.permissions.sendVoice}
            label={t('chat.templates.send_voice')}
          />
          <Checkbox
            checked={template.permissions.sendFiles}
            label={t('chat.templates.send_files')}
          />
          <Checkbox
            checked={template.permissions.editOwn}
            label={t('chat.templates.edit_own')}
          />
          <Checkbox
            checked={template.permissions.deleteOwn}
            label={t('chat.templates.delete_own')}
          />
        </div>

        {/* Participant Management Section */}
        <div className="space-y-4 mt-6">
          <h3 className="font-semibold">{t('chat.templates.participants_section')}</h3>

          <Checkbox
            checked={template.permissions.inviteUsers}
            label={t('chat.templates.invite_users')}
          />
          <Checkbox
            checked={template.permissions.removeUsers}
            label={t('chat.templates.remove_users')}
          />
        </div>

        {/* Conversation Types */}
        <div className="space-y-4 mt-6">
          <h3 className="font-semibold">{t('chat.templates.conversation_types')}</h3>

          <Checkbox
            checked={template.canCreate.direct}
            label={t('chat.templates.create_direct')}
          />
          <Checkbox
            checked={template.canCreate.group}
            label={t('chat.templates.create_group')}
          />
          <Checkbox
            checked={template.canCreate.channel}
            label={t('chat.templates.create_channel')}
          />
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## 4. Moderación

### Keys añadidas:

```typescript
// Acciones de moderación
chat.moderation.mute_user             // "Mute User" | "Silenciar Usuario" | "Silenciar Usuário"
chat.moderation.unmute_user           // "Unmute User" | "Desactivar Silencio" | "Desativar Silêncio"
chat.moderation.kick_user             // "Remove from Conversation" | "Eliminar de la Conversación"
chat.moderation.ban_user              // "Ban User" | "Banear Usuario" | "Banir Usuário"

// Duraciones
chat.moderation.mute_duration         // "Mute Duration"
chat.moderation.mute_1h               // "1 hour"
chat.moderation.mute_24h              // "24 hours"
chat.moderation.mute_7d               // "7 days"
chat.moderation.mute_30d              // "30 days"
chat.moderation.mute_permanent        // "Permanent"

// Confirmaciones
chat.moderation.confirm_mute          // "Are you sure you want to mute {{userName}}?"
chat.moderation.confirm_kick          // "Are you sure you want to remove {{userName}}..."
chat.moderation.confirm_ban           // "...They won't be able to rejoin."

// Mensajes de éxito
chat.moderation.muted_successfully    // "User muted successfully"
chat.moderation.kicked_successfully   // "User removed successfully"
chat.moderation.banned_successfully   // "User banned successfully"
```

### Ejemplo de uso:

```tsx
import { useTranslation } from 'react-i18next';

type MuteDuration = '1h' | '24h' | '7d' | '30d' | 'permanent';

function ModerationMenu({ userId, userName }: { userId: string; userName: string }) {
  const { t } = useTranslation();
  const [showMuteDialog, setShowMuteDialog] = useState(false);
  const [muteDuration, setMuteDuration] = useState<MuteDuration>('1h');

  const handleMute = async () => {
    const confirmed = confirm(t('chat.moderation.confirm_mute', { userName }));
    if (!confirmed) return;

    await muteUser(userId, muteDuration);
    toast.success(t('chat.moderation.muted_successfully'));
  };

  const handleKick = async () => {
    const confirmed = confirm(t('chat.moderation.confirm_kick', { userName }));
    if (!confirmed) return;

    await kickUser(userId);
    toast.success(t('chat.moderation.kicked_successfully'));
  };

  const handleBan = async () => {
    const confirmed = confirm(t('chat.moderation.confirm_ban', { userName }));
    if (!confirmed) return;

    await banUser(userId);
    toast.success(t('chat.moderation.banned_successfully'));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setShowMuteDialog(true)}>
          <VolumeX className="mr-2 h-4 w-4" />
          {t('chat.moderation.mute_user')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleKick}>
          <UserMinus className="mr-2 h-4 w-4" />
          {t('chat.moderation.kick_user')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleBan} className="text-red-600">
          <Ban className="mr-2 h-4 w-4" />
          {t('chat.moderation.ban_user')}
        </DropdownMenuItem>
      </DropdownMenuContent>

      {showMuteDialog && (
        <Dialog open={showMuteDialog} onOpenChange={setShowMuteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('chat.moderation.mute_user')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Label>{t('chat.moderation.mute_duration')}</Label>
              <Select value={muteDuration} onValueChange={setMuteDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">{t('chat.moderation.mute_1h')}</SelectItem>
                  <SelectItem value="24h">{t('chat.moderation.mute_24h')}</SelectItem>
                  <SelectItem value="7d">{t('chat.moderation.mute_7d')}</SelectItem>
                  <SelectItem value="30d">{t('chat.moderation.mute_30d')}</SelectItem>
                  <SelectItem value="permanent">{t('chat.moderation.mute_permanent')}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleMute}>{t('chat.moderation.mute_user')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DropdownMenu>
  );
}
```

---

## 5. Channels

### Keys añadidas:

```typescript
// Creación de canales
chat.channels.create_channel          // "Create Channel"
chat.channels.channel_name            // "Channel Name"
chat.channels.channel_description     // "Description"
chat.channels.channel_type            // "Channel Type"

// Tipos de canal
chat.channels.public_channel          // "Public Channel"
chat.channels.private_channel         // "Private Channel"
chat.channels.public_description      // "Anyone in the dealership can join"
chat.channels.private_description     // "Only invited members can join"

// Acciones
chat.channels.join_channel            // "Join Channel"
chat.channels.leave_channel           // "Leave Channel"
chat.channels.members_count           // "{{count}} members"

// Estados vacíos
chat.channels.no_channels             // "No channels available"
chat.channels.create_first_channel    // "Create the first channel..."
```

### Ejemplo de uso:

```tsx
import { useTranslation } from 'react-i18next';

function ChannelList({ channels }: { channels: Channel[] }) {
  const { t } = useTranslation();

  if (channels.length === 0) {
    return (
      <div className="empty-state">
        <p>{t('chat.channels.no_channels')}</p>
        <p className="text-muted-foreground">{t('chat.channels.create_first_channel')}</p>
        <Button>{t('chat.channels.create_channel')}</Button>
      </div>
    );
  }

  return (
    <div className="channel-list">
      {channels.map(channel => (
        <ChannelItem key={channel.id} channel={channel} />
      ))}
    </div>
  );
}

function ChannelItem({ channel }: { channel: Channel }) {
  const { t } = useTranslation();
  const isMember = channel.members.includes(currentUserId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {channel.isPublic ? <Hash /> : <Lock />}
              {channel.name}
            </CardTitle>
            <CardDescription>{channel.description}</CardDescription>
          </div>
          <Badge variant="secondary">
            {t('chat.channels.members_count', { count: channel.memberCount })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isMember ? (
          <Button variant="outline" onClick={() => leaveChannel(channel.id)}>
            {t('chat.channels.leave_channel')}
          </Button>
        ) : (
          <Button onClick={() => joinChannel(channel.id)}>
            {t('chat.channels.join_channel')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## 6. Threading

### Keys añadidas:

```typescript
// Navegación de threads
chat.threading.view_thread            // "View Thread"
chat.threading.reply_in_thread        // "Reply in thread"
chat.threading.back_to_conversation   // "Back to conversation"
chat.threading.thread_with            // "Thread with {{userName}}"

// Contadores
chat.threading.replies_count          // "{{count}} replies"
chat.threading.reply_count_singular   // "1 reply"

// Acciones
chat.threading.start_thread           // "Start a thread"
chat.threading.no_replies             // "No replies yet"
```

### Ejemplo de uso:

```tsx
import { useTranslation } from 'react-i18next';

function MessageThreadButton({ message }: { message: Message }) {
  const { t } = useTranslation();
  const replyCount = message.replies?.length || 0;

  const getReplyText = () => {
    if (replyCount === 0) {
      return t('chat.threading.start_thread');
    }
    if (replyCount === 1) {
      return t('chat.threading.reply_count_singular');
    }
    return t('chat.threading.replies_count', { count: replyCount });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => openThread(message.id)}
    >
      <MessageSquare className="mr-2 h-4 w-4" />
      {getReplyText()}
    </Button>
  );
}

function ThreadView({ threadId, parentMessage }: { threadId: string; parentMessage: Message }) {
  const { t } = useTranslation();
  const replies = useThreadReplies(threadId);

  return (
    <div className="thread-view">
      <header className="flex items-center justify-between">
        <Button variant="ghost" onClick={closeThread}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('chat.threading.back_to_conversation')}
        </Button>
        <h2>{t('chat.threading.thread_with', { userName: parentMessage.author.name })}</h2>
      </header>

      <div className="thread-messages">
        <MessageItem message={parentMessage} isThreadParent />

        {replies.length === 0 ? (
          <p className="text-muted-foreground">{t('chat.threading.no_replies')}</p>
        ) : (
          replies.map(reply => <MessageItem key={reply.id} message={reply} />)
        )}
      </div>

      <MessageInput placeholder={t('chat.threading.reply_in_thread')} />
    </div>
  );
}
```

---

## 7. Messages (Complementados)

### Keys añadidas:

```typescript
// Acciones
chat.messages.edit_message            // "Edit Message"
chat.messages.delete_message          // "Delete Message"

// Confirmaciones
chat.messages.confirm_delete          // "Are you sure you want to delete this message?"
chat.messages.confirm_delete_description // "This action cannot be undone"

// Mensajes de éxito/error
chat.messages.message_edited          // "Message edited successfully"
chat.messages.edit_time_expired       // "Messages can only be edited within 15 minutes"
```

### Ejemplo de uso:

```tsx
import { useTranslation } from 'react-i18next';

function MessageActions({ message }: { message: Message }) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = () => {
    const messageAge = Date.now() - new Date(message.createdAt).getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    if (messageAge > fifteenMinutes) {
      toast.error(t('chat.messages.edit_time_expired'));
      return;
    }

    setIsEditing(true);
  };

  const handleDelete = async () => {
    const confirmed = confirm(
      t('chat.messages.confirm_delete') + '\n' +
      t('chat.messages.confirm_delete_description')
    );

    if (!confirmed) return;

    await deleteMessage(message.id);
    toast.success(t('chat.message_deleted')); // Key existente
  };

  return (
    <DropdownMenu>
      <DropdownMenuContent>
        {message.canEdit && (
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            {t('chat.messages.edit_message')}
          </DropdownMenuItem>
        )}
        {message.canDelete && (
          <DropdownMenuItem onClick={handleDelete} className="text-red-600">
            <Trash className="mr-2 h-4 w-4" />
            {t('chat.messages.delete_message')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 8. Emoji Picker

### Keys añadidas:

```typescript
// Título y búsqueda
chat.emoji.pick_reaction              // "Pick a reaction"
chat.emoji.search                     // "Search emoji..."
chat.emoji.no_results                 // "No emoji found"

// Categorías
chat.emoji.recent                     // "Recent"
chat.emoji.smileys                    // "Smileys & Emotion"
chat.emoji.people                     // "People & Body"
chat.emoji.animals                    // "Animals & Nature"
chat.emoji.food                       // "Food & Drink"
chat.emoji.travel                     // "Travel & Places"
chat.emoji.activities                 // "Activities"
chat.emoji.objects                    // "Objects"
chat.emoji.symbols                    // "Symbols"
chat.emoji.flags                      // "Flags"
```

### Ejemplo de uso:

```tsx
import { useTranslation } from 'react-i18next';

const EMOJI_CATEGORIES = [
  { id: 'recent', icon: '🕐' },
  { id: 'smileys', icon: '😀' },
  { id: 'people', icon: '👋' },
  { id: 'animals', icon: '🐶' },
  { id: 'food', icon: '🍕' },
  { id: 'travel', icon: '✈️' },
  { id: 'activities', icon: '⚽' },
  { id: 'objects', icon: '💡' },
  { id: 'symbols', icon: '❤️' },
  { id: 'flags', icon: '🏁' },
] as const;

function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="emoji-picker">
          <div className="mb-2">
            <p className="text-sm font-semibold mb-2">{t('chat.emoji.pick_reaction')}</p>
            <Input
              placeholder={t('chat.emoji.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="category-tabs flex gap-1 mb-2">
            {EMOJI_CATEGORIES.map(category => (
              <Button
                key={category.id}
                variant={activeCategory === category.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveCategory(category.id)}
                title={t(`chat.emoji.${category.id}`)}
              >
                {category.icon}
              </Button>
            ))}
          </div>

          <div className="emoji-grid">
            {filteredEmojis.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {t('chat.emoji.no_results')}
              </p>
            ) : (
              filteredEmojis.map(emoji => (
                <button
                  key={emoji}
                  className="emoji-button"
                  onClick={() => onSelect(emoji)}
                >
                  {emoji}
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

---

## 9. Menciones

### Keys añadidas:

```typescript
// Interfaz de menciones
chat.mentions.mention_someone         // "Mention someone with @"
chat.mentions.searching               // "Searching..."
chat.mentions.no_results              // "No users found"
chat.mentions.all_members             // "Notify all members"
```

### Ejemplo de uso:

```tsx
import { useTranslation } from 'react-i18next';

function MessageInputWithMentions() {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionResults, setMentionResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Detectar @ para mostrar menciones
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const query = value.slice(lastAtIndex + 1);
      setMentionQuery(query);
      setShowMentions(true);
      searchUsers(query);
    } else {
      setShowMentions(false);
    }
  };

  const searchUsers = async (query: string) => {
    setIsSearching(true);
    const results = await searchTeamMembers(query);
    setMentionResults(results);
    setIsSearching(false);
  };

  return (
    <div className="relative">
      <Input
        value={message}
        onChange={handleInputChange}
        placeholder={t('chat.mentions.mention_someone')}
      />

      {showMentions && (
        <div className="absolute bottom-full mb-2 bg-white border rounded-lg shadow-lg w-full max-h-48 overflow-y-auto">
          {isSearching ? (
            <div className="p-2 text-sm text-muted-foreground">
              {t('chat.mentions.searching')}
            </div>
          ) : mentionResults.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground">
              {t('chat.mentions.no_results')}
            </div>
          ) : (
            <>
              <button
                className="w-full p-2 hover:bg-gray-100 text-left"
                onClick={() => mentionAllMembers()}
              >
                <div className="font-semibold">@all</div>
                <div className="text-xs text-muted-foreground">
                  {t('chat.mentions.all_members')}
                </div>
              </button>
              {mentionResults.map(user => (
                <button
                  key={user.id}
                  className="w-full p-2 hover:bg-gray-100 text-left"
                  onClick={() => insertMention(user)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar src={user.avatar} size="sm" />
                    <div>
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-xs text-muted-foreground">@{user.username}</div>
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Verificación de Integridad

### Comandos de verificación:

```bash
# Verificar que todas las traducciones tienen el mismo número de keys
node scripts/add-chat-translations.cjs

# Contar keys totales en cada idioma
node -e "const fs = require('fs'); ['en', 'es', 'pt-BR'].forEach(lang => { const data = JSON.parse(fs.readFileSync(\`public/translations/\${lang}.json\`, 'utf8')); console.log(\`\${lang}: \${Object.keys(data.chat).length} keys\`); });"

# Buscar uso de keys en el código
grep -r "chat\.permissions\." src/components/
grep -r "chat\.templates\." src/components/
grep -r "chat\.moderation\." src/components/
```

### Checklist de validación:

- [x] Todas las traducciones mantienen la misma estructura JSON
- [x] Variables de interpolación (`{{variable}}`) son consistentes entre idiomas
- [x] Keys plurales (`_one`, `_plural`) están presentes donde se necesitan
- [x] Traducciones usan terminología apropiada al contexto de dealership
- [x] Tono profesional pero amigable mantenido en los 3 idiomas
- [x] No se eliminaron keys existentes
- [x] Estructura JSON existente preservada
- [x] Formato de archivo consistente (2 espacios de indentación)

---

## Notas de Implementación

### Uso de i18next con pluralización:

```typescript
// Automáticamente selecciona _plural si count > 1
t('chat.channels.members_count', { count: 5 })
// EN: "5 members"
// ES: "5 miembros"
// PT-BR: "5 membros"

t('chat.threading.reply_count_singular')
// EN: "1 reply"
// ES: "1 respuesta"
// PT-BR: "1 resposta"
```

### Interpolación de variables:

```typescript
t('chat.moderation.confirm_ban', { userName: 'John Doe' })
// EN: "Are you sure you want to ban John Doe? They won't be able to rejoin."
// ES: "¿Estás seguro que deseas banear a John Doe? No podrá volver a unirse."
// PT-BR: "Tem certeza que deseja banir John Doe? Eles não poderão entrar novamente."
```

### Contexto de dealership:

Todas las traducciones consideran el contexto automotriz:
- "Dealership" → "Concesionario" (ES) / "Concessionária" (PT-BR)
- "Members" → "Miembros" (ES) / "Membros" (PT-BR) en contexto de equipo
- Tono profesional apropiado para entorno empresarial

---

## Archivos Actualizados

1. **`public/translations/en.json`**
   - Base: 108 keys preservadas
   - Añadidas: 112 nuevas keys
   - Total: 220 keys de traducción en `chat`

2. **`public/translations/es.json`**
   - Base: 108 keys preservadas
   - Añadidas: 112 nuevas keys (traducciones al español)
   - Total: 220 keys de traducción en `chat`

3. **`public/translations/pt-BR.json`**
   - Base: 108 keys preservadas
   - Añadidas: 112 nuevas keys (traducciones al portugués brasileño)
   - Total: 220 keys de traducción en `chat`

4. **`scripts/add-chat-translations.cjs`**
   - Script de actualización automatizada
   - Preserva keys existentes
   - Hace merge profundo de objetos anidados
   - Genera reporte de cambios

5. **`docs/team-chat-translations.md`** (este archivo)
   - Documentación completa de traducciones
   - Ejemplos de uso por sección
   - Guía de implementación

---

## Próximos Pasos

1. Integrar las nuevas traducciones en componentes:
   - ConversationList component
   - PermissionGuard components
   - Admin permission templates UI
   - Moderation actions UI
   - Channel management UI
   - Thread navigation UI
   - Emoji picker component
   - Mention autocomplete component

2. Testing de traducciones:
   - Verificar que todas las keys se usan correctamente
   - Probar cambio de idioma en runtime
   - Validar interpolación de variables
   - Verificar pluralización

3. Auditoría de cobertura:
   ```bash
   node scripts/audit-translations.cjs
   ```

---

**Documentación generada:** 2025-10-24
**Versión:** FASE 1G - Team Chat Translations
**Idiomas:** EN | ES | PT-BR
