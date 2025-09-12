import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={toggleTheme}
      className="h-8 w-8 hover:bg-secondary/80 transition-colors"
      title={t('common.toggle_theme')}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
      <span className="sr-only">{t('common.toggle_theme')}</span>
    </Button>
  );
}