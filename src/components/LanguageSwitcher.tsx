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
        <Button variant="ghost" size="sm" className="gap-2 px-3 py-2 h-auto">
          <img 
            src={currentLanguage.flag} 
            alt={currentLanguage.name}
            className="w-4 h-3 object-cover rounded-sm"
          />
          <span className="text-sm font-medium hidden sm:block">{currentLanguage.code.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-50 bg-background border border-border shadow-lg rounded-md min-w-[150px]">
        {supportedLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted transition-colors"
          >
            <img 
              src={language.flag} 
              alt={language.name}
              className="w-5 h-4 object-cover rounded-sm flex-shrink-0"
            />
            <span className="text-sm font-medium">{language.name}</span>
            {i18n.language === language.code && (
              <span className="ml-auto text-primary text-sm font-semibold">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}