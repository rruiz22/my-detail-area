import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, Car, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { searchVehicle, loading } = useVehicleAutoPopulation(dealerId);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.length >= 2) {
        const searchResults = await searchVehicle(query);
        setResults(searchResults);
        setIsOpen(searchResults.length > 0);
        setSelectedIndex(-1);
      } else {
        setResults([]);
        setIsOpen(false);
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
                  <div className="flex items-start justify-between gap-3">
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
                      
                      {result.data.price && (
                        <p className="text-sm font-medium text-foreground mt-1">
                          ${result.data.price.toLocaleString()}
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
    </div>
  );
};