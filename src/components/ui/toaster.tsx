import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        // Determinar icono según variant
        const Icon = variant === 'destructive'
          ? XCircle
          : variant === 'warning'
            ? AlertTriangle
            : variant === 'success'
              ? CheckCircle2
              : CheckCircle2;

        const iconColor = variant === 'destructive'
          ? 'text-red-600'
          : variant === 'warning'
            ? 'text-amber-600'
            : variant === 'success'
              ? 'text-emerald-600'
              : 'text-gray-600';

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-center gap-3 w-full">
              {/* Icono inline */}
              <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />

              {/* Contenido */}
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
