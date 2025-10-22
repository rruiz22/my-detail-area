import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useGlobalSearch, SearchResult } from '@/hooks/useGlobalSearch'; // With special char escaping
import {
  Search,
  ShoppingCart,
  Wrench,
  Sparkles,
  Droplet,
  Users,
  User,
  Loader2,
  Calendar,
  Hash,
  Car,
  ClipboardCheck,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';

const getIconForType = (type: SearchResult['type']) => {
  switch (type) {
    case 'sales_order':
      return ShoppingCart;
    case 'service_order':
      return Wrench;
    case 'recon_order':
      return Sparkles;
    case 'car_wash':
      return Droplet;
    case 'contact':
      return Users;
    case 'user':
      return User;
    case 'get_ready':
      return ClipboardCheck;
    case 'stock':
      return Package;
    default:
      return Search;
  }
};

const getStatusColor = (status?: string) => {
  if (!status) return 'bg-gray-500';

  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('complete') || lowerStatus.includes('delivered')) return 'bg-emerald-500';
  if (lowerStatus.includes('progress') || lowerStatus.includes('active')) return 'bg-amber-500';
  if (lowerStatus.includes('pending') || lowerStatus.includes('new')) return 'bg-gray-500';
  if (lowerStatus.includes('cancel')) return 'bg-red-500';

  return 'bg-gray-500';
};

// Highlight search query in text
const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className="bg-amber-200 text-gray-900 font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
};

export const GlobalSearch = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { results, isSearching, search, clearResults } = useGlobalSearch();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle search input change
  const handleInputChange = (value: string) => {
    setQuery(value);
    search(value);
    setOpen(value.length >= 2);
  };

  // Handle result selection
  const handleSelect = (result: SearchResult) => {
    navigate(result.url);
    setQuery('');
    setOpen(false);
    clearResults();
  };

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<SearchResult['type'], SearchResult[]>);

  // Keyboard shortcuts: Ctrl+S to open, ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to open search
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      // ESC to close search
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
        setQuery('');
        clearResults();
        inputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, clearResults]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (open) {
        setOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  return (
    <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={t('search.global_placeholder')}
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              className="pl-8 sm:pl-10 w-full text-sm sm:text-base h-9 sm:h-10"
            />
            {isSearching && (
              <Loader2 className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </div>
        </PopoverTrigger>

        {open && (
          <PopoverContent
            className="w-[calc(100vw-2rem)] sm:w-[500px] md:w-[600px] p-0 max-h-[70vh] overflow-hidden"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <Command>
              <CommandList className="max-h-[calc(70vh-60px)] overflow-y-auto">
                {isSearching ? (
                  <div className="py-12 px-4 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-gray-400" />
                    <p className="text-sm text-muted-foreground font-medium">{t('search.searching')}</p>
                  </div>
                ) : results.length === 0 ? (
                  <div className="py-12 px-4 text-center">
                    <Search className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      {t('search.no_results')}
                      {query && (
                        <span className="block mt-1 font-mono text-xs text-gray-500">
                          "{query}"
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{t('search.try_different_keywords')}</p>
                  </div>
                ) : (
                  <>
                    {Object.entries(groupedResults).map(([type, items]) => {
                      const Icon = getIconForType(type as SearchResult['type']);
                      return (
                        <CommandGroup
                          key={type}
                          heading={t(`search.categories.${type}`)}
                          className="p-2"
                        >
                          {items.map((result) => {
                            const isOrder = ['sales_order', 'service_order', 'recon_order', 'car_wash'].includes(result.type);

                            return (
                              <CommandItem
                                key={`${result.type}-${result.id}`}
                                onSelect={() => handleSelect(result)}
                                className="cursor-pointer p-3 sm:p-4 rounded-lg hover:bg-gray-50 data-[selected=true]:bg-gray-100 data-[selected=true]:text-foreground mb-1.5 transition-colors duration-150"
                              >
                                <div className="flex items-start gap-3 w-full">
                                  <div className="flex-shrink-0 mt-0.5">
                                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
                                  </div>

                                  <div className="flex-1 min-w-0 space-y-1.5">
                                    {/* Title and Status */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
                                      <div className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-1">
                                        {highlightText(result.title, query)}
                                      </div>
                                      {result.status && (
                                        <Badge
                                          variant="outline"
                                          className={`${getStatusColor(result.status)} text-white border-none text-xs px-2 py-0.5 w-fit flex-shrink-0`}
                                        >
                                          {t(`search.status.${result.status.toLowerCase().replace(/\s+/g, '_')}`)}
                                        </Badge>
                                      )}
                                    </div>

                                    {/* Subtitle - Customer/Contact name */}
                                    {result.subtitle && (
                                      <div className="text-sm text-muted-foreground line-clamp-1">
                                        {highlightText(result.subtitle, query)}
                                      </div>
                                    )}

                                    {/* Order Details - Stock, VIN, Due Date, Services */}
                                    {isOrder && (
                                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                                        {result.stock_number && (
                                          <div className="flex items-center gap-1 whitespace-nowrap">
                                            <Hash className="h-3 w-3 flex-shrink-0" />
                                            <span className="font-medium">{t('search.stock')}:</span>
                                            <span className="text-gray-700">{highlightText(result.stock_number, query)}</span>
                                          </div>
                                        )}

                                        {result.vehicle_vin && (
                                          <div className="flex items-center gap-1 whitespace-nowrap">
                                            <Car className="h-3 w-3 flex-shrink-0" />
                                            <span className="font-medium">{t('search.vin')}:</span>
                                            <span className="font-mono text-gray-700">{highlightText(result.vehicle_vin.slice(-8), query)}</span>
                                          </div>
                                        )}

                                        {result.due_date && (
                                          <div className="flex items-center gap-1 whitespace-nowrap">
                                            <Calendar className="h-3 w-3 flex-shrink-0" />
                                            <span className="font-medium">{t('search.due_date')}:</span>
                                            <span className="text-gray-700">{format(new Date(result.due_date), 'MMM dd, yyyy')}</span>
                                          </div>
                                        )}

                                        {result.completion_date && (
                                          <div className="flex items-center gap-1 text-emerald-600 whitespace-nowrap">
                                            <Calendar className="h-3 w-3 flex-shrink-0" />
                                            <span className="font-medium">{t('search.completed')}:</span>
                                            <span className="font-medium">{format(new Date(result.completion_date), 'MMM dd, yyyy')}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* Services - for orders with services */}
                                    {result.services && result.services.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mt-1">
                                        {result.services.slice(0, 3).map((service, idx) => (
                                          <Badge
                                            key={idx}
                                            variant="secondary"
                                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-200"
                                          >
                                            {service}
                                          </Badge>
                                        ))}
                                        {result.services.length > 3 && (
                                          <Badge
                                            variant="secondary"
                                            className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
                                          >
                                            +{result.services.length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      );
                    })}
                  </>
                )}
              </CommandList>

              {/* Footer with result count */}
              {!isSearching && results.length > 0 && (
                <div className="border-t p-3 bg-gray-50">
                  <p className="text-xs text-center text-muted-foreground font-medium">
                    {results.length === 1
                      ? t('search.result_found', { count: results.length })
                      : t('search.results_found', { count: results.length })
                    }
                  </p>
                </div>
              )}
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
};
