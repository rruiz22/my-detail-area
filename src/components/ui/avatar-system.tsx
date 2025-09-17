import { useState, useEffect } from 'react';
import Avatar from 'boring-avatars';

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem('user_avatar_seed');
      if (saved && AVATAR_SEEDS.includes(saved as AvatarSeed)) {
        setSeed(saved as AvatarSeed);
      }
    } catch (error) {
      console.warn('Failed to load avatar preference:', error);
    }
  }, []);

  const saveSeed = (newSeed: AvatarSeed) => {
    try {
      localStorage.setItem('user_avatar_seed', newSeed);
      setSeed(newSeed);
    } catch (error) {
      console.warn('Failed to save avatar preference:', error);
    }
  };

  return { seed, setSeed: saveSeed };
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