import React from 'react';
import { cn } from '@/lib/utils';

interface MentionTextProps {
  text: string;
  className?: string;
  onMentionClick?: (username: string) => void;
}

/**
 * Component that renders text with highlighted @mentions
 * Example: "Hey @JohnDoe check this" → "Hey @JohnDoe check this" (with @JohnDoe styled)
 */
export function MentionText({ text, className, onMentionClick }: MentionTextProps) {
  // Parse text and identify @mentions
  const parseMentions = (inputText: string) => {
    const parts: Array<{ type: 'text' | 'mention'; content: string }> = [];
    const mentionRegex = /@(\w+)/g;
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(inputText)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: inputText.substring(lastIndex, match.index)
        });
      }

      // Add mention
      parts.push({
        type: 'mention',
        content: match[0] // Full match including @
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < inputText.length) {
      parts.push({
        type: 'text',
        content: inputText.substring(lastIndex)
      });
    }

    return parts;
  };

  const parts = parseMentions(text);

  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {parts.map((part, index) => {
        if (part.type === 'mention') {
          const username = part.content.substring(1); // Remove @
          return (
            <span
              key={index}
              className={cn(
                'font-semibold text-primary bg-primary/10 px-1 py-0.5 rounded',
                onMentionClick && 'cursor-pointer hover:bg-primary/20 transition-colors'
              )}
              onClick={() => onMentionClick?.(username)}
              title={`View ${username}'s profile`}
            >
              {part.content}
            </span>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </span>
  );
}
