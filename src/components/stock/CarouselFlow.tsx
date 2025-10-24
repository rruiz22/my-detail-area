import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const RADIUS = 1200;
const FLIP_RANGE = 3;

interface Photo {
  url: string;
  isKey?: boolean;
  category?: string;
  id?: string;
}

interface CarouselFlowProps {
  photos: Photo[];
  onPhotoChange?: (index: number) => void;
}

export const CarouselFlow: React.FC<CarouselFlowProps> = ({ photos, onPhotoChange }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentAngleRef = useRef(0);

  const angleUnit = 360 / photos.length;

  // Set transform for individual carousel item
  function setTransform(el: HTMLDivElement, xpos: number, zpos: number, angle: number, flipAngle: number) {
    el.style.transform = `translateX(${xpos}px) translateZ(${zpos}px) rotateY(${angle}deg) rotateX(${flipAngle}deg)`;
  }

  // Target an item and make it center
  function target(index: number) {
    // Calculate amount of angle to shift
    let deltaAngle = -(index - currentIndex) * angleUnit;
    if (deltaAngle < -180) deltaAngle += 360;
    else if (deltaAngle > 180) deltaAngle -= 360;

    currentAngleRef.current += deltaAngle;
    setCurrentIndex(index);

    // Notify parent
    if (onPhotoChange) {
      onPhotoChange(index);
    }

    // Rotate the container
    const cf = carouselRef.current;
    if (!cf) return;

    cf.style.transform = `translateZ(-1250px) rotateY(${currentAngleRef.current}deg)`;

    // Flip items angle
    let flipAngle = 90;
    const items = cf.children;

    // Iterate the items and apply transformation
    for (let i = 0; i < items.length; i++) {
      const item = items[i] as HTMLDivElement;
      const itemAngle = angleUnit * i;
      const itemAngleRad = (itemAngle * Math.PI) / 180;
      const xpos = Math.sin(itemAngleRad) * RADIUS;
      const zpos = Math.cos(itemAngleRad) * RADIUS;

      let deltaIndex = Math.abs(i - index);
      if (deltaIndex > cf.children.length / 2) {
        deltaIndex = cf.children.length - deltaIndex;
      }

      if (deltaIndex <= FLIP_RANGE) {
        flipAngle = deltaIndex * (90 / FLIP_RANGE);
      } else {
        flipAngle = 90;
      }

      setTransform(item, xpos, zpos, itemAngle, flipAngle);
    }
  }

  // Initialize on mount
  useEffect(() => {
    target(0);
  }, [photos.length]);

  // Navigation functions
  const nextPhoto = () => {
    const newIndex = (currentIndex + 1) % photos.length;
    target(newIndex);
  };

  const prevPhoto = () => {
    const newIndex = (currentIndex - 1 + photos.length) % photos.length;
    target(newIndex);
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'exterior':
        return 'Exterior';
      case 'interior':
        return 'Interior';
      case 'engine':
        return 'Engine';
      case 'other':
        return 'Other';
      default:
        return '';
    }
  };

  return (
    <div className="relative w-full h-[600px] vehicle-carousel-container">
      {/* 3D Carousel */}
      <div className="vehicle-carousel-flow" ref={carouselRef}>
        {photos.map((photo, index) => (
          <div
            key={index}
            onClick={() => target(index)}
            style={{ backgroundImage: `url(${photo.url})` }}
            className="vehicle-carousel-item"
          >
            {/* Key Photo Badge */}
            {photo.isKey && (
              <Badge className="absolute top-2 left-2 bg-primary shadow-lg z-10">
                <Star className="w-3 h-3 mr-1 fill-current" />
                Key Photo
              </Badge>
            )}

            {/* Category Badge */}
            {photo.category && (
              <Badge className="absolute top-2 right-2 bg-black/70 text-white backdrop-blur-sm z-10">
                {getCategoryLabel(photo.category)}
              </Badge>
            )}
          </div>
        ))}
      </div>

      {/* Navigation Controls */}
      {photos.length > 1 && (
        <>
          <Button
            variant="secondary"
            size="icon"
            className="absolute left-8 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full shadow-xl z-20"
            onClick={prevPhoto}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            variant="secondary"
            size="icon"
            className="absolute right-8 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full shadow-xl z-20"
            onClick={nextPhoto}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          {/* Counter */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
            <Badge variant="secondary" className="bg-black/70 text-white backdrop-blur-sm text-base px-4 py-2">
              {currentIndex + 1} / {photos.length}
            </Badge>
          </div>
        </>
      )}

      {/* Dots Navigation */}
      {photos.length > 1 && photos.length <= 10 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-20">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => target(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-primary w-8'
                  : 'bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
