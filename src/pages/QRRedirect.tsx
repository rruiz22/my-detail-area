import { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function QRRedirect() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trackClickAndRedirect = async () => {
      if (!slug) {
        setError(t('qr_redirect.invalid_link'));
        setLoading(false);
        return;
      }

      try {
        // Generate session ID for tracking
        const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Get client info for tracking
        const clientInfo = {
          slug,
          ipAddress: undefined, // Will be set by edge function
          userAgent: navigator.userAgent,
          referer: document.referrer || undefined,
          sessionId,
        };

        // Track the click and get redirect info
        const { data, error } = await supabase.functions.invoke('track-qr-click', {
          body: clientInfo
        });

        if (error) {
          console.error('Error tracking click:', error);
          setError(t('qr_redirect.link_not_found'));
          setLoading(false);
          return;
        }

        if (data?.deepLink) {
          setDeepLink(data.deepLink);
        } else {
          setError(t('qr_redirect.invalid_destination'));
        }
      } catch (err) {
        console.error('Error processing redirect:', err);
        setError(t('qr_redirect.processing_error'));
      } finally {
        setLoading(false);
      }
    };

    trackClickAndRedirect();
  }, [slug, t]);

  // Auto-redirect once we have the deep link
  useEffect(() => {
    if (deepLink) {
      // Small delay to ensure tracking completes
      const timer = setTimeout(() => {
        window.location.replace(deepLink);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [deepLink]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-foreground">Link Not Found</h1>
          <p className="text-muted-foreground">
            The link you followed may be invalid or expired.
          </p>
          <Navigate to="/" replace />
        </div>
      </div>
    );
  }

  // If we have a deep link but haven't redirected yet, show a manual option
  if (deepLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">
            If you're not redirected automatically,{' '}
            <a 
              href={deepLink} 
              className="text-primary hover:underline font-medium"
            >
              click here
            </a>
          </p>
        </div>
      </div>
    );
  }

  return <Navigate to="/" replace />;
}