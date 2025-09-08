import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus } from 'lucide-react';

interface MessageReactionsProps {
  reactions: Record<string, string[]>;
  onReaction: (emoji: string) => void;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😊', '😂', '😢', '😮', '😡', '👏', '🎉', '🔥'];

export function MessageReactions({ reactions, onReaction }: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {/* Existing Reactions */}
      {Object.entries(reactions).map(([emoji, userIds]) => (
        <Button
          key={emoji}
          variant="outline"
          size="sm"
          className="h-6 px-2 text-xs rounded-full"
          onClick={() => onReaction(emoji)}
        >
          <span className="mr-1">{emoji}</span>
          <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
            {userIds.length}
          </Badge>
        </Button>
      ))}

      {/* Add Reaction Button */}
      <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 rounded-full p-0 opacity-60 hover:opacity-100"
          >
            <Plus className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top">
          <div className="grid grid-cols-5 gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-base hover:bg-muted"
                onClick={() => {
                  onReaction(emoji);
                  setShowEmojiPicker(false);
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
