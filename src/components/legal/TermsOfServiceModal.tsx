import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface TermsOfServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsOfServiceModal({ open, onOpenChange }: TermsOfServiceModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-semibold">
            {t('legal.terms_of_service.title')}
          </DialogTitle>
          <DialogDescription>
            {t('legal.terms_of_service.last_updated')}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6 text-sm text-muted-foreground">

            {/* Section 1: Acceptance */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.terms_of_service.acceptance.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.terms_of_service.acceptance.content')}
              </p>
            </section>

            {/* Section 2: Use of Service */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.terms_of_service.usage.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.terms_of_service.usage.content')}
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>{t('legal.terms_of_service.usage.item1')}</li>
                <li>{t('legal.terms_of_service.usage.item2')}</li>
                <li>{t('legal.terms_of_service.usage.item3')}</li>
                <li>{t('legal.terms_of_service.usage.item4')}</li>
              </ul>
            </section>

            {/* Section 3: User Accounts */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.terms_of_service.accounts.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.terms_of_service.accounts.content')}
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>{t('legal.terms_of_service.accounts.item1')}</li>
                <li>{t('legal.terms_of_service.accounts.item2')}</li>
                <li>{t('legal.terms_of_service.accounts.item3')}</li>
              </ul>
            </section>

            {/* Section 4: Intellectual Property */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.terms_of_service.intellectual_property.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.terms_of_service.intellectual_property.content')}
              </p>
            </section>

            {/* Section 5: Limitation of Liability */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.terms_of_service.liability.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.terms_of_service.liability.content')}
              </p>
            </section>

            {/* Section 6: Changes to Terms */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.terms_of_service.changes.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.terms_of_service.changes.content')}
              </p>
            </section>

            {/* Section 7: Contact */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.terms_of_service.contact.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.terms_of_service.contact.content')}
              </p>
              <p className="leading-relaxed font-medium text-foreground">
                {t('legal.terms_of_service.contact.email')}
              </p>
            </section>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
