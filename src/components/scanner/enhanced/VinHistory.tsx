import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  History, 
  Search, 
  Download, 
  Trash2, 
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface VinHistoryEntry {
  id: string;
  vin: string;
  isValid: boolean;
  confidence: number;
  scannedAt: string;
  source: 'camera' | 'upload' | 'manual';
  processingTime?: number;
}

interface VinHistoryProps {
  className?: string;
  onVinSelect?: (vin: string) => void;
}

export function VinHistory({ className, onVinSelect }: VinHistoryProps) {
  const { t } = useTranslation();
  const [history, setHistory] = useState<VinHistoryEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredHistory, setFilteredHistory] = useState<VinHistoryEntry[]>([]);

  // Load history from localStorage
  useEffect(() => {
    const loadHistory = () => {
      try {
        const storedHistory = localStorage.getItem('vinScannerHistory');
        if (storedHistory) {
          const parsed = JSON.parse(storedHistory);
          setHistory(parsed || []);
        }
      } catch (error) {
        console.error('Error loading VIN history:', error);
      }
    };

    loadHistory();

    // Listen for storage changes (when other components add to history)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vinScannerHistory') {
        loadHistory();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filter history based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredHistory(history);
    } else {
      const filtered = history.filter(entry =>
        entry.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        format(new Date(entry.scannedAt), 'PPP').toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredHistory(filtered);
    }
  }, [history, searchTerm]);

  const clearHistory = () => {
    localStorage.removeItem('vinScannerHistory');
    setHistory([]);
    toast.success('VIN history cleared');
  };

  const copyVin = (vin: string) => {
    navigator.clipboard.writeText(vin);
    toast.success('VIN copied to clipboard');
  };

  const deleteEntry = (id: string) => {
    const newHistory = history.filter(entry => entry.id !== id);
    localStorage.setItem('vinScannerHistory', JSON.stringify(newHistory));
    setHistory(newHistory);
    toast.success('Entry removed from history');
  };

  const exportHistory = () => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `vin-history-${format(new Date(), 'yyyy-MM-dd')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('VIN history exported');
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'camera': return '📷';
      case 'upload': return '📁';
      case 'manual': return '✏️';
      default: return '📄';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'camera': return 'Camera';
      case 'upload': return 'Upload';
      case 'manual': return 'Manual';
      default: return 'Unknown';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            <div>
              <CardTitle>VIN History</CardTitle>
              <CardDescription>
                {history.length} {history.length === 1 ? 'scan' : 'scans'} recorded
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={exportHistory}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={clearHistory}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
        
        {history.length > 0 && (
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search VIN or date..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        )}
      </CardHeader>

      <CardContent>
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8">
            <History className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              {searchTerm ? 'No matches found' : 'No scan history'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm 
                ? 'Try adjusting your search terms' 
                : 'Your VIN scanning history will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getSourceIcon(entry.source)}</span>
                    <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                      {entry.vin}
                    </code>
                    {entry.isValid ? (
                      <CheckCircle className="w-4 h-4 text-success" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive" />
                    )}
                    <Badge variant={entry.isValid ? "default" : "destructive"} className="text-xs">
                      {Math.round(entry.confidence * 100)}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(entry.scannedAt), 'PPP p')}
                    </div>
                    <div>Source: {getSourceLabel(entry.source)}</div>
                    {entry.processingTime && (
                      <div>{entry.processingTime}ms</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onVinSelect?.(entry.vin)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyVin(entry.vin)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteEntry(entry.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}