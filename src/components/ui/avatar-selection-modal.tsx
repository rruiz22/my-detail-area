import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AvatarSystem, AVATAR_SEEDS, type AvatarSeed } from '@/components/ui/avatar-system';
import { useTranslation } from 'react-i18next';
import { CheckIcon } from 'lucide-react';

interface AvatarSelectionModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  currentSeed: AvatarSeed;
  onSeedChange: (seed: AvatarSeed) => void;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export function AvatarSelectionModal({
  open,
  onClose,
  userName,
  currentSeed,
  onSeedChange,
  firstName,
  lastName,
  email
}: AvatarSelectionModalProps) {
  const { t } = useTranslation();
  const [selectedSeed, setSelectedSeed] = useState<AvatarSeed>(currentSeed);

  const handleSeedSelect = (seed: AvatarSeed) => {
    setSelectedSeed(seed);
  };

  const handleSave = () => {
    onSeedChange(selectedSeed);
    onClose();
  };

  const handleCancel = () => {
    setSelectedSeed(currentSeed); // Reset to original
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t('profile.select_avatar', 'Select Your Avatar Style')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('profile.avatar_modal_description', 'Choose from 25 unique "beam" style avatars. Each creates a distinctive look based on your name.')}
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Selection Preview */}
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/30 rounded-lg">
            <AvatarSystem
              name={userName}
              firstName={firstName}
              lastName={lastName}
              email={email}
              seed={selectedSeed}
              size={64}
              className="flex-shrink-0"
            />
            <div className="text-center">
              <h3 className="font-medium">{t('profile.preview', 'Preview')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('profile.beam_style', 'Beam Style')} {selectedSeed.split('-')[1]}
              </p>
            </div>
          </div>

          {/* Avatar Grid - 5x5 layout for 25 options */}
          <div className="grid grid-cols-5 gap-3 max-h-[400px] overflow-y-auto p-2">
            {AVATAR_SEEDS.map((seedOption) => {
              const isSelected = selectedSeed === seedOption;
              const isCurrent = currentSeed === seedOption;

              return (
                <button
                  key={seedOption}
                  onClick={() => handleSeedSelect(seedOption)}
                  className={`relative flex flex-col items-center p-2 rounded-lg border-2 transition-all hover:shadow-md ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-muted-foreground hover:bg-accent/10"
                  }`}
                >
                  <AvatarSystem
                    name={userName}
                    firstName={firstName}
                    lastName={lastName}
                    email={email}
                    seed={seedOption}
                    size={48}
                    className="mb-1"
                  />

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <CheckIcon className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}

                  {/* Current badge */}
                  {isCurrent && !isSelected && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckIcon className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <span className="text-xs font-medium text-center">
                    {seedOption.split('-')[1]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={handleCancel}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedSeed === currentSeed}
            >
              {t('profile.save_avatar', 'Save Avatar')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}