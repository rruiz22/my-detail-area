import { useActiveAnnouncements } from '@/hooks/useAnnouncements';
import { cn } from '@/lib/utils';
import DOMPurify from 'dompurify';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useState } from 'react';

const typeConfig = {
  info: {
    icon: Info,
    className: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100',
    iconClassName: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100',
    iconClassName: 'text-yellow-600 dark:text-yellow-400',
  },
  alert: {
    icon: AlertCircle,
    className: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100',
    iconClassName: 'text-red-600 dark:text-red-400',
  },
  success: {
    icon: CheckCircle,
    className: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100',
    iconClassName: 'text-green-600 dark:text-green-400',
  },
};

export function AnnouncementBanner() {
  const { data: announcements = [], isLoading, error } = useActiveAnnouncements();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Don't render anything while loading or if no announcements
  if (isLoading || error || announcements.length === 0) {
    return null;
  }

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter(
    (announcement) => !dismissedIds.has(announcement.id)
  );

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  return (
    <div className="space-y-2 px-6 pt-4">
      {visibleAnnouncements.map((announcement) => {
        const config = typeConfig[announcement.type];
        const Icon = config.icon;

        // Sanitize HTML content
        const sanitizedContent = DOMPurify.sanitize(announcement.content, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span', 'div'],
          ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
        });

        return (
          <div
            key={announcement.id}
            className={cn(
              'relative rounded-lg border p-4 shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2',
              config.className
            )}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <Icon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', config.iconClassName)} />

              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1">{announcement.title}</h3>
                <div
                  className="text-sm prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: sanitizedContent }}
                />
              </div>

              {/* Note: Los anuncios NO se pueden cerrar según requerimientos (opción 3c) */}
              {/* Si en el futuro se quiere habilitar dismiss, descomentar este botón: */}
              {/*
              <button
                onClick={() => handleDismiss(announcement.id)}
                className={cn(
                  'flex-shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors',
                  config.iconClassName
                )}
                aria-label="Dismiss announcement"
              >
                <X className="h-4 w-4" />
              </button>
              */}
            </div>
          </div>
        );
      })}
    </div>
  );
}
