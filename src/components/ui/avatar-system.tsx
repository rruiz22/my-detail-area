import { useState, useEffect, useCallback } from 'react';
import Avatar from 'boring-avatars';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { userProfileCache } from '@/services/userProfileCache';
import { dev, error as logError, warn, success } from '@/utils/logger';

// Using only "beam" variant as requested - 25 different seeds for variety
export const AVATAR_SEEDS = [
  'beam-1', 'beam-2', 'beam-3', 'beam-4', 'beam-5',
  'beam-6', 'beam-7', 'beam-8', 'beam-9', 'beam-10',
  'beam-11', 'beam-12', 'beam-13', 'beam-14', 'beam-15',
  'beam-16', 'beam-17', 'beam-18', 'beam-19', 'beam-20',
  'beam-21', 'beam-22', 'beam-23', 'beam-24', 'beam-25'
] as const;

export type AvatarSeed = typeof AVATAR_SEEDS[number];

interface AvatarSystemProps {
  name: string;
  size?: number;
  className?: string;
  seed?: AvatarSeed;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export function useAvatarPreferences() {
  const [seed, setSeed] = useState<AvatarSeed>('beam-1');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Load avatar preference from database first, fallback to localStorage
  useEffect(() => {
    const loadAvatarPreference = async () => {
      if (!user?.id) return;

      try {
        dev('Loading avatar preference for user:', user.id);

        // First try to load from database
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('avatar_seed, avatar_variant')
          .eq('id', user.id)
          .single();

        if (!error && profile?.avatar_seed) {
          dev('Loaded avatar from database:', profile.avatar_seed);
          if (AVATAR_SEEDS.includes(profile.avatar_seed as AvatarSeed)) {
            setSeed(profile.avatar_seed as AvatarSeed);
            // Sync to localStorage for faster future loads
            localStorage.setItem('user_avatar_seed', profile.avatar_seed);
            return;
          }
        }

        // Fallback to localStorage if database doesn't have preference
        const saved = localStorage.getItem('user_avatar_seed');
        if (saved && AVATAR_SEEDS.includes(saved as AvatarSeed)) {
          dev('Using localStorage avatar:', saved);
          setSeed(saved as AvatarSeed);

          // Sync localStorage preference to database
          if (user?.id) {
            await supabase
              .from('profiles')
              .update({
                avatar_seed: saved,
                avatar_variant: 'beam',
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
            dev('Synced localStorage avatar to database');
          }
        }

      } catch (error) {
        warn('Failed to load avatar preference:', error);
        // Use default if all else fails
      }
    };

    loadAvatarPreference();
  }, [user?.id]);

  const saveSeed = useCallback(async (newSeed: AvatarSeed) => {
    if (!user?.id) {
      console.warn('⚠️ No user ID, saving to localStorage only');
      try {
        localStorage.setItem('user_avatar_seed', newSeed);
        setSeed(newSeed);
      } catch (error) {
        console.warn('Failed to save to localStorage:', error);
      }
      return;
    }

    setLoading(true);
    try {
      dev('Saving avatar preference with cache integration:', newSeed);

      // 1. Update UI immediately
      setSeed(newSeed);

      // 2. Update cache immediately
      userProfileCache.updateCacheField(user.id, 'avatar_seed', newSeed);

      // 3. Save to database in background
      const { error } = await supabase
        .from('profiles')
        .update({
          avatar_seed: newSeed,
          avatar_variant: 'beam',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        logError('Failed to save avatar to database:', error);
        throw error;
      }

      // 4. Update localStorage as additional backup
      localStorage.setItem('user_avatar_seed', newSeed);

      success('Avatar preference saved with cache sync');

    } catch (error) {
      logError('Failed to save avatar preference:', error);
      // Fallback: still save to cache and localStorage
      try {
        userProfileCache.updateCacheField(user.id, 'avatar_seed', newSeed);
        localStorage.setItem('user_avatar_seed', newSeed);
        setSeed(newSeed);
        dev('Saved to cache/localStorage as fallback');
      } catch (localError) {
        warn('Failed to save to cache/localStorage:', localError);
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  return { seed, setSeed: saveSeed, loading };
}

// Modern avatar component using Boring Avatars "beam" variant
export function AvatarSystem({
  name,
  size = 40,
  className,
  seed,
  firstName,
  lastName,
  email
}: AvatarSystemProps) {

  // Generate consistent avatar name for Boring Avatars
  const getAvatarName = (): string => {
    // Use actual name if we have first + last name
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }

    // Use email or provided name
    return email || name || 'User';
  };

  // Get seed for avatar variation (use custom seed or generate from name)
  const getAvatarSeed = (): string => {
    if (seed) return seed;

    // Generate seed from user's email/name for consistency
    const baseName = email || name || 'User';
    return `${baseName}-beam`;
  };

  // Fallback initials if Boring Avatars fails
  const getInitials = (): string => {
    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }

    const emailToUse = email || name;
    if (emailToUse && emailToUse.includes('@')) {
      const emailPart = emailToUse.split('@')[0];
      const parts = emailPart.split(/[._-]/);
      if (parts.length >= 2) {
        return parts.slice(0, 2).map(part => part.charAt(0).toUpperCase()).join('');
      } else {
        return emailPart.slice(0, 2).toUpperCase();
      }
    }

    return 'U';
  };

  // Try to render Boring Avatar, fallback to initials
  try {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Avatar
          size={size}
          name={getAvatarSeed()}
          variant="beam"
          colors={['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b']}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  } catch (error) {
    console.warn('Boring Avatars failed, using initials fallback:', error);

    // Fallback to initials
    const baseClasses = "flex items-center justify-center rounded-full text-white font-medium";
    const colorClass = 'bg-primary';
    const finalClassName = className ? `${baseClasses} ${colorClass} ${className}` : `${baseClasses} ${colorClass}`;

    return (
      <div
        className={finalClassName}
        style={{
          width: size,
          height: size,
          fontSize: Math.max(12, size * 0.4)
        }}
      >
        {getInitials()}
      </div>
    );
  }
}

// Avatar selector for profile page - beam variants only
interface AvatarSeedSelectorProps {
  userName: string;
  currentSeed?: AvatarSeed;
  onSeedChange: (seed: AvatarSeed) => void;
  className?: string;
}

export function AvatarSeedSelector({
  userName,
  currentSeed = 'beam-1',
  onSeedChange,
  className
}: AvatarSeedSelectorProps) {
  const containerClassName = className ? `space-y-4 ${className}` : "space-y-4";

  return (
    <div className={containerClassName}>
      <div>
        <h3 className="text-sm font-medium mb-3">Choose Your Avatar Style</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Select from unique "beam" style avatars. Each creates a distinctive look based on your name.
        </p>
        <div className="grid grid-cols-5 gap-3">
          {AVATAR_SEEDS.map((seedOption) => {
            const isSelected = currentSeed === seedOption;
            const buttonClassName = `flex flex-col items-center p-2 rounded-lg border-2 transition-all hover:shadow-md ${
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-muted-foreground"
            }`;

            return (
              <button
                key={seedOption}
                onClick={() => onSeedChange(seedOption)}
                className={buttonClassName}
              >
                <AvatarSystem
                  name={userName}
                  size={40}
                  seed={seedOption}
                  className="mb-1"
                />
                <span className="text-xs font-medium text-center">
                  {seedOption.split('-')[1]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}