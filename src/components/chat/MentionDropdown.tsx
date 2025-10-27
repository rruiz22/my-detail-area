import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface MentionSuggestion {
  id: string;
  name: string;
  email?: string;
  avatar_seed?: string;
  isAll?: boolean;
}

interface MentionDropdownProps {
  query: string;
  participants: MentionSuggestion[];
  onSelect: (mention: MentionSuggestion | null) => void;
  position: number;
}

/**
 * Mention autocomplete dropdown component
 * Features:
 * - Real-time filtering by query
 * - Keyboard navigation (Arrow Up/Down, Enter, Escape)
 * - Special @all option to mention everyone
 * - Accessible with ARIA labels
 */
export function MentionDropdown({
  query,
  participants,
  onSelect,
}: MentionDropdownProps) {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Filter participants by query
  const filtered = useMemo(() => {
    // Always include @all option at the top
    const allOption: MentionSuggestion = {
      id: 'all',
      name: 'all',
      isAll: true,
    };

    if (!query) {
      return [allOption, ...participants];
    }

    const lower = query.toLowerCase();
    const matchedParticipants = participants.filter((p) =>
      p.name.toLowerCase().includes(lower)
    );

    // Include @all if it matches the query
    if ('all'.includes(lower)) {
      return [allOption, ...matchedParticipants];
    }

    return matchedParticipants;
  }, [query, participants]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        onSelect(filtered[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onSelect(null); // Close dropdown
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [filtered, selectedIndex, onSelect]);

  if (filtered.length === 0) {
    return (
      <div
        className="mention-dropdown empty"
        role="listbox"
        aria-label={t('chat.mentions.no_results')}
      >
        <div className="px-3 py-2 text-sm text-muted-foreground">
          {t('chat.mentions.no_results')}
        </div>
      </div>
    );
  }

  return (
    <div
      className="mention-dropdown"
      role="listbox"
      aria-label={t('chat.mentions.mention_someone')}
    >
      {filtered.map((participant, idx) => (
        <button
          key={participant.id}
          className={cn(
            'mention-item',
            idx === selectedIndex && 'selected'
          )}
          onClick={() => onSelect(participant)}
          role="option"
          aria-selected={idx === selectedIndex}
          type="button"
        >
          {participant.isAll ? (
            <Avatar className="h-6 w-6 shrink-0">
              <AvatarFallback className="text-xs bg-gray-100 text-gray-700">
                👥
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-6 w-6 rounded-full overflow-hidden shrink-0">
              <AvatarSystem
                name={participant.name}
                email={participant.email}
                seed={participant.avatar_seed as any}
                size={24}
              />
            </div>
          )}
          <span className="truncate">
            {participant.isAll
              ? t('chat.mentions.all_members')
              : participant.name}
          </span>
        </button>
      ))}
    </div>
  );
}
