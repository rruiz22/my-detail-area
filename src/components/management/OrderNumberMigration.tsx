import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { Loader2, Database, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { runOrderNumberMigration } from '@/scripts/migrateOrderNumbers';
import { useToast } from '@/hooks/use-toast';

export function OrderNumberMigration() {
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);

  const handleRunMigration = async () => {
    setIsRunning(true);
    setMigrationStatus('running');
    setLogs([]);

    // Capture console logs
    const originalLog = console.log;
    const capturedLogs: string[] = [];
    
    console.log = (...args) => {
      const message = args.join(' ');
      capturedLogs.push(message);
      setLogs(prev => [...prev, message]);
      originalLog(...args);
    };

    try {
      await runOrderNumberMigration();
      setMigrationStatus('completed');
      toast({ description: 'Order number migration completed successfully!' });
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationStatus('error');
      toast({ variant: 'destructive', description: 'Migration failed. Check console for details.' });
    } finally {
      console.log = originalLog;
      setIsRunning(false);
    }
  };

  const getStatusColor = () => {
    switch (migrationStatus) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (migrationStatus) {
      case 'running': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Order Number Migration
          </CardTitle>
          <Badge className={getStatusColor()}>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              {migrationStatus.charAt(0).toUpperCase() + migrationStatus.slice(1)}
            </div>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This migration will update all existing order numbers to the new format:
            <ul className="mt-2 space-y-1">
              <li><code>SA-000001</code> - Sales orders</li>
              <li><code>SE-000001</code> - Service orders</li>
              <li><code>CW-000001</code> - Car wash orders</li>
              <li><code>RC-000001</code> - Recon orders</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4">
          <Button 
            onClick={handleRunMigration} 
            disabled={isRunning}
            size="lg"
            className="flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Migration...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Run Migration
              </>
            )}
          </Button>

          {migrationStatus === 'completed' && (
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Refresh Page
            </Button>
          )}
        </div>

        {logs.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Migration Logs:</h3>
            <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {logs.join('\n')}
              </pre>
            </div>
          </div>
        )}

        {migrationStatus === 'error' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Migration failed. Please check the logs above and console for more details.
            </AlertDescription>
          </Alert>
        )}

        {migrationStatus === 'completed' && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Migration completed successfully! All order numbers have been updated to the new format.
              Please refresh the page to see the changes.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}