import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { changeLanguage, supportedLanguages } from '@/lib/i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const handleLanguageChange = async (languageCode: string) => {
    await changeLanguage(languageCode);
  };

  const currentLanguage = supportedLanguages.find(lang => lang.code === i18n.language) || supportedLanguages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-10 h-10 p-0">
          <span className="text-lg">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 bg-popover border border-border shadow-md">
        {supportedLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="justify-center p-2"
          >
            <span className="text-lg">{language.flag}</span>
            {i18n.language === language.code && (
              <span className="ml-2 text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}