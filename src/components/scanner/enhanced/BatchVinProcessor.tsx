import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Archive
} from 'lucide-react';
import { useOptimizedVinScanner } from '@/hooks/useOptimizedVinScanner';
import { vinAutoCorrection } from '@/utils/vinAutoCorrection';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface BatchVinResult {
  id: string;
  fileName: string;
  originalText?: string;
  detectedVins: string[];
  validVins: string[];
  confidence: number;
  processingTime: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  corrections?: any[];
  timestamp: Date;
}

interface BatchVinProcessorProps {
  className?: string;
  onVinsProcessed?: (results: BatchVinResult[]) => void;
  maxConcurrent?: number;
}

export function BatchVinProcessor({
  className,
  onVinsProcessed,
  maxConcurrent = 3
}: BatchVinProcessorProps) {
  const { t } = useTranslation();
  const { scanVin } = useOptimizedVinScanner();

  // State management
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<BatchVinResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentlyProcessing, setCurrentlyProcessing] = useState<string[]>([]);

  // Processing queue management
  const processingQueueRef = useRef<BatchVinResult[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  // File upload handler
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    const imageFiles = uploadedFiles.filter(file => file.type.startsWith('image/'));

    if (imageFiles.length !== uploadedFiles.length) {
      toast({ description: t('batch_vin.non_image_files_skipped') });
    }

    // Create initial results
    const newResults: BatchVinResult[] = imageFiles.map(file => ({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: file.name,
      detectedVins: [],
      validVins: [],
      confidence: 0,
      processingTime: 0,
      status: 'pending',
      timestamp: new Date()
    }));

    setFiles(prev => [...prev, ...imageFiles]);
    setResults(prev => [...prev, ...newResults]);
    processingQueueRef.current = [...processingQueueRef.current, ...newResults];

    // Reset file input
    event.target.value = '';
  }, [t]);

  // Process single file
  const processSingleFile = useCallback(async (
    file: File,
    resultId: string
  ): Promise<BatchVinResult> => {
    const startTime = Date.now();

    try {
      // Update status to processing
      setResults(prev => prev.map(r =>
        r.id === resultId ? { ...r, status: 'processing' as const } : r
      ));

      setCurrentlyProcessing(prev => [...prev, resultId]);

      // Scan the VIN
      const scanResult = await scanVin(file, {
        language: 'eng',
        enableLogging: false,
        useCache: true,
        timeout: 20000
      });

      const processingTime = Date.now() - startTime;

      // Apply auto-correction to each detected VIN
      const correctedResults = scanResult.vins.map(vin => {
        const correction = vinAutoCorrection.correctVin(vin);
        return {
          original: vin,
          corrected: correction.correctedVin,
          isValid: correction.isValid,
          confidence: correction.confidence,
          corrections: correction.corrections
        };
      });

      const validVins = correctedResults
        .filter(result => result.isValid)
        .map(result => result.corrected);

      const finalResult: BatchVinResult = {
        id: resultId,
        fileName: file.name,
        detectedVins: scanResult.vins,
        validVins,
        confidence: scanResult.confidence,
        processingTime,
        status: validVins.length > 0 ? 'completed' : 'failed',
        corrections: correctedResults.flatMap(r => r.corrections),
        timestamp: new Date()
      };

      // Update result
      setResults(prev => prev.map(r =>
        r.id === resultId ? finalResult : r
      ));

      return finalResult;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorResult: BatchVinResult = {
        id: resultId,
        fileName: file.name,
        detectedVins: [],
        validVins: [],
        confidence: 0,
        processingTime,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Processing failed',
        timestamp: new Date()
      };

      setResults(prev => prev.map(r =>
        r.id === resultId ? errorResult : r
      ));

      return errorResult;

    } finally {
      setCurrentlyProcessing(prev => prev.filter(id => id !== resultId));
    }
  }, [scanVin]);

  // Start batch processing
  const startProcessing = useCallback(async () => {
    if (isProcessing || processingQueueRef.current.length === 0) return;

    setIsProcessing(true);
    setIsPaused(false);
    abortControllerRef.current = new AbortController();

    const totalFiles = processingQueueRef.current.length;
    let completed = 0;

    // Process files in chunks to respect concurrency limit
    const processChunk = async (chunk: BatchVinResult[]) => {
      const promises = chunk.map(async (result) => {
        if (abortControllerRef.current?.signal.aborted || isPaused) {
          return result;
        }

        const file = files.find(f => f.name === result.fileName);
        if (!file) return result;

        try {
          const processedResult = await processSingleFile(file, result.id);
          completed++;
          setOverallProgress((completed / totalFiles) * 100);
          return processedResult;
        } catch (error) {
          completed++;
          setOverallProgress((completed / totalFiles) * 100);
          throw error;
        }
      });

      return Promise.allSettled(promises);
    };

    try {
      // Process in chunks
      for (let i = 0; i < processingQueueRef.current.length; i += maxConcurrent) {
        if (abortControllerRef.current.signal.aborted || isPaused) break;

        const chunk = processingQueueRef.current.slice(i, i + maxConcurrent);
        await processChunk(chunk);

        // Small delay between chunks to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Processing completed
      const finalResults = results.filter(r => r.status === 'completed' || r.status === 'failed');
      onVinsProcessed?.(finalResults);

      toast({
        title: t('batch_vin.processing_completed'),
        description: `${finalResults.filter(r => r.status === 'completed').length} VINs processed successfully`
      });

    } catch (error) {
      console.error('Batch processing error:', error);
      toast({ variant: 'destructive', description: t('batch_vin.processing_error') });
    } finally {
      setIsProcessing(false);
      setCurrentlyProcessing([]);
      processingQueueRef.current = [];
    }
  }, [isProcessing, isPaused, files, results, maxConcurrent, processSingleFile, onVinsProcessed, t]);

  // Pause/resume processing
  const toggleProcessing = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Stop processing
  const stopProcessing = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsProcessing(false);
    setIsPaused(false);
    setCurrentlyProcessing([]);
    processingQueueRef.current = [];
  }, []);

  // Clear all results
  const clearResults = useCallback(() => {
    setFiles([]);
    setResults([]);
    setOverallProgress(0);
    processingQueueRef.current = [];
  }, []);

  // Export results as CSV
  const exportResults = useCallback(() => {
    const csvHeaders = [
      'File Name',
      'Detected VINs',
      'Valid VINs',
      'Confidence',
      'Processing Time (ms)',
      'Status',
      'Timestamp'
    ].join(',');

    const csvRows = results.map(result => [
      `"${result.fileName}"`,
      `"${result.detectedVins.join('; ')}"`,
      `"${result.validVins.join('; ')}"`,
      result.confidence.toFixed(2),
      result.processingTime,
      result.status,
      result.timestamp.toISOString()
    ].join(','));

    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `vin_batch_results_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }, [results]);

  // Statistics
  const stats = {
    total: results.length,
    completed: results.filter(r => r.status === 'completed').length,
    failed: results.filter(r => r.status === 'failed').length,
    processing: currentlyProcessing.length,
    totalVins: results.reduce((sum, r) => sum + r.validVins.length, 0),
    avgProcessingTime: results.length > 0
      ? results.reduce((sum, r) => sum + r.processingTime, 0) / results.length
      : 0
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                <Archive className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>{t('batch_vin.title')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('batch_vin.subtitle')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {t('batch_vin.max_concurrent')}: {maxConcurrent}
              </Badge>
              <Badge variant="secondary">
                {t('batch_vin.total_vins')}: {stats.totalVins}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="batch-file-upload"
              disabled={isProcessing}
            />
            <label
              htmlFor="batch-file-upload"
              className={cn(
                "cursor-pointer flex flex-col items-center space-y-2",
                isProcessing && "opacity-50 cursor-not-allowed"
              )}
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="text-sm font-medium">{t('batch_vin.upload_images')}</div>
              <div className="text-xs text-muted-foreground">
                {t('batch_vin.supported_formats')}
              </div>
            </label>
          </div>

          {/* Processing Controls */}
          {files.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  onClick={startProcessing}
                  disabled={isProcessing || results.filter(r => r.status === 'pending').length === 0}
                  className="button-enhanced"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {t('batch_vin.start_processing')}
                </Button>

                {isProcessing && (
                  <Button
                    variant="outline"
                    onClick={toggleProcessing}
                  >
                    {isPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                    {isPaused ? t('batch_vin.resume') : t('batch_vin.pause')}
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={stopProcessing}
                  disabled={!isProcessing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  {t('batch_vin.stop')}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={exportResults}
                  disabled={results.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('batch_vin.export_csv')}
                </Button>

                <Button
                  variant="outline"
                  onClick={clearResults}
                  disabled={isProcessing}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {t('batch_vin.clear_all')}
                </Button>
              </div>
            </div>
          )}

          {/* Overall Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t('batch_vin.overall_progress')}</span>
                <span>{overallProgress.toFixed(0)}%</span>
              </div>
              <Progress value={overallProgress} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{t('batch_vin.processing_files')}: {currentlyProcessing.length}</span>
                <span>{stats.completed} / {stats.total} {t('batch_vin.completed')}</span>
              </div>
            </div>
          )}

          {/* Statistics */}
          {results.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-success">{stats.completed}</div>
                <div className="text-xs text-muted-foreground">{t('batch_vin.completed')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
                <div className="text-xs text-muted-foreground">{t('batch_vin.failed')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{stats.totalVins}</div>
                <div className="text-xs text-muted-foreground">{t('batch_vin.total_vins')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent">{stats.avgProcessingTime.toFixed(0)}ms</div>
                <div className="text-xs text-muted-foreground">{t('batch_vin.avg_time')}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results List */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t('batch_vin.processing_results')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <div className="space-y-2 p-4">
                {results.map((result, index) => (
                  <div key={result.id}>
                    <div className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      result.status === 'completed' && "bg-success/5 border-success/20",
                      result.status === 'failed' && "bg-destructive/5 border-destructive/20",
                      result.status === 'processing' && "bg-primary/5 border-primary/20",
                      result.status === 'pending' && "bg-muted/50 border-border"
                    )}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {result.status === 'completed' && <CheckCircle className="w-5 h-5 text-success" />}
                          {result.status === 'failed' && <XCircle className="w-5 h-5 text-destructive" />}
                          {result.status === 'processing' && <Zap className="w-5 h-5 text-primary animate-pulse" />}
                          {result.status === 'pending' && <Clock className="w-5 h-5 text-muted-foreground" />}
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.fileName}</div>
                          <div className="text-sm text-muted-foreground">
                            {result.status === 'completed' && (
                              <>
                                {result.validVins.length} VIN(s) • {result.processingTime}ms • {(result.confidence * 100).toFixed(0)}%
                              </>
                            )}
                            {result.status === 'failed' && result.error}
                            {result.status === 'processing' && t('batch_vin.processing')}
                            {result.status === 'pending' && t('batch_vin.waiting')}
                          </div>
                        </div>

                        {/* VINs Display */}
                        {result.validVins.length > 0 && (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {result.validVins.map((vin, vinIndex) => (
                              <Badge key={vinIndex} variant="outline" className="text-xs font-mono">
                                {vin}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Status Badge */}
                        <Badge
                          variant={
                            result.status === 'completed' ? 'default' :
                            result.status === 'failed' ? 'destructive' :
                            result.status === 'processing' ? 'secondary' : 'outline'
                          }
                          className="flex-shrink-0"
                        >
                          {t(`batch_vin.status_${result.status}`)}
                        </Badge>
                      </div>
                    </div>
                    {index < results.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {files.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Archive className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('batch_vin.no_files')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('batch_vin.upload_instructions')}
            </p>
            <Button onClick={() => document.getElementById('batch-file-upload')?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              {t('batch_vin.select_files')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}