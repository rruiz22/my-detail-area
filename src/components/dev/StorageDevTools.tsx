/**
 * Development tools for testing localStorage system without cloud sync
 * Only shown in development mode
 */
import React, { useState, useEffect } from 'react';
import { storage } from '@/lib/localStorage';
import { developmentConfig } from '@/config/development';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const StorageDevTools: React.FC = () => {
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [keys, setKeys] = useState<string[]>([]);
  const [testKey, setTestKey] = useState('dev-test');
  const [testValue, setTestValue] = useState('{"test": true, "timestamp": ' + Date.now() + '}');
  const [retrieveKey, setRetrieveKey] = useState('');
  const [retrievedValue, setRetrievedValue] = useState<any>(null);
  const [testResults, setTestResults] = useState<string[]>([]);

  // Only show in development
  if (!developmentConfig.features.enableStorageDebug) {
    return null;
  }

  const refreshInfo = () => {
    const info = storage.getStorageInfo();
    const allKeys = storage.getKeys();
    setStorageInfo(info);
    setKeys(allKeys);
  };

  useEffect(() => {
    refreshInfo();
  }, []);

  const runQuickTest = () => {
    const results: string[] = [];
    
    try {
      // Test 1: Basic set/get
      const testData = { test: true, timestamp: Date.now() };
      storage.set('quick-test', testData);
      const retrieved = storage.get('quick-test', null);
      
      if (JSON.stringify(retrieved) === JSON.stringify(testData)) {
        results.push('✅ Basic set/get: PASSED');
      } else {
        results.push('❌ Basic set/get: FAILED');
      }
      
      // Test 2: Namespace isolation
      storage.set('test-key', { value: 'A' }, { namespace: 'namespace-a' });
      storage.set('test-key', { value: 'B' }, { namespace: 'namespace-b' });
      
      const valueA = storage.get('test-key', null, { namespace: 'namespace-a' });
      const valueB = storage.get('test-key', null, { namespace: 'namespace-b' });
      
      if (valueA?.value === 'A' && valueB?.value === 'B') {
        results.push('✅ Namespace isolation: PASSED');
      } else {
        results.push('❌ Namespace isolation: FAILED');
      }
      
      // Test 3: Expiration
      storage.set('expiry-test', { data: 'temp' }, { expiration: 100 });
      const immediate = storage.get('expiry-test', null);
      if (immediate) {
        results.push('✅ Expiration setup: PASSED');
      } else {
        results.push('❌ Expiration setup: FAILED');
      }
      
      // Test 4: Cloud sync disabled in development
      if (!developmentConfig.storage.enableCloudSync) {
        results.push('✅ Cloud sync disabled in dev: PASSED');
      } else {
        results.push('⚠️ Cloud sync enabled in dev: WARNING');
      }
      
      // Test 5: Error handling
      try {
        const invalidResult = storage.get('non-existent', { default: true });
        if (invalidResult.default === true) {
          results.push('✅ Default value handling: PASSED');
        } else {
          results.push('❌ Default value handling: FAILED');
        }
      } catch (error) {
        results.push('❌ Error handling: FAILED');
      }
      
    } catch (error) {
      results.push('❌ Test suite crashed: ' + error);
    }
    
    setTestResults(results);
    refreshInfo();
  };

  const setTestData = () => {
    try {
      const parsedValue = JSON.parse(testValue);
      const success = storage.set(testKey, parsedValue);
      if (success) {
        setTestResults(prev => [...prev, `✅ Set '${testKey}': SUCCESS`]);
      } else {
        setTestResults(prev => [...prev, `❌ Set '${testKey}': FAILED`]);
      }
      refreshInfo();
    } catch (error) {
      setTestResults(prev => [...prev, `❌ Invalid JSON for '${testKey}': ${error}`]);
    }
  };

  const retrieveData = () => {
    try {
      const value = storage.get(retrieveKey, null);
      setRetrievedValue(value);
      setTestResults(prev => [...prev, `📦 Retrieved '${retrieveKey}': ${value ? 'FOUND' : 'NOT FOUND'}`]);
    } catch (error) {
      setTestResults(prev => [...prev, `❌ Retrieve '${retrieveKey}': ERROR - ${error}`]);
    }
  };

  const clearTestData = () => {
    storage.clear();
    setTestResults(prev => [...prev, '🧹 Cleared all test data']);
    refreshInfo();
  };

  const testTabPersistence = () => {
    const pages = ['sales', 'inventory', 'reports', 'settings'];
    const tabs = ['overview', 'details', 'analytics', 'history'];
    
    pages.forEach(page => {
      const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
      storage.set(`pages.${page}.activeTab`, randomTab);
    });
    
    setTestResults(prev => [...prev, '🔄 Simulated tab state for all pages']);
    refreshInfo();
  };

  return (
    <Card className="mt-4 border-yellow-200 bg-yellow-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🛠️ Storage Development Tools
          <Badge variant="outline">Dev Only</Badge>
        </CardTitle>
        <CardDescription>
          Test localStorage functionality without cloud sync. Current mode: {developmentConfig.storage.namespace}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="test">Quick Test</TabsTrigger>
            <TabsTrigger value="manual">Manual Test</TabsTrigger>
            <TabsTrigger value="logs">Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Storage Info</CardTitle>
                </CardHeader>
                <CardContent>
                  {storageInfo && (
                    <div className="text-sm space-y-1">
                      <div>Keys: {storageInfo.keys}</div>
                      <div>Size: {storageInfo.totalSizeKB} KB</div>
                      <div>Available: {storageInfo.available ? '✅' : '❌'}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    <div>Namespace: {developmentConfig.storage.namespace}</div>
                    <div>Cloud Sync: {developmentConfig.storage.enableCloudSync ? '🟢' : '🔴'}</div>
                    <div>Verbose: {developmentConfig.storage.verboseLogging ? '🟢' : '🔴'}</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Current Keys</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs space-y-1 max-h-20 overflow-y-auto">
                    {keys.length > 0 ? (
                      keys.map(key => (
                        <div key={key} className="truncate">{key}</div>
                      ))
                    ) : (
                      <div>No keys found</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={refreshInfo} variant="outline" size="sm">
                🔄 Refresh
              </Button>
              <Button onClick={testTabPersistence} variant="outline" size="sm">
                🔄 Test Tab Persistence
              </Button>
              <Button onClick={clearTestData} variant="destructive" size="sm">
                🧹 Clear All
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="test" className="space-y-4">
            <div>
              <Button onClick={runQuickTest} className="w-full">
                🧪 Run Quick Test Suite
              </Button>
            </div>
            
            {testResults.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1 max-h-40 overflow-y-auto">
                    {testResults.map((result, index) => (
                      <div key={index} className="font-mono">{result}</div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="manual" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Set Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label htmlFor="test-key">Key</Label>
                    <Input
                      id="test-key"
                      value={testKey}
                      onChange={(e) => setTestKey(e.target.value)}
                      placeholder="test-key"
                    />
                  </div>
                  <div>
                    <Label htmlFor="test-value">Value (JSON)</Label>
                    <Textarea
                      id="test-value"
                      value={testValue}
                      onChange={(e) => setTestValue(e.target.value)}
                      placeholder='{"key": "value"}'
                      rows={3}
                    />
                  </div>
                  <Button onClick={setTestData} size="sm">
                    💾 Set Data
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Get Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label htmlFor="retrieve-key">Key</Label>
                    <Input
                      id="retrieve-key"
                      value={retrieveKey}
                      onChange={(e) => setRetrieveKey(e.target.value)}
                      placeholder="key-to-retrieve"
                    />
                  </div>
                  <Button onClick={retrieveData} size="sm">
                    📦 Get Data
                  </Button>
                  {retrievedValue !== null && (
                    <div className="mt-2">
                      <Label>Retrieved Value:</Label>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(retrievedValue, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Activity Log</CardTitle>
                <CardDescription>
                  All storage operations and test results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1 max-h-60 overflow-y-auto font-mono">
                  {testResults.length > 0 ? (
                    testResults.map((result, index) => (
                      <div key={index} className="border-b border-gray-100 pb-1">
                        <span className="text-gray-500">[{new Date().toLocaleTimeString()}]</span> {result}
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500">No activity yet...</div>
                  )}
                </div>
                <Button 
                  onClick={() => setTestResults([])} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                >
                  Clear Logs
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};