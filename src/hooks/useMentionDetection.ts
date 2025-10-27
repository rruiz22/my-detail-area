import { useState, useEffect, RefObject } from 'react';

interface MentionDetectionResult {
  mentionQuery: string | null;
  mentionPosition: number;
}

/**
 * Hook to detect @ mentions in textarea input
 * Detects the last @ symbol before cursor position and extracts query text
 */
export function useMentionDetection(
  text: string,
  textareaRef: RefObject<HTMLTextAreaElement>
): MentionDetectionResult {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionPosition, setMentionPosition] = useState<number>(0);

  useEffect(() => {
    if (!textareaRef.current) {
      setMentionQuery(null);
      return;
    }

    // Get cursor position
    const cursorPos = textareaRef.current.selectionStart || 0;
    const textBeforeCursor = text.slice(0, cursorPos);

    // Find last @ before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex === -1) {
      setMentionQuery(null);
      return;
    }

    // Extract text after @
    const afterAt = textBeforeCursor.slice(lastAtIndex + 1);

    // If there's a space after @, close mention dropdown
    if (afterAt.includes(' ')) {
      setMentionQuery(null);
      return;
    }

    // Valid mention query found
    setMentionQuery(afterAt);
    setMentionPosition(lastAtIndex);
  }, [text, textareaRef]);

  return { mentionQuery, mentionPosition };
}
