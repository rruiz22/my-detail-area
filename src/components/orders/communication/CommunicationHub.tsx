import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Mic, Paperclip, Users, Search, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MessageThread } from './MessageThread';
import { MessageComposer } from './MessageComposer';
import { VoiceRecorder } from './VoiceRecorder';
import { useCommunications } from '../../../hooks/useCommunications';

interface CommunicationHubProps {
  orderId: string;
  isDetailUser?: boolean;
}

export function CommunicationHub({ orderId, isDetailUser = false }: CommunicationHubProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  
  const {
    messages,
    loading,
    sendMessage,
    sendVoiceMessage,
    replyToMessage,
    addReaction,
    mentionUsers,
    loadMore,
    hasMore
  } = useCommunications(orderId);

  const filteredMessages = messages.filter(message => {
    if (activeTab === 'voice' && message.message_type !== 'voice') return false;
    if (activeTab === 'files' && message.message_type !== 'file') return false;
    if (activeTab === 'mentions' && (!message.mentions || message.mentions.length === 0)) return false;
    if (searchTerm && !message.content?.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !message.voice_transcription?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const getTabCounts = () => {
    return {
      all: messages.length,
      voice: messages.filter(m => m.message_type === 'voice').length,
      files: messages.filter(m => m.message_type === 'file').length,
      mentions: messages.filter(m => m.mentions && m.mentions.length > 0).length
    };
  };

  const counts = getTabCounts();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">{t('communication.hub_title')}</h2>
            <Badge variant="secondary">{messages.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showVoiceRecorder ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
            >
              <Mic className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4" />
              {t('communication.participants')}
            </Button>
          </div>
        </div>
        
        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('communication.search_messages')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        {/* Tab List */}
        <div className="border-b px-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              {t('communication.all')}
              {counts.all > 0 && <Badge variant="secondary" className="text-xs">{counts.all}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Mic className="w-3 h-3" />
              {t('communication.voice')}
              {counts.voice > 0 && <Badge variant="secondary" className="text-xs">{counts.voice}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <Paperclip className="w-3 h-3" />
              {t('communication.files')}
              {counts.files > 0 && <Badge variant="secondary" className="text-xs">{counts.files}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="mentions" className="flex items-center gap-2">
              @
              {counts.mentions > 0 && <Badge variant="secondary" className="text-xs">{counts.mentions}</Badge>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <TabsContent value={activeTab} className="flex-1 flex flex-col m-0">
            <MessageThread
              messages={filteredMessages}
              onReply={replyToMessage}
              onReaction={addReaction}
              loading={loading}
              onLoadMore={loadMore}
              hasMore={hasMore}
              isDetailUser={isDetailUser}
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <div className="border-t p-4 bg-muted/30">
          <VoiceRecorder
            onSend={sendVoiceMessage}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </div>
      )}

      {/* Message Composer */}
      <div className="border-t">
        <MessageComposer
          onSendMessage={sendMessage}
          mentionUsers={mentionUsers}
          isDetailUser={isDetailUser}
        />
      </div>
    </div>
  );
}