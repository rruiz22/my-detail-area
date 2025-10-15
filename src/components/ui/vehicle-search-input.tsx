import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, Car, Zap, Image as ImageIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useVehicleAutoPopulation, VehicleSearchResult } from '@/hooks/useVehicleAutoPopulation';

interface VehicleSearchInputProps {
  dealerId?: number;
  onVehicleSelect?: (result: VehicleSearchResult) => void;
  placeholder?: string;
  value?: string;
  className?: string;
}

export const VehicleSearchInput: React.FC<VehicleSearchInputProps> = ({
  dealerId,
  onVehicleSelect,
  placeholder,
  value = '',
  className = ''
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<VehicleSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSearchQuery = useRef<string>('');
  const searchInProgress = useRef<boolean>(false);

  const { searchVehicle, loading } = useVehicleAutoPopulation(dealerId);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      // Avoid duplicate searches and searches while one is in progress
      if (query.length >= 2 && query !== lastSearchQuery.current && !searchInProgress.current) {
        searchInProgress.current = true;
        lastSearchQuery.current = query;

        try {
          const searchResults = await searchVehicle(query);
          setResults(searchResults);
          setIsOpen(searchResults.length > 0);
          setSelectedIndex(-1);
        } finally {
          searchInProgress.current = false;
        }
      } else if (query.length < 2) {
        setResults([]);
        setIsOpen(false);
        lastSearchQuery.current = '';
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, searchVehicle]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleResultSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleResultSelect = (result: VehicleSearchResult) => {
    const displayText = result.data.stockNumber 
      ? `${result.data.stockNumber} - ${result.preview?.title}`
      : result.preview?.title || '';
    
    setQuery(displayText);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (onVehicleSelect) {
      onVehicleSelect(result);
    }
  };

  const getConfidenceBadgeVariant = (confidence: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (confidence) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'inventory': return <Car className="h-3 w-3" />;
      case 'vin_api': return <Zap className="h-3 w-3" />;
      default: return <Search className="h-3 w-3" />;
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('stock.autopop.searchVehicle')}
          className="pl-9 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg border border-border">
          <CardContent className="p-0">
            <div className="max-h-60 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={`${result.source}-${result.data.vin || result.data.stockNumber || index}`}
                  className={`p-3 cursor-pointer hover:bg-accent/50 border-b border-border/50 last:border-b-0 ${
                    index === selectedIndex ? 'bg-accent' : ''
                  }`}
                  onClick={() => handleResultSelect(result)}
                >
                  <div className="flex items-start gap-3">
                    {/* Vehicle Thumbnail */}
                    {result.data.imageUrl ? (
                      <div
                        className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border border-border bg-background cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedImage(result.data.imageUrl!);
                        }}
                      >
                        <img
                          src={result.data.imageUrl}
                          alt={result.preview?.title || 'Vehicle'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.parentElement) {
                              e.currentTarget.parentElement.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center bg-muted">
                                  <svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              `;
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-16 h-16 rounded-md border border-border bg-muted flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getSourceIcon(result.source)}
                        <span className="font-medium text-foreground truncate">
                          {result.preview?.title}
                        </span>
                      </div>

                      {result.preview?.subtitle && (
                        <p className="text-sm text-muted-foreground truncate">
                          {result.preview.subtitle}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <Badge 
                        variant={getConfidenceBadgeVariant(result.confidence)}
                        className="text-xs"
                      >
                        {t(`stock.autopop.confidence.${result.confidence}`)}
                      </Badge>
                      
                      {result.preview?.badge && (
                        <Badge 
                          variant={result.preview.badgeVariant || 'secondary'}
                          className="text-xs"
                        >
                          {result.preview.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="w-full mt-2 h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResultSelect(result);
                    }}
                  >
                    {t('stock.autopop.useVehicle')}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-lg border border-border">
          <CardContent className="p-4 text-center text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('stock.autopop.noResults')}</p>
          </CardContent>
        </Card>
      )}

      {/* Image Expansion Modal */}
      <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
        <DialogContent className="max-w-4xl p-0" aria-describedby="vehicle-image-description">
          <div className="relative">
            <span id="vehicle-image-description" className="sr-only">
              {t('stock.vehicle_image', 'Vehicle image preview')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpandedImage(null)}
              className="absolute top-2 right-2 z-10 h-8 w-8 p-0 bg-background/80 hover:bg-background"
            >
              <X className="h-4 w-4" />
            </Button>
            {expandedImage && (
              <img
                src={expandedImage}
                alt="Vehicle"
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};