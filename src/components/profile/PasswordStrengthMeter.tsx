import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  onStrengthChange?: (strength: number) => void;
}

export interface PasswordRequirement {
  label: string;
  met: boolean;
  regex: RegExp;
}

export function PasswordStrengthMeter({ password, onStrengthChange }: PasswordStrengthMeterProps) {
  const { t } = useTranslation();

  // Password requirements
  const requirements: PasswordRequirement[] = [
    {
      label: t('profile.password_min_6_chars', 'At least 6 characters'),
      met: password.length >= 6,
      regex: /.{6,}/
    },
    {
      label: t('profile.password_uppercase', 'One uppercase letter'),
      met: /[A-Z]/.test(password),
      regex: /[A-Z]/
    },
    {
      label: t('profile.password_lowercase', 'One lowercase letter'),
      met: /[a-z]/.test(password),
      regex: /[a-z]/
    },
    {
      label: t('profile.password_number', 'One number'),
      met: /[0-9]/.test(password),
      regex: /[0-9]/
    },
    {
      label: t('profile.password_special', 'One special character (!@#$%^&*) - Optional'),
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      regex: /[!@#$%^&*(),.?":{}|<>]/
    }
  ];

  // Calculate strength (0-4)
  const metRequirements = requirements.filter(req => req.met).length;
  const strength = metRequirements;

  // Notify parent of strength change
  if (onStrengthChange && password.length > 0) {
    onStrengthChange(strength);
  }

  // Strength labels and colors
  const getStrengthInfo = () => {
    if (password.length === 0) {
      return {
        label: '',
        color: 'bg-gray-200',
        textColor: 'text-gray-500',
        width: '0%'
      };
    }

    if (strength <= 1) {
      return {
        label: t('profile.password_weak', 'Weak'),
        color: 'bg-red-500',
        textColor: 'text-red-600',
        width: '25%'
      };
    }

    if (strength === 2) {
      return {
        label: t('profile.password_fair', 'Fair'),
        color: 'bg-orange-500',
        textColor: 'text-orange-600',
        width: '50%'
      };
    }

    if (strength === 3) {
      return {
        label: t('profile.password_good', 'Good'),
        color: 'bg-yellow-500',
        textColor: 'text-yellow-600',
        width: '75%'
      };
    }

    return {
      label: t('profile.password_strong', 'Strong'),
      color: 'bg-green-500',
      textColor: 'text-green-600',
      width: '100%'
    };
  };

  const strengthInfo = getStrengthInfo();

  if (password.length === 0) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t('profile.password_strength', 'Password Strength')}:
          </span>
          <span className={cn('font-medium', strengthInfo.textColor)}>
            {strengthInfo.label}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn('h-full transition-all duration-300', strengthInfo.color)}
            style={{ width: strengthInfo.width }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1.5">
        {requirements.map((req, index) => (
          <div
            key={index}
            className={cn(
              'flex items-center gap-2 text-sm transition-colors',
              req.met ? 'text-green-600' : 'text-muted-foreground'
            )}
          >
            {req.met ? (
              <Check className="h-4 w-4 flex-shrink-0" />
            ) : (
              <X className="h-4 w-4 flex-shrink-0" />
            )}
            <span>{req.label}</span>
          </div>
        ))}
      </div>

      {/* Security Tip */}
      {strength >= 4 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm text-green-800">
            {t('profile.password_excellent', '✓ Excellent! Your password is strong and secure.')}
          </p>
        </div>
      )}

      {strength < 3 && password.length >= 6 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <p className="text-sm text-amber-800">
            {t('profile.password_improve', 'Tip: Add more variety to make your password stronger.')}
          </p>
        </div>
      )}
    </div>
  );
}
