import { useAuth } from '@/contexts/AuthContext';
import { dev } from '@/utils/logger';
import { useCallback } from 'react';

// Avatar colors for consistent color generation
const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-blue-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-orange-500'
] as const;

// Keeping AvatarSeed type for backward compatibility (will be deprecated)
export type AvatarSeed = string;
export const AVATAR_SEEDS: readonly string[] = [];

interface AvatarSystemProps {
  name: string;
  size?: number;
  className?: string;
  seed?: AvatarSeed; // Deprecated - kept for backward compatibility
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string | null; // Profile photo URL
}

// Generate consistent background color based on name/email
function getAvatarColor(firstName?: string, lastName?: string, email?: string, name?: string): string {
  const colors = AVATAR_COLORS;

  // Use name or email to generate consistent color index
  const str = firstName || lastName || email || name || 'User';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Simplified hook - no longer needs to save preferences since avatars are based on name/initials
export function useAvatarPreferences() {
  const { user } = useAuth();

  // Return empty string since we don't use seeds anymore
  const seed = '';
  const loading = false;

  const setSeed = useCallback(async (newSeed: AvatarSeed) => {
    // No-op: Avatar is now based purely on first_name + last_name
    dev('Avatar seed no longer used - using initials based on name');
  }, []);

  return { seed, setSeed, loading };
}

// Modern avatar component - supports both custom photos and initials
export function AvatarSystem({
  name,
  size = 40,
  className,
  seed, // Deprecated - kept for backward compatibility
  firstName,
  lastName,
  email,
  avatarUrl
}: AvatarSystemProps) {

  // Get initials from first name and last name
  const getInitials = (): string => {
    // Priority 1: Use first name + last name (Rudy Ruiz = RR)
    if (firstName && lastName) {
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }

    // Priority 2: Try to get from email
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

    // Fallback
    return 'U';
  };

  // If avatar URL exists, show photo
  if (avatarUrl) {
    const baseClasses = "rounded-full overflow-hidden flex items-center justify-center bg-muted";
    const finalClassName = className ? `${baseClasses} ${className}` : baseClasses;

    return (
      <div
        className={finalClassName}
        style={{
          width: size,
          height: size
        }}
      >
        <img
          src={avatarUrl}
          alt={firstName && lastName ? `${firstName} ${lastName}` : name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // On error, hide image and show initials fallback
            const target = e.currentTarget;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.className = `flex items-center justify-center rounded-full text-white font-semibold ${getAvatarColor(firstName, lastName, email, name)}`;
              parent.innerHTML = `<span style="font-size: ${Math.max(12, size * 0.4)}px">${getInitials()}</span>`;
            }
          }}
        />
      </div>
    );
  }

  // Render avatar with initials (default)
  const baseClasses = "flex items-center justify-center rounded-full text-white font-semibold";
  const colorClass = getAvatarColor(firstName, lastName, email, name);
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

// Avatar selector for profile page - simplified (no longer needed as avatars are based on initials)
// Kept for backward compatibility
interface AvatarSeedSelectorProps {
  userName: string;
  currentSeed?: AvatarSeed;
  onSeedChange: (seed: AvatarSeed) => void;
  className?: string;
}

export function AvatarSeedSelector({
  userName,
  currentSeed,
  onSeedChange,
  className
}: AvatarSeedSelectorProps) {
  return (
    <div className={className ? `space-y-4 ${className}` : "space-y-4"}>
      <div>
        <h3 className="text-sm font-medium mb-3">Avatar Preview</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Your avatar is automatically generated from your first and last name initials.
        </p>
        <div className="flex justify-center">
          <AvatarSystem
            name={userName}
            size={96}
            className="mb-1"
          />
        </div>
      </div>
    </div>
  );
}
