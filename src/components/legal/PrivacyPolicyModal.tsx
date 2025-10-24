import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface PrivacyPolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacyPolicyModal({ open, onOpenChange }: PrivacyPolicyModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
        {/* Fixed Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-2xl font-semibold">
            {t('legal.privacy_policy.title')}
          </DialogTitle>
          <DialogDescription>
            {t('legal.privacy_policy.last_updated')}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6 text-sm text-muted-foreground">

            {/* Section 1: Introduction */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.privacy_policy.intro.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.privacy_policy.intro.content')}
              </p>
            </section>

            {/* Section 2: Information We Collect */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.privacy_policy.collection.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.privacy_policy.collection.content')}
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>{t('legal.privacy_policy.collection.item1')}</li>
                <li>{t('legal.privacy_policy.collection.item2')}</li>
                <li>{t('legal.privacy_policy.collection.item3')}</li>
                <li>{t('legal.privacy_policy.collection.item4')}</li>
              </ul>
            </section>

            {/* Section 3: How We Use Information */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.privacy_policy.usage.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.privacy_policy.usage.content')}
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>{t('legal.privacy_policy.usage.item1')}</li>
                <li>{t('legal.privacy_policy.usage.item2')}</li>
                <li>{t('legal.privacy_policy.usage.item3')}</li>
                <li>{t('legal.privacy_policy.usage.item4')}</li>
              </ul>
            </section>

            {/* Section 4: Data Security */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.privacy_policy.security.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.privacy_policy.security.content')}
              </p>
            </section>

            {/* Section 5: Your Rights */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.privacy_policy.rights.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.privacy_policy.rights.content')}
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>{t('legal.privacy_policy.rights.item1')}</li>
                <li>{t('legal.privacy_policy.rights.item2')}</li>
                <li>{t('legal.privacy_policy.rights.item3')}</li>
                <li>{t('legal.privacy_policy.rights.item4')}</li>
              </ul>
            </section>

            {/* Section 6: Contact */}
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-foreground">
                {t('legal.privacy_policy.contact.title')}
              </h3>
              <p className="leading-relaxed">
                {t('legal.privacy_policy.contact.content')}
              </p>
              <p className="leading-relaxed font-medium text-foreground">
                {t('legal.privacy_policy.contact.email')}
              </p>
            </section>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
