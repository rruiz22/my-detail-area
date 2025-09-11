import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Bot, 
  Workflow, 
  MessageSquare, 
  Activity,
  Zap,
  Users,
  TrendingUp,
  Settings,
  Sparkles
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/components/DashboardLayout';
import { CommunicationAnalyticsDashboard } from '@/components/analytics/CommunicationAnalyticsDashboard';
import { AIAssistant } from '@/components/ai/AIAssistant';
import { VisualWorkflowBuilder } from '@/components/workflows/VisualWorkflowBuilder';
import { EnhancedChatInterface } from '@/components/chat/EnhancedChatInterface';
import { PerformanceMonitor } from '@/components/performance/PerformanceMonitor';
import { useTabPersistence } from '@/hooks/useTabPersistence';

// Mock data
const mockMessages = [
  {
    id: '1',
    content: 'Hey team, just wanted to update you on the Johnson order progress.',
    user_id: 'user1',
    user_name: 'Mike Johnson',
    user_avatar: undefined,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    message_type: 'text' as const,
    delivery_status: 'read' as const
  },
  {
    id: '2',
    content: 'Thanks for the update! When do we expect completion?',
    user_id: 'user2',
    user_name: 'Sarah Chen',
    created_at: new Date(Date.now() - 3000000).toISOString(),
    message_type: 'text' as const,
    delivery_status: 'read' as const
  },
  {
    id: '3',
    content: 'Should be ready by tomorrow afternoon. I\'ll send photos once it\'s complete.',
    user_id: 'user1',
    user_name: 'Mike Johnson',
    created_at: new Date(Date.now() - 1800000).toISOString(),
    message_type: 'text' as const,
    delivery_status: 'delivered' as const
  }
];

const mockParticipants = [
  {
    id: 'user1',
    name: 'Mike Johnson',
    status: 'online' as const
  },
  {
    id: 'user2',
    name: 'Sarah Chen',
    status: 'online' as const
  },
  {
    id: 'currentUser',
    name: 'You',
    status: 'online' as const
  }
];

export default function Phase3Dashboard() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  const handleSendMessage = (content: string, type?: string, metadata?: any) => {
    console.log('Sending message:', { content, type, metadata });
    // In real implementation, this would send the message via API
  };

  const handleSaveWorkflow = (workflow: any) => {
    console.log('Saving workflow:', workflow);
    // In real implementation, this would save to backend
  };

  return (
    <DashboardLayout title={t('phase3.title', 'Advanced Communication & AI Dashboard')}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-blue-500" />
              {t('phase3.advanced_dashboard', 'Advanced Communication & AI Dashboard')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('phase3.description', 'AI-powered analytics, workflows, and enhanced communication tools')}
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            Phase 3 Complete
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AI Insights Generated</p>
                  <p className="text-2xl font-bold">47</p>
                </div>
                <Bot className="h-8 w-8 text-blue-500" />
              </div>
              <div className="text-xs text-green-600 flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3" />
                +23% this week
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Workflows</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <Workflow className="h-8 w-8 text-purple-500" />
              </div>
              <div className="text-xs text-blue-600 flex items-center gap-1 mt-2">
                <Zap className="h-3 w-3" />
                89% automation rate
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Messages Today</p>
                  <p className="text-2xl font-bold">284</p>
                </div>
                <MessageSquare className="h-8 w-8 text-green-500" />
              </div>
              <div className="text-xs text-green-600 flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3" />
                +15% vs yesterday
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">System Performance</p>
                  <p className="text-2xl font-bold">98.2%</p>
                </div>
                <Activity className="h-8 w-8 text-emerald-500" />
              </div>
              <div className="text-xs text-emerald-600 flex items-center gap-1 mt-2">
                <TrendingUp className="h-3 w-3" />
                Excellent uptime
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('phase3.overview', 'Overview')}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('phase3.analytics', 'Analytics')}
            </TabsTrigger>
            <TabsTrigger value="ai-assistant" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              {t('phase3.ai_assistant', 'AI Assistant')}
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              {t('phase3.workflows', 'Workflows')}
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('phase3.enhanced_chat', 'Enhanced Chat')}
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {t('phase3.performance', 'Performance')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* AI Assistant Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-blue-500" />
                    {t('phase3.ai_quick_help', 'AI Quick Help')}
                  </CardTitle>
                  <CardDescription>
                    {t('phase3.ai_description', 'Get instant insights and assistance')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AIAssistant
                    dealerId={1}
                    context="dashboard"
                    isCompact={true}
                  />
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-500" />
                    {t('phase3.recent_activity', 'Recent Activity')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span>Workflow "Order Follow-up" executed</span>
                      <span className="text-muted-foreground ml-auto">2m ago</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span>AI generated 3 new insights</span>
                      <span className="text-muted-foreground ml-auto">5m ago</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full" />
                      <span>New chat message in Order #SO-1234</span>
                      <span className="text-muted-foreground ml-auto">8m ago</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                      <span>Performance alert resolved</span>
                      <span className="text-muted-foreground ml-auto">12m ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-500" />
                    {t('phase3.system_health', 'System Health')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">API Response Time</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium">142ms</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Database Performance</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium">Excellent</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">AI Processing</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="text-sm font-medium">Active</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Message Queue</span>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-sm font-medium">Healthy</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <CommunicationAnalyticsDashboard dealerId={1} />
          </TabsContent>

          <TabsContent value="ai-assistant">
            <div className="flex justify-center">
              <AIAssistant
                dealerId={1}
                context="general"
                className="w-full max-w-4xl"
              />
            </div>
          </TabsContent>

          <TabsContent value="workflows">
            <VisualWorkflowBuilder
              dealerId={1}
              onSave={handleSaveWorkflow}
              editingWorkflow={selectedWorkflow}
            />
          </TabsContent>

          <TabsContent value="chat">
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  {t('phase3.enhanced_chat_demo', 'Enhanced Chat Demo')}
                </CardTitle>
                <CardDescription>
                  {t('phase3.chat_description', 'Advanced chat interface with threading, reactions, and rich media')}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 h-full">
                <EnhancedChatInterface
                  conversationId="demo-conversation"
                  messages={mockMessages}
                  participants={mockParticipants}
                  currentUserId="currentUser"
                  onSendMessage={handleSendMessage}
                  allowVoice={true}
                  allowFiles={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceMonitor dealerId={1} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}