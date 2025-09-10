import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { History, Search, Filter, Download, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ScanHistoryEntry {
  id: string;
  vin: string;
  timestamp: Date;
  status: 'success' | 'failed';
  confidence: number;
  processingTime: number;
  source: 'tesseract' | 'enhanced' | 'region-detected';
  imageName?: string;
}

interface VinScannerHistoryProps {
  className?: string;
}

export function VinScannerHistory({ className }: VinScannerHistoryProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'tesseract' | 'enhanced' | 'region-detected'>('all');

  // Load scan history from localStorage
  useEffect(() => {
    const storedHistory = localStorage.getItem('vinScannerHistory');
    if (storedHistory) {
      try {
        const parsedHistory = JSON.parse(storedHistory).map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        setHistory(parsedHistory);
      } catch (error) {
        console.error('Error loading scan history:', error);
      }
    }
  }, []);

  // Save scan history to localStorage
  const saveHistory = (newHistory: ScanHistoryEntry[]) => {
    try {
      localStorage.setItem('vinScannerHistory', JSON.stringify(newHistory));
      setHistory(newHistory);
    } catch (error) {
      console.error('Error saving scan history:', error);
    }
  };

  // Add new scan entry
  const addScanEntry = (entry: Omit<ScanHistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: ScanHistoryEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    const newHistory = [newEntry, ...history];
    saveHistory(newHistory);
  };

  // Clear all history
  const clearHistory = () => {
    saveHistory([]);
  };

  // Clear failed scans only
  const clearFailedScans = () => {
    const successfulScans = history.filter(entry => entry.status === 'success');
    saveHistory(successfulScans);
  };

  // Export history to JSON
  const exportHistory = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vin-scan-history-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter history based on search and filters
  const filteredHistory = history.filter(entry => {
    const matchesSearch = entry.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (entry.imageName && entry.imageName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || entry.source === sourceFilter;
    
    return matchesSearch && matchesStatus && matchesSource;
  });

  const getStatusBadge = (status: 'success' | 'failed') => {
    return (
      <Badge 
        variant={status === 'success' ? 'default' : 'destructive'}
        className="flex items-center gap-1"
      >
        {status === 'success' ? (
          <CheckCircle className="w-3 h-3" />
        ) : (
          <XCircle className="w-3 h-3" />
        )}
        {t(`vin_scanner_history.status_${status}`)}
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => {
    const sourceColors = {
      tesseract: 'bg-blue-100 text-blue-800',
      enhanced: 'bg-green-100 text-green-800',
      'region-detected': 'bg-purple-100 text-purple-800'
    };
    
    return (
      <Badge variant="outline" className={sourceColors[source as keyof typeof sourceColors]}>
        {t(`vin_scanner_history.source_${source}`)}
      </Badge>
    );
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">
              {t('vin_scanner_history.title')}
            </CardTitle>
            <Badge variant="secondary" className="ml-2">
              {filteredHistory.length}
            </Badge>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={exportHistory}
              variant="outline"
              size="sm"
              disabled={history.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t('vin_scanner_history.export')}
            </Button>
            <Button
              onClick={clearFailedScans}
              variant="outline"
              size="sm"
              disabled={history.filter(h => h.status === 'failed').length === 0}
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {t('vin_scanner_history.clear_failed')}
            </Button>
            <Button
              onClick={clearHistory}
              variant="destructive"
              size="sm"
              disabled={history.length === 0}
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t('vin_scanner_history.clear_all')}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('vin_scanner_history.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('vin_scanner_history.all_status')}</SelectItem>
                <SelectItem value="success">{t('vin_scanner_history.status_success')}</SelectItem>
                <SelectItem value="failed">{t('vin_scanner_history.status_failed')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sourceFilter} onValueChange={(value: any) => setSourceFilter(value)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('vin_scanner_history.all_sources')}</SelectItem>
                <SelectItem value="tesseract">{t('vin_scanner_history.source_tesseract')}</SelectItem>
                <SelectItem value="enhanced">{t('vin_scanner_history.source_enhanced')}</SelectItem>
                <SelectItem value="region-detected">{t('vin_scanner_history.source_region_detected')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <History className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all' || sourceFilter !== 'all' 
                  ? t('vin_scanner_history.no_results')
                  : t('vin_scanner_history.no_history')
                }
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredHistory.map((entry, index) => (
                <div key={entry.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                          {entry.vin}
                        </code>
                        {getStatusBadge(entry.status)}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span>{entry.timestamp.toLocaleString()}</span>
                        <Separator orientation="vertical" className="h-4" />
                        {getSourceBadge(entry.source)}
                        <Separator orientation="vertical" className="h-4" />
                        <span>{t('vin_scanner_history.confidence')}: {(entry.confidence * 100).toFixed(1)}%</span>
                        <Separator orientation="vertical" className="h-4" />
                        <span>{t('vin_scanner_history.processing_time')}: {entry.processingTime}ms</span>
                      </div>
                      
                      {entry.imageName && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('vin_scanner_history.image')}: {entry.imageName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}