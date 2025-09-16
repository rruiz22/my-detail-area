import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  MessageSquare,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  BarChart3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

interface AIAssistantData {
  insights?: {
    confidence_score: number;
    data_sources: string[];
    recommendations: string[];
  };
  order_info?: {
    order_id: string;
    status: string;
    next_milestone?: string;
  };
  analytics?: {
    metrics: Record<string, number>;
    trends: Array<{ metric: string; change: number; period: string }>;
  };
  communication?: {
    template_type: 'status_update' | 'completion' | 'delay';
    suggested_message: string;
  };
}

interface AIMessage {
  id: string;
  type: 'user' | 'assistant' | 'suggestion' | 'insight';
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    sources?: string[];
    action?: string;
    data?: AIAssistantData;
  };
}

interface AIAssistantProps {
  dealerId: number;
  orderId?: string;
  context?: 'order' | 'dashboard' | 'analytics' | 'general';
  className?: string;
  isCompact?: boolean;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  dealerId,
  orderId,
  context = 'general',
  className = '',
  isCompact = false
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getWelcomeMessage = useCallback((ctx: string): string => {
    switch (ctx) {
      case 'order':
        return t('ai.welcome_order', 'Hi! I can help you with this order. Ask me about status updates, customer communication, or next steps.');
      case 'dashboard':
        return t('ai.welcome_dashboard', 'Welcome! I can help you understand your dashboard metrics, identify trends, or suggest improvements.');
      case 'analytics':
        return t('ai.welcome_analytics', 'I can help you interpret your analytics data, find insights, and make data-driven recommendations.');
      default:
        return t('ai.welcome_general', 'Hello! I\'m your AI assistant. I can help with orders, analytics, customer communication, and more.');
    }
  }, [t]);

  const getContextualSuggestions = useCallback((ctx: string): AIMessage[] => {
    const suggestions = {
      order: [
        t('ai.suggest_order_status', 'What\'s the current status of this order?'),
        t('ai.suggest_order_timeline', 'Show me the timeline for this order'),
        t('ai.suggest_order_communication', 'Draft a customer update message')
      ],
      dashboard: [
        t('ai.suggest_dashboard_trends', 'What trends do you see in my data?'),
        t('ai.suggest_dashboard_performance', 'How is my team performing today?'),
        t('ai.suggest_dashboard_alerts', 'Are there any issues I should know about?')
      ],
      analytics: [
        t('ai.suggest_analytics_insights', 'What are the key insights from this data?'),
        t('ai.suggest_analytics_predictions', 'What predictions can you make?'),
        t('ai.suggest_analytics_recommendations', 'What improvements do you recommend?')
      ],
      general: [
        t('ai.suggest_general_help', 'What can you help me with?'),
        t('ai.suggest_general_status', 'Show me today\'s overview'),
        t('ai.suggest_general_tasks', 'What should I focus on today?')
      ]
    };

    return (suggestions[ctx] || suggestions.general).map((content, index) => ({
      id: `suggestion-${ctx}-${index}`,
      type: 'suggestion' as const,
      content,
      timestamp: new Date(),
      metadata: { action: 'suggestion' }
    }));
  }, [t]);

  // Initialize with contextual welcome message and suggestions
  useEffect(() => {
    const initializeAssistant = () => {
      const welcomeMessage: AIMessage = {
        id: `welcome-${Date.now()}`,
        type: 'assistant',
        content: getWelcomeMessage(context),
        timestamp: new Date(),
        metadata: { confidence: 100 }
      };

      const suggestions = getContextualSuggestions(context);

      setMessages([welcomeMessage, ...suggestions]);
    };

    initializeAssistant();
  }, [context, orderId, getWelcomeMessage, getContextualSuggestions]);


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message?: string) => {
    const messageContent = message || input.trim();
    if (!messageContent || isLoading) return;

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: messageContent,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Simulate AI processing with contextual responses
      const response = await processAIMessage(messageContent, context, orderId);
      
      setTimeout(() => {
        setMessages(prev => [...prev, response]);
        setIsLoading(false);
      }, 1000 + Math.random() * 2000);

    } catch (error) {
      console.error('AI Assistant error:', error);
      const errorMessage: AIMessage = {
        id: `error-${Date.now()}`,
        type: 'assistant',
        content: t('ai.error_message', 'I\'m sorry, I encountered an error. Please try again.'),
        timestamp: new Date(),
        metadata: { confidence: 0 }
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const processAIMessage = async (message: string, ctx: string, orderId?: string): Promise<AIMessage> => {
    // Mock AI processing - in real implementation, this would call your AI service
    const responses = {
      status: {
        content: t('ai.response_status', 'Based on the current data, your order is progressing well. The next milestone is scheduled for tomorrow at 2 PM.'),
        metadata: { confidence: 85, sources: ['order_tracking', 'schedule'] }
      },
      trends: {
        content: t('ai.response_trends', 'I\'ve identified a 15% increase in customer satisfaction this week, primarily due to faster response times.'),
        metadata: { confidence: 92, sources: ['analytics', 'customer_feedback'] }
      },
      communication: {
        content: t('ai.response_communication', 'Here\'s a suggested customer update: "Your order is progressing smoothly and will be ready for pickup tomorrow afternoon. We\'ll send you a confirmation once it\'s complete."'),
        metadata: { confidence: 88, action: 'draft_message' }
      },
      insights: {
        content: t('ai.response_insights', 'Key insight: Your peak productivity hours are 10 AM - 2 PM. Consider scheduling important tasks during this window.'),
        metadata: { confidence: 79, sources: ['productivity_data', 'time_analysis'] }
      },
      general: {
        content: t('ai.response_general', 'I can help you with order management, analytics interpretation, customer communication, and workflow optimization. What would you like to explore?'),
        metadata: { confidence: 100 }
      }
    };

    const messageKey = message.toLowerCase().includes('status') ? 'status' :
                      message.toLowerCase().includes('trend') ? 'trends' :
                      message.toLowerCase().includes('communication') || message.toLowerCase().includes('message') ? 'communication' :
                      message.toLowerCase().includes('insight') ? 'insights' :
                      'general';

    const response = responses[messageKey];

    return {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      content: response.content,
      timestamp: new Date(),
      metadata: response.metadata
    };
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const toggleVoiceInput = () => {
    setIsListening(!isListening);
    // Voice input implementation would go here
  };

  const toggleTextToSpeech = () => {
    setIsSpeaking(!isSpeaking);
    // Text-to-speech implementation would go here
  };

  const getMessageIcon = (type: AIMessage['type']) => {
    switch (type) {
      case 'assistant': return <Bot className="h-4 w-4 text-blue-500" />;
      case 'suggestion': return <Lightbulb className="h-4 w-4 text-amber-500" />;
      case 'insight': return <TrendingUp className="h-4 w-4 text-purple-500" />;
      default: return null;
    }
  };

  if (isCompact) {
    return (
      <Card className={`w-80 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            {t('ai.assistant', 'AI Assistant')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ScrollArea className="h-40">
            <div className="space-y-2">
              {messages.slice(-3).map((message) => (
                <div key={message.id} className="flex gap-2 text-xs">
                  {getMessageIcon(message.type)}
                  <div className="flex-1">
                    <p className={message.type === 'user' ? 'font-medium' : ''}>
                      {message.content}
                    </p>
                    {message.metadata?.confidence && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {message.metadata.confidence}% confident
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="flex gap-2">
            <Input
              placeholder={t('ai.ask_anything', 'Ask anything...')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="text-xs"
            />
            <Button size="sm" onClick={() => handleSendMessage()} disabled={isLoading}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`flex flex-col ${className}`} style={{ height: '600px' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <CardTitle>{t('ai.assistant', 'AI Assistant')}</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {context}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVoiceInput}
              className={isListening ? 'text-red-500' : ''}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTextToSpeech}
              className={isSpeaking ? 'text-blue-500' : ''}
            >
              {isSpeaking ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <CardDescription>
          {t('ai.assistant_description', 'Your intelligent assistant for order management and analytics')}
        </CardDescription>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.type !== 'user' && (
                    <div className="flex-shrink-0 mt-1">
                      {getMessageIcon(message.type)}
                    </div>
                  )}
                  
                  <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : ''}`}>
                    {message.type === 'suggestion' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(message.content)}
                        className="text-left h-auto p-3 text-wrap whitespace-normal"
                      >
                        <Lightbulb className="h-3 w-3 mr-2 flex-shrink-0" />
                        {message.content}
                      </Button>
                    ) : (
                      <div className={`p-3 rounded-lg ${
                        message.type === 'user' 
                          ? 'bg-primary text-primary-foreground ml-4' 
                          : message.type === 'insight'
                          ? 'bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {message.metadata && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t opacity-70">
                            {message.metadata.confidence && (
                              <Badge variant="secondary" className="text-xs">
                                {message.metadata.confidence}% confident
                              </Badge>
                            )}
                            {message.metadata.sources && (
                              <div className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                <span className="text-xs">{message.metadata.sources.length} sources</span>
                              </div>
                            )}
                            <span className="text-xs">
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {message.type === 'user' && (
                    <div className="flex-shrink-0 mt-1 order-1">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <span className="text-xs text-primary-foreground font-medium">U</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <Bot className="h-4 w-4 text-blue-500 mt-1" />
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {t('ai.thinking', 'Thinking...')}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        <Separator />

        <div className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder={t('ai.ask_anything', 'Ask anything about your business...')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={() => handleSendMessage()} 
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};