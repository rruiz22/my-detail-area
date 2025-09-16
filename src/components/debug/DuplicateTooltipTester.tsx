/**
 * Comprehensive Duplicate Tooltip Testing Component
 * 
 * This component provides a comprehensive testing environment for the
 * DuplicateTooltip functionality with real-time debugging and validation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { 
  RefreshCw, 
  Play, 
  AlertCircle, 
  CheckCircle, 
  Settings, 
  Bug,
  Eye,
  Copy,
  TestTube
} from 'lucide-react';
import { DuplicateTooltip } from '@/components/ui/duplicate-tooltip';
import { DuplicateBadge } from '@/components/ui/duplicate-badge';
import { duplicateTestDataGenerator } from '@/utils/duplicateTestData';
import { getDuplicateCount, getDuplicateOrders, Order } from '@/utils/duplicateUtils';
import { toast } from 'sonner';

export function DuplicateTooltipTester() {
  const [testOrders, setTestOrders] = useState<Order[]>([]);
  const [debugMode, setDebugMode] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState<'quick' | 'comprehensive' | 'edge-cases'>('quick');

  // Auto-generate quick test data on mount
  useEffect(() => {
    generateQuickTestData();
  }, [generateQuickTestData]);

  const generateQuickTestData = useCallback(() => {
    console.log('🚀 Generating quick test data...');
    const quickData = duplicateTestDataGenerator.createQuickTestData();
    setTestOrders(quickData);
    validateTestResults(quickData);
    toast.success('Quick test data generated with guaranteed duplicates');
  }, []);

  const generateComprehensiveTestData = () => {
    setIsLoading(true);
    console.log('🧪 Generating comprehensive test data...');
    
    setTimeout(() => {
      const testData = duplicateTestDataGenerator.generateTestData({
        totalOrders: 50,
        duplicateStockRatio: 0.4,
        duplicateVinRatio: 0.3,
        dealerIds: [1, 2, 3],
        includeEdgeCases: true
      });
      
      setTestOrders(testData.orders);
      setTestResults(testData);
      validateTestResults(testData.orders);
      setIsLoading(false);
      toast.success(`Generated ${testData.orders.length} orders with ${testData.metadata.expectedDuplicates} duplicate groups`);
    }, 100);
  };

  const generateEdgeCases = () => {
    console.log('⚠️ Generating edge case test data...');
    const edgeCases: Order[] = [
      {
        id: 'edge-case-1',
        createdAt: new Date().toISOString(),
        stockNumber: '', // Empty stock number
        vehicleVin: 'EMPTY-VIN-TEST',
        customerName: 'Edge Case Customer 1',
        status: 'pending',
        dealer_id: 1,
        dealershipName: 'Test Dealer'
      },
      {
        id: 'edge-case-2',
        createdAt: new Date().toISOString(),
        stockNumber: 'VERY-LONG-STOCK-NUMBER-THAT-SHOULD-BE-TRUNCATED-IN-TOOLTIP',
        vehicleVin: 'VERY-LONG-VIN-NUMBER-THAT-SHOULD-BE-HANDLED-PROPERLY-IN-TOOLTIP',
        customerName: 'Edge Case Customer 2',
        status: 'in_progress',
        dealer_id: 1,
        dealershipName: 'Test Dealer'
      },
      {
        id: 'edge-case-3',
        createdAt: new Date().toISOString(),
        stockNumber: 'CASE-SENSITIVE-test',
        vehicleVin: 'case-sensitive-VIN-test',
        customerName: 'Edge Case Customer 3',
        status: 'completed',
        dealer_id: 1,
        dealershipName: 'Test Dealer'
      },
      {
        id: 'edge-case-4',
        createdAt: new Date().toISOString(),
        stockNumber: 'CASE-SENSITIVE-TEST', // Should match previous one (case insensitive)
        vehicleVin: 'CASE-SENSITIVE-VIN-TEST', // Should match previous one (case insensitive)
        customerName: 'Edge Case Customer 4',
        status: 'cancelled',
        dealer_id: 1,
        dealershipName: 'Test Dealer'
      }
    ];

    setTestOrders(edgeCases);
    validateTestResults(edgeCases);
    toast.info('Edge case test data generated');
  };

  const validateTestResults = (orders: Order[]) => {
    const validation = duplicateTestDataGenerator.validateTestData(orders);
    setTestResults(validation);
    
    if (validation.isValid) {
      console.log('✅ Test data validation passed:', validation);
    } else {
      console.warn('⚠️ Test data validation issues:', validation.issues);
    }
  };

  const runFullDiagnostic = () => {
    console.log('🔧 Running full tooltip diagnostic...');
    
    // Test tooltip implementation
    const hasTooltipProvider = !!document.querySelector('[data-radix-tooltip-provider]');
    const hasRadixTooltip = !!document.querySelector('[data-radix-tooltip-trigger]');
    const hasCustomTooltip = !!document.querySelector('[data-duplicate-tooltip]');
    
    const diagnosticResults = {
      hasTooltipProvider,
      hasRadixTooltip,
      hasCustomTooltip,
      testOrdersCount: testOrders.length,
      duplicateOrdersFound: testOrders.filter((order, index, arr) => 
        getDuplicateCount(arr, 'stockNumber', order.stockNumber, order.dealer_id) > 1 ||
        getDuplicateCount(arr, 'vehicleVin', order.vehicleVin, order.dealer_id) > 1
      ).length
    };
    
    console.table(diagnosticResults);
    toast.info('Diagnostic complete - check console for details');
  };

  const copyTestData = () => {
    const testDataJson = JSON.stringify(testOrders, null, 2);
    navigator.clipboard.writeText(testDataJson);
    toast.success('Test data copied to clipboard');
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            Duplicate Tooltip Tester
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comprehensive testing environment for duplicate badge tooltips
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={debugMode} onCheckedChange={setDebugMode} />
                <label className="text-sm">Debug Mode</label>
              </div>
              <Badge variant="outline">{testOrders.length} Test Orders</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyTestData}
                className="flex items-center gap-1"
              >
                <Copy className="w-4 h-4" />
                Copy Data
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={runFullDiagnostic}
                className="flex items-center gap-1"
              >
                <Bug className="w-4 h-4" />
                Diagnose
              </Button>
            </div>
          </div>

          {/* Test Data Generation */}
          <div className="flex gap-2">
            <Button
              variant={selectedTest === 'quick' ? 'default' : 'outline'}
              onClick={() => {
                setSelectedTest('quick');
                generateQuickTestData();
              }}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <Play className="w-4 h-4" />
              Quick Test
            </Button>
            <Button
              variant={selectedTest === 'comprehensive' ? 'default' : 'outline'}
              onClick={() => {
                setSelectedTest('comprehensive');
                generateComprehensiveTestData();
              }}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
              Comprehensive
            </Button>
            <Button
              variant={selectedTest === 'edge-cases' ? 'default' : 'outline'}
              onClick={() => {
                setSelectedTest('edge-cases');
                generateEdgeCases();
              }}
              disabled={isLoading}
              className="flex items-center gap-1"
            >
              <AlertCircle className="w-4 h-4" />
              Edge Cases
            </Button>
          </div>

          {/* Validation Results */}
          {testResults && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  {testResults.isValid ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-medium">
                    Validation {testResults.isValid ? 'Passed' : 'Failed'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>Stock Duplicates: <Badge variant="secondary">{testResults.stockDuplicates || 0}</Badge></div>
                  <div>VIN Duplicates: <Badge variant="secondary">{testResults.vinDuplicates || 0}</Badge></div>
                </div>
                {testResults.issues?.length > 0 && (
                  <div className="mt-2 text-xs text-destructive">
                    Issues: {testResults.issues.join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Test Cases Display */}
      <Card>
        <CardHeader>
          <CardTitle>Test Cases</CardTitle>
          <p className="text-sm text-muted-foreground">
            Hover over stock numbers and VINs to test tooltip functionality
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testOrders.map((order) => {
              const stockDuplicates = getDuplicateOrders(testOrders, 'stockNumber', order.stockNumber, order.dealer_id);
              const vinDuplicates = getDuplicateOrders(testOrders, 'vehicleVin', order.vehicleVin, order.dealer_id);
              
              return (
                <Card key={order.id} className="border-border">
                  <CardContent className="p-4 space-y-3">
                    {/* Order Header */}
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{order.id.slice(-8)}</div>
                      <Badge variant="outline" className="text-xs">{order.status}</Badge>
                    </div>

                    {/* Stock Number Test */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground uppercase tracking-wide">Stock Number</label>
                      <div className="relative inline-block">
                        <DuplicateTooltip
                          orders={stockDuplicates}
                          field="stockNumber"
                          value={order.stockNumber || ''}
                          onOrderClick={(order) => {
                            console.log('Order clicked:', order.id);
                            toast.info(`Clicked order: ${order.id}`);
                          }}
                          debug={debugMode}
                        >
                          <div className="text-sm font-semibold text-foreground cursor-pointer hover:text-blue-600 p-2 rounded border border-transparent hover:border-border transition-colors">
                            {order.stockNumber || 'No Stock'}
                          </div>
                        </DuplicateTooltip>
                        <DuplicateBadge count={stockDuplicates.length} />
                      </div>
                    </div>

                    <Separator />

                    {/* VIN Test */}
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground uppercase tracking-wide">VIN</label>
                      <div className="relative inline-block">
                        <DuplicateTooltip
                          orders={vinDuplicates}
                          field="vehicleVin"
                          value={order.vehicleVin || ''}
                          onOrderClick={(order) => {
                            console.log('Order clicked:', order.id);
                            toast.info(`Clicked order: ${order.id}`);
                          }}
                          debug={debugMode}
                        >
                          <div className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-orange-600 p-2 rounded border border-transparent hover:border-border transition-colors">
                            {order.vehicleVin || 'No VIN'}
                          </div>
                        </DuplicateTooltip>
                        <DuplicateBadge count={vinDuplicates.length} />
                      </div>
                    </div>

                    {/* Debug Info */}
                    {debugMode && (
                      <div className="text-xs text-muted-foreground">
                        <div>Stock: {stockDuplicates.length} duplicate(s)</div>
                        <div>VIN: {vinDuplicates.length} duplicate(s)</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {testOrders.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <TestTube className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No test data generated yet</p>
              <p className="text-xs">Click a test button above to generate test orders</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}