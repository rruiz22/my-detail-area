/**
 * Notification Analytics Dashboard Integration Examples
 *
 * This file demonstrates various ways to integrate the analytics dashboard
 * into your MyDetailArea application.
 */

import React from 'react';
import { NotificationAnalyticsDashboard } from '@/components/notifications/analytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

// ========================================
// Example 1: Basic Integration in Settings
// ========================================

export function NotificationSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Notification Settings</h1>
        <p className="text-gray-600">Manage your notification preferences and analytics</p>
      </div>

      <Tabs defaultValue="preferences">
        <TabsList>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences">
          {/* Your existing preferences UI */}
        </TabsContent>

        <TabsContent value="analytics">
          <NotificationAnalyticsDashboard dealerId={user?.dealer_id} />
        </TabsContent>

        <TabsContent value="templates">
          {/* Your templates UI */}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========================================
// Example 2: Standalone Analytics Page
// ========================================

export function AnalyticsPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationAnalyticsDashboard
        dealerId={user?.dealer_id}
        defaultFilters={{
          timeRange: '7d',
          channels: ['push', 'email'],
        }}
      />
    </div>
  );
}

// ========================================
// Example 3: Dashboard with Custom Filters
// ========================================

export function CustomAnalyticsDashboard() {
  const { user } = useAuth();
  const [selectedChannel, setSelectedChannel] = React.useState<string>('all');

  return (
    <div className="container mx-auto py-8">
      {/* Custom filter UI */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quick Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedChannel('all')}
              className="px-4 py-2 rounded-lg border"
            >
              All Channels
            </button>
            <button
              onClick={() => setSelectedChannel('push')}
              className="px-4 py-2 rounded-lg border"
            >
              Push Only
            </button>
            <button
              onClick={() => setSelectedChannel('email')}
              className="px-4 py-2 rounded-lg border"
            >
              Email Only
            </button>
          </div>
        </CardContent>
      </Card>

      <NotificationAnalyticsDashboard
        dealerId={user?.dealer_id}
        defaultFilters={{
          timeRange: '30d',
          channels: selectedChannel !== 'all' ? [selectedChannel as any] : undefined,
        }}
      />
    </div>
  );
}

// ========================================
// Example 4: Using Individual Components
// ========================================

import {
  MetricsOverview,
  DeliveryTimelineChart,
  EngagementFunnel,
  ChannelPerformanceChart,
  ProviderComparisonChart,
  FailedDeliveriesTable,
} from '@/components/notifications/analytics';

import {
  useNotificationMetrics,
  useDeliveryTimeline,
  useProviderPerformance,
  useFailedDeliveries,
} from '@/hooks';

export function CustomDashboardLayout() {
  const { user } = useAuth();

  const { overview, deliveryMetrics, loading: metricsLoading } = useNotificationMetrics(
    user?.dealer_id,
    { timeRange: '7d' }
  );

  const { timeSeriesData, loading: timelineLoading } = useDeliveryTimeline(user?.dealer_id, {
    timeRange: '7d',
  });

  const { providers, loading: providersLoading } = useProviderPerformance(user?.dealer_id, {
    timeRange: '7d',
  });

  const { failures, loading: failuresLoading, retry } = useFailedDeliveries(user?.dealer_id, {
    timeRange: '24h',
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Overview Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Performance Overview</h2>
        <MetricsOverview overview={overview} loading={metricsLoading} />
      </section>

      {/* Timeline Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Delivery Timeline</h2>
        <DeliveryTimelineChart data={timeSeriesData} loading={timelineLoading} />
      </section>

      {/* Two Column Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Engagement Funnel</h2>
          <EngagementFunnel overview={overview} loading={metricsLoading} />
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Channel Performance</h2>
          <ChannelPerformanceChart data={deliveryMetrics} loading={metricsLoading} />
        </div>
      </section>

      {/* Provider Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Provider Comparison</h2>
        <ProviderComparisonChart data={providers} loading={providersLoading} />
      </section>

      {/* Failures Section */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Failures</h2>
        <FailedDeliveriesTable
          data={failures}
          loading={failuresLoading}
          onRetry={retry}
        />
      </section>
    </div>
  );
}

// ========================================
// Example 5: Management Dashboard with Analytics
// ========================================

export function ManagementDashboard() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            {/* System health indicators */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Active users count */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {/* System alerts */}
          </CardContent>
        </Card>
      </div>

      {/* Full Analytics Dashboard */}
      <NotificationAnalyticsDashboard
        dealerId={user?.dealer_id}
        defaultFilters={{
          timeRange: '30d',
          priorities: ['high', 'urgent', 'critical'],
        }}
      />
    </div>
  );
}

// ========================================
// Example 6: Mobile-Friendly Analytics
// ========================================

export function MobileAnalyticsView() {
  const { user } = useAuth();
  const [activeView, setActiveView] = React.useState('overview');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3">
        <select
          value={activeView}
          onChange={(e) => setActiveView(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="overview">Overview</option>
          <option value="timeline">Timeline</option>
          <option value="channels">Channels</option>
          <option value="failures">Failures</option>
        </select>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeView === 'overview' && (
          <NotificationAnalyticsDashboard dealerId={user?.dealer_id} />
        )}
        {/* Add other views as needed */}
      </div>
    </div>
  );
}

// ========================================
// Example 7: Real-time Monitoring Dashboard
// ========================================

export function RealtimeMonitoringDashboard() {
  const { user } = useAuth();
  const [autoRefresh, setAutoRefresh] = React.useState(true);
  const [refreshInterval, setRefreshInterval] = React.useState(30000); // 30 seconds

  React.useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Refresh logic handled by dashboard internally
      console.log('Auto-refreshing analytics data...');
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  return (
    <div className="container mx-auto py-8">
      {/* Control Panel */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Monitoring Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span>Auto-refresh</span>
              </label>

              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                disabled={!autoRefresh}
                className="px-3 py-1 border rounded"
              >
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
                <option value={60000}>1m</option>
                <option value={300000}>5m</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`}
              />
              <span className="text-sm text-gray-600">
                {autoRefresh ? 'Live' : 'Paused'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <NotificationAnalyticsDashboard
        dealerId={user?.dealer_id}
        defaultFilters={{
          timeRange: '24h', // Real-time monitoring uses 24h window
        }}
      />
    </div>
  );
}

// ========================================
// Example 8: Route Configuration
// ========================================

// In your App.tsx or router configuration:
/*
import { Routes, Route } from 'react-router-dom';

<Routes>
  <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
  <Route path="/analytics" element={<AnalyticsPage />} />
  <Route path="/management" element={<ManagementDashboard />} />
  <Route path="/monitoring" element={<RealtimeMonitoringDashboard />} />
</Routes>
*/
