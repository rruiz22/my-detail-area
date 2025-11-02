import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Terminal,
  Play
} from 'lucide-react';
import { migrateOrderNumbers } from '@/utils/migrateOrders';
import { useToast } from '@/hooks/use-toast';

/**
 * Development tool for migrating order numbers
 * Only visible in development environment
 */
export function OrderNumberMigrationTool() {
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const runMigration = async () => {
    setMigrating(true);
    setMigrationStatus('idle');
    
    try {
      console.log('🚀 Starting order number migration...');
      await migrateOrderNumbers();
      
      setMigrationStatus('success');
      toast({ description: 'Order numbers migrated successfully!' });
      
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationStatus('error');
      toast({ variant: 'destructive', description: 'Migration failed. Check console for details.' });
    } finally {
      setMigrating(false);
    }
  };

  // Only show in development
  if (import.meta.env.PROD) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Order Number Migration Tool
          <Badge variant="outline" className="text-xs">DEV ONLY</Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <Terminal className="h-4 w-4" />
          <AlertDescription>
            <strong>Development Tool</strong> - Migrates existing orders to new format:
            <div className="mt-2 font-mono text-sm">
              <div>Sales: SA-2025-00001</div>
              <div>Service: SE-2025-00001</div> 
              <div>Car Wash: CW-2025-00001</div>
              <div>Recon: RC-2025-00001</div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="flex items-center gap-4">
          <Button
            onClick={runMigration}
            disabled={migrating}
            className="flex items-center gap-2"
          >
            {migrating ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Migrating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Migration
              </>
            )}
          </Button>

          {migrationStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Migration completed successfully</span>
            </div>
          )}

          {migrationStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Migration failed - check console</span>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          <p><strong>What this does:</strong></p>
          <ul className="mt-1 list-disc list-inside space-y-1">
            <li>Updates all existing orders to use new numbered format</li>
            <li>Maintains chronological order sequence</li>
            <li>Skips orders that are already correctly formatted</li>
            <li>Updates database records with proper timestamps</li>
          </ul>
        </div>

        <Alert variant="destructive" className="text-xs">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This modifies database records. Test in development environment first.
            Always backup your database before running migrations in production.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}