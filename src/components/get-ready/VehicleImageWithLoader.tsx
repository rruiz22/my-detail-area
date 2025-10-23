import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Car } from 'lucide-react';
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

  return (
    <Avatar className={cn("relative", className)} onClick={onClick}>
      {/* Skeleton Loader - Shows while loading */}
      {isLoading && src && !hasError && (
        <div className="absolute inset-0 bg-muted/50 animate-pulse rounded-[inherit]" />
      )}

      {/* Actual Image */}
      {src && !hasError && (
        <AvatarImage
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-300 object-cover",
            isLoading ? "opacity-0" : "opacity-100"
          )}
        />
      )}

      {/* Fallback - No image or error */}
      <AvatarFallback className={cn("rounded-[inherit]", fallbackClassName)}>
        <Car className="h-4 w-4 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
}
