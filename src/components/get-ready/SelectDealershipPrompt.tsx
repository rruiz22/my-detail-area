import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SelectDealershipPromptProps {
  className?: string;
}

export function SelectDealershipPrompt({ className }: SelectDealershipPromptProps) {
  const { t } = useTranslation();

  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {t('get_ready.select_dealership.title') || 'Select a Dealership'}
          </CardTitle>
          <CardDescription className="text-base">
            {t('get_ready.select_dealership.description') ||
              'Get Ready module requires a specific dealership to be selected'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
              <p className="text-muted-foreground">
                {t('get_ready.select_dealership.instruction_1') ||
                  'Click the dealership filter in the top navigation bar'}
              </p>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
              <p className="text-muted-foreground">
                {t('get_ready.select_dealership.instruction_2') ||
                  'Choose a specific dealership from the dropdown'}
              </p>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
              <p className="text-muted-foreground">
                {t('get_ready.select_dealership.instruction_3') ||
                  'The Get Ready workflow will load for that dealership'}
              </p>
            </div>
          </div>

          <div className="pt-2 text-center">
            <p className="text-xs text-muted-foreground">
              {t('get_ready.select_dealership.note') ||
                'Note: "All Dealerships" is not supported in Get Ready module'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
