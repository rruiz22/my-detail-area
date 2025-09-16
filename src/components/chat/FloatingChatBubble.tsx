import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Phone,
  Users,
  Settings,
  Search,
  Plus
} from 'lucide-react';
import { useGlobalChat } from '@/contexts/GlobalChatProvider';
import { UserPresenceIndicator } from '../presence/UserPresenceIndicator';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PresenceStatus = 'online' | 'away' | 'busy' | 'offline';

const getValidPresenceStatus = (status: unknown): PresenceStatus => {
  if (typeof status === 'string' &&
      ['online', 'away', 'busy', 'offline'].includes(status)) {
    return status as PresenceStatus;
  }
  return 'offline'; // fallback seguro
};

interface FloatingChatBubbleProps {
  className?: string;
}

export function FloatingChatBubble({ className }: FloatingChatBubbleProps) {
  const {
    isFloatingChatOpen,
    setIsFloatingChatOpen,
    activeChats,
    totalUnreadCount,
    teamPresence,
    openDirectMessage
  } = useGlobalChat();

  const [isMinimized, setIsMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const dragRef = useRef<HTMLDivElement>(null);

  // Filter team presence based on search
  const filteredTeamPresence = teamPresence.filter(member => 
    member.profiles?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.profiles?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = teamPresence.filter(m => m.presence_status === 'online').length;

  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isFloatingChatOpen) return;
    setIsDragging(true);
  };

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - 200,
        y: e.clientY - 300
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Floating bubble (collapsed state)
  if (!isFloatingChatOpen) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                'fixed bottom-6 right-6 z-50 transition-all duration-200 hover:scale-110',
                className
              )}
            >
              <Button
                size="lg"
                className="relative h-14 w-14 rounded-full shadow-lg"
                onClick={() => setIsFloatingChatOpen(true)}
              >
                <MessageCircle className="h-6 w-6" />
                {totalUnreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </Badge>
                )}
                {onlineCount > 0 && (
                  <div className="absolute -bottom-1 -left-1 h-4 w-4 bg-green-500 rounded-full border-2 border-background flex items-center justify-center text-xs font-bold text-white">
                    {onlineCount}
                  </div>
                )}
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <div className="text-center">
              <div className="font-medium">Team Chat</div>
              <div className="text-xs text-muted-foreground">
                {onlineCount} online • Cmd+K to open
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Expanded chat interface
  return (
    <div
      ref={dragRef}
      className={cn(
        'fixed z-50 transition-all duration-200',
        isDragging && 'cursor-grabbing'
      )}
      style={{
        right: position.x,
        bottom: position.y,
        width: '400px',
        height: isMinimized ? '60px' : '500px'
      }}
    >
      <Card className="h-full shadow-xl border-2">
        {/* Header */}
        <CardHeader 
          className="pb-3 cursor-move bg-primary/5 rounded-t-lg"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5" />
              Team Chat
              {totalUnreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {totalUnreadCount}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFloatingChatOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Content (only show if not minimized) */}
        {!isMinimized && (
          <CardContent className="p-0 flex flex-col h-[calc(100%-80px)]">
            {/* Search */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search team members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Active Chats */}
            {activeChats.length > 0 && (
              <div className="p-4 border-b">
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">Active Chats</h4>
                <div className="space-y-2">
                  {activeChats.slice(0, 3).map((chat) => (
                    <div
                      key={chat.conversationId}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {chat.participantName?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {chat.participantName}
                        </div>
                        {chat.lastMessage && (
                          <div className="text-xs text-muted-foreground truncate">
                            {chat.lastMessage}
                          </div>
                        )}
                      </div>
                      {chat.unreadCount && chat.unreadCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {chat.unreadCount}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team Presence */}
            <div className="flex-1">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Team Members ({filteredTeamPresence.length})
                  </h4>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {filteredTeamPresence.map((member) => (
                      <div
                        key={member.user_id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors group"
                        onClick={() => openDirectMessage(member.user_id)}
                      >
                        <UserPresenceIndicator
                          status={getValidPresenceStatus(member.presence_status)}
                          size="sm"
                          showRing
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${member.profiles?.first_name} ${member.profiles?.last_name}`}
                            />
                            <AvatarFallback className="text-xs">
                              {member.profiles?.first_name?.charAt(0)}
                              {member.profiles?.last_name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        </UserPresenceIndicator>

                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {member.profiles?.first_name} {member.profiles?.last_name}
                          </div>
                          {member.custom_status && (
                            <div className="text-xs text-muted-foreground truncate">
                              {member.status_emoji} {member.custom_status}
                            </div>
                          )}
                          {member.current_location && (
                            <div className="text-xs text-muted-foreground">
                              📍 {member.current_location}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm">
                            <MessageCircle className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Phone className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 border-t bg-muted/30">
              <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Users className="h-4 w-4 mr-2" />
                  New Group
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}