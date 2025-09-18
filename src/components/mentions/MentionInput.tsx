import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  avatarSeed?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string, mentions: string[]) => void;
  onKeyPress?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  dealerId?: string;
}

export function MentionInput({
  value,
  onChange,
  onKeyPress,
  placeholder,
  className,
  disabled,
  dealerId
}: MentionInputProps) {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<TeamMember[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load team members
  useEffect(() => {
    const loadTeamMembers = async () => {
      if (!user?.dealershipId && !dealerId) return;

      try {
        const { data } = await supabase
          .from('dealer_memberships')
          .select(`
            user_id,
            profiles (
              id,
              first_name,
              last_name,
              email,
              user_type,
              avatar_seed
            )
          `)
          .eq('dealer_id', dealerId || user.dealershipId)
          .eq('is_active', true);

        const members: TeamMember[] = (data || [])
          .filter(member => member.profiles?.id && member.profiles.id !== user.id)
          .map(member => ({
            id: member.profiles!.id,
            firstName: member.profiles!.first_name || '',
            lastName: member.profiles!.last_name || '',
            email: member.profiles!.email || '',
            userType: member.profiles!.user_type || 'regular',
            avatarSeed: member.profiles!.avatar_seed
          }));

        setTeamMembers(members);
      } catch (error) {
        console.error('❌ Failed to load team members:', error);
      }
    };

    loadTeamMembers();
  }, [user?.dealershipId, dealerId, user?.id]);

  // Handle input change and detect @mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    // Find @mention at cursor position
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1].toLowerCase();
      setMentionQuery(query);

      // Filter team members based on query
      const filtered = teamMembers.filter(member =>
        `${member.firstName} ${member.lastName}`.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query)
      );

      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }

    // Extract mentions from the full text
    const mentions = extractMentions(newValue);
    onChange(newValue, mentions);
  };

  // Extract @mentions from text
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(match => match.substring(1)) : [];
  };

  // Handle mention selection
  const selectMention = (member: TeamMember) => {
    const cursorPosition = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);

    // Replace the @query with @username
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      const mentionText = `@${member.firstName}${member.lastName}`;
      const newTextBefore = textBeforeCursor.replace(/@(\w*)$/, mentionText);
      const newValue = newTextBefore + textAfterCursor;

      const mentions = extractMentions(newValue);
      onChange(newValue, mentions);

      // Set cursor position after the mention
      setTimeout(() => {
        if (inputRef.current) {
          const newCursorPos = newTextBefore.length;
          inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          inputRef.current.focus();
        }
      }, 0);
    }

    setShowSuggestions(false);
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (onKeyPress) onKeyPress(e);
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          selectMention(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        break;
      default:
        if (onKeyPress) onKeyPress(e);
    }
  };

  return (
    <div className="relative w-full">
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`w-full ${className}`}
        disabled={disabled}
      />

      {/* Mention suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto border shadow-lg">
          <div className="p-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              Mention team member:
            </div>
            <div className="space-y-1">
              {suggestions.map((member, index) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => selectMention(member)}
                >
                  <AvatarSystem
                    name={`${member.firstName} ${member.lastName}`}
                    firstName={member.firstName}
                    lastName={member.lastName}
                    email={member.email}
                    seed={member.avatarSeed}
                    size={24}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {member.firstName} {member.lastName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {member.email}
                    </div>
                  </div>
                  <div className="text-xs text-primary font-mono">
                    @{member.firstName}{member.lastName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}