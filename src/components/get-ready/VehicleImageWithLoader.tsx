import { cn } from '@/lib/utils';
import { useState } from 'react';

interface VehicleImageWithLoaderProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  onClick?: (e: React.MouseEvent) => void;
  showHoverEffect?: boolean;
}

/**
 * Vehicle Image with Skeleton Loader
 *
 * Prevents cascade effect when loading multiple images by:
 * 1. Showing animated skeleton while loading
 * 2. Smooth fade-in transition when loaded
 * 3. Proper error handling with fallback
 *
 * @param src - Image URL (from Stock inventory)
 * @param alt - Alt text for accessibility
 * @param className - Avatar container className
 * @param onClick - Optional click handler (for lightbox)
 * @param showHoverEffect - Show eye icon on hover
 */
export function VehicleImageWithLoader({
  src,
  alt,
  className,
  fallbackClassName,
  onClick,
  showHoverEffect = false
}: VehicleImageWithLoaderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Use placeholder image from Stock module
  const displaySrc = src || '/images/vehicle-placeholder.png';

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)} onClick={onClick}>
      {/* Skeleton Loader - Shows while loading */}
      {isLoading && src && !hasError && (
        <div className="absolute inset-0 bg-muted/50 animate-pulse rounded-[inherit] z-10" />
      )}

      {/* Image (actual or placeholder) */}
      <img
        src={displaySrc}
        alt={alt}
        onLoad={handleLoad}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          // If the actual image fails, try placeholder
          if (src && target.src !== window.location.origin + '/images/vehicle-placeholder.png') {
            target.src = '/images/vehicle-placeholder.png';
            setHasError(true);
          }
          setIsLoading(false);
        }}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoading && src ? "opacity-0" : "opacity-100"
        )}
      />
    </div>
  );
}
