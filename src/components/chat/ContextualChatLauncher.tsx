import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageCircle,
  Phone,
  Users,
  Send,
  ChevronDown,
  Zap
} from 'lucide-react';
import { useGlobalChat } from '@/contexts/GlobalChatProvider';
import { toast } from '@/hooks/use-toast';

interface ContextualChatLauncherProps {
  entityType: string;
  entityId: string;
  entityName?: string;
  customerPhone?: string;
  variant?: 'default' | 'compact' | 'icon';
  className?: string;
}

export function ContextualChatLauncher({
  entityType,
  entityId,
  entityName,
  customerPhone,
  variant = 'default',
  className = ''
}: ContextualChatLauncherProps) {
  const { openContextualChat, sendQuickSMS } = useGlobalChat();
  const [showSMSDialog, setShowSMSDialog] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleStartChat = () => {
    openContextualChat(entityType, entityId);
  };

  const handleSendSMS = async () => {
    if (!smsMessage.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message",
        variant: "destructive"
      });
      return;
    }

    const phoneToUse = customPhone || customerPhone;
    if (!phoneToUse) {
      toast({
        title: "Error", 
        description: "Please provide a phone number",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      await sendQuickSMS(phoneToUse, smsMessage, entityType, entityId);
      
      toast({
        title: "SMS Sent",
        description: `Message sent to ${phoneToUse}`
      });
      
      setShowSMSDialog(false);
      setSmsMessage('');
      setCustomPhone('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send SMS",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  // Quick SMS templates based on entity type
  const getQuickTemplates = () => {
    switch (entityType) {
      case 'order':
        return [
          "Your order is ready for pickup!",
          "We're working on your order and will update you shortly.",
          "Your order has been completed successfully.",
          "There's a small delay with your order. We'll have it ready soon."
        ];
      case 'vehicle':
        return [
          "Your vehicle is ready!",
          "We're finishing up work on your vehicle.",
          "Please call us regarding your vehicle.",
          "Your vehicle has been moved to the pickup area."
        ];
      default:
        return [
          "Update available for your request.",
          "Please contact us for more information.",
          "Status update on your item."
        ];
    }
  };

  if (variant === 'icon') {
    return (
      <>
        <div className={`flex items-center gap-1 ${className}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartChat}
            className="h-8 w-8 p-0"
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
          
          {customerPhone && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSMSDialog(true)}
              className="h-8 w-8 p-0"
            >
              <Phone className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Dialog open={showSMSDialog} onOpenChange={setShowSMSDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send SMS</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={customPhone || customerPhone || ''}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSendSMS} disabled={isSending} className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? 'Sending...' : 'Send SMS'}
                </Button>
                <Button variant="outline" onClick={() => setShowSMSDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className={className}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
              <ChevronDown className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleStartChat}>
              <Users className="h-4 w-4 mr-2" />
              Start Team Chat
            </DropdownMenuItem>
            
            {customerPhone && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowSMSDialog(true)}>
                  <Phone className="h-4 w-4 mr-2" />
                  Send SMS
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {customerPhone}
                  </Badge>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={showSMSDialog} onOpenChange={setShowSMSDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Send SMS {entityName && `- ${entityName}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={customPhone || customerPhone || ''}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label>Message</Label>
                <Textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={3}
                />
              </div>
              
              {/* Quick Templates */}
              <div>
                <Label>Quick Templates</Label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {getQuickTemplates().slice(0, 2).map((template, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => setSmsMessage(template)}
                      className="justify-start text-left h-auto p-2 whitespace-normal"
                    >
                      <Zap className="h-3 w-3 mr-2 flex-shrink-0" />
                      {template}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleSendSMS} disabled={isSending} className="flex-1">
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? 'Sending...' : 'Send SMS'}
                </Button>
                <Button variant="outline" onClick={() => setShowSMSDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Default variant
  return (
    <>
      <div className={`flex items-center gap-3 ${className}`}>
        <Button onClick={handleStartChat} className="flex-1">
          <Users className="h-4 w-4 mr-2" />
          Start Discussion
        </Button>
        
        {customerPhone && (
          <Button variant="outline" onClick={() => setShowSMSDialog(true)}>
            <Phone className="h-4 w-4 mr-2" />
            Send SMS
          </Button>
        )}
      </div>

      <Dialog open={showSMSDialog} onOpenChange={setShowSMSDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Send SMS Message {entityName && `- ${entityName}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Phone Number</Label>
              <Input
                value={customPhone || customerPhone || ''}
                onChange={(e) => setCustomPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                placeholder="Type your message..."
                rows={4}
              />
            </div>
            
            {/* Quick Templates */}
            <div>
              <Label>Quick Templates</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {getQuickTemplates().map((template, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => setSmsMessage(template)}
                    className="justify-start text-left h-auto p-3 whitespace-normal"
                  >
                    <Zap className="h-4 w-4 mr-2 flex-shrink-0" />
                    {template}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSendSMS} disabled={isSending} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                {isSending ? 'Sending...' : 'Send SMS'}
              </Button>
              <Button variant="outline" onClick={() => setShowSMSDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}