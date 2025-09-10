import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  MessageSquare, 
  AlertTriangle, 
  ArrowRight, 
  Calendar, 
  DollarSign,
  FileText,
  Send,
  Bell,
  Eye
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import { es, ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ApprovalStep {
  id: string;
  level: number;
  title: string;
  description: string;
  required_role: string;
  approver_id?: string;
  approver_name?: string;
  approver_email?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  decision_date?: string;
  comments?: string;
  escalation_hours: number;
  is_escalated: boolean;
}

interface ApprovalRequest {
  id: string;
  order_id: string;
  request_type: 'budget_increase' | 'scope_change' | 'completion_approval' | 'quality_review';
  current_step: number;
  total_amount?: number;
  requested_amount?: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_by: string;
  created_at: string;
  steps: ApprovalStep[];
}

interface ReconApprovalWorkflowProps {
  orderId: string;
  orderInfo: {
    order_number: string;
    vehicle_info: string;
    current_amount: number;
  };
  className?: string;
}

export function ReconApprovalWorkflow({ orderId, orderInfo, className }: ReconApprovalWorkflowProps) {
  const { t, i18n } = useTranslation();
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [newRequestType, setNewRequestType] = useState<'budget_increase' | 'scope_change' | 'completion_approval' | 'quality_review'>('budget_increase');
  const [requestReason, setRequestReason] = useState('');
  const [requestAmount, setRequestAmount] = useState(0);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);

  // Get locale for date-fns
  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'pt-BR': return ptBR;
      default: return undefined;
    }
  };

  // Mock data initialization
  useEffect(() => {
    const mockApprovals: ApprovalRequest[] = [
      {
        id: '1',
        order_id: orderId,
        request_type: 'budget_increase',
        current_step: 2,
        total_amount: 2500,
        requested_amount: 3200,
        reason: 'Additional paint work needed due to discovered rust damage under the panels.',
        status: 'pending',
        created_by: 'John Martinez',
        created_at: '2024-01-16T10:30:00Z',
        steps: [
          {
            id: '1-1',
            level: 1,
            title: 'Detail Manager Review',
            description: 'Initial budget review and feasibility assessment',
            required_role: 'detail_manager',
            approver_id: 'mgr-001',
            approver_name: 'Sarah Connor',
            approver_email: 'sarah.connor@dealership.com',
            status: 'approved',
            decision_date: '2024-01-16T11:15:00Z',
            comments: 'Approved. The additional work is justified given the extent of rust damage.',
            escalation_hours: 24,
            is_escalated: false
          },
          {
            id: '1-2',
            level: 2,
            title: 'Service Director Approval',
            description: 'Budget increase authorization for amounts over $500',
            required_role: 'service_director',
            status: 'pending',
            escalation_hours: 48,
            is_escalated: false
          }
        ]
      },
      {
        id: '2',
        order_id: orderId,
        request_type: 'completion_approval',
        current_step: 1,
        reason: 'Vehicle ready for delivery - final quality inspection completed.',
        status: 'approved',
        created_by: 'Mike Rodriguez',
        created_at: '2024-01-15T16:45:00Z',
        steps: [
          {
            id: '2-1',
            level: 1,
            title: 'Quality Control Review',
            description: 'Final quality inspection and delivery approval',
            required_role: 'quality_manager',
            approver_id: 'qm-001',
            approver_name: 'Lisa Wang',
            approver_email: 'lisa.wang@dealership.com',
            status: 'approved',
            decision_date: '2024-01-15T17:20:00Z',
            comments: 'Excellent work. Vehicle meets all quality standards and is ready for customer delivery.',
            escalation_hours: 12,
            is_escalated: false
          }
        ]
      }
    ];
    
    setApprovals(mockApprovals);
  }, [orderId]);

  const handleCreateRequest = () => {
    const newApproval: ApprovalRequest = {
      id: Date.now().toString(),
      order_id: orderId,
      request_type: newRequestType,
      current_step: 1,
      total_amount: orderInfo.current_amount,
      requested_amount: newRequestType === 'budget_increase' ? requestAmount : undefined,
      reason: requestReason,
      status: 'pending',
      created_by: 'Current User',
      created_at: new Date().toISOString(),
      steps: getStepsForRequestType(newRequestType)
    };

    setApprovals([newApproval, ...approvals]);
    setIsCreatingRequest(false);
    setRequestReason('');
    setRequestAmount(0);
    
    toast.success(t('recon_approval.request_created'));
  };

  const getStepsForRequestType = (type: string): ApprovalStep[] => {
    const baseSteps = {
      budget_increase: [
        {
          id: `${Date.now()}-1`,
          level: 1,
          title: 'Detail Manager Review',
          description: 'Initial budget review and feasibility assessment',
          required_role: 'detail_manager',
          status: 'pending' as const,
          escalation_hours: 24,
          is_escalated: false
        },
        {
          id: `${Date.now()}-2`,
          level: 2,
          title: 'Service Director Approval',
          description: 'Budget increase authorization',
          required_role: 'service_director',
          status: 'pending' as const,
          escalation_hours: 48,
          is_escalated: false
        }
      ],
      scope_change: [
        {
          id: `${Date.now()}-1`,
          level: 1,
          title: 'Technical Review',
          description: 'Scope change technical feasibility',
          required_role: 'technical_lead',
          status: 'pending' as const,
          escalation_hours: 12,
          is_escalated: false
        }
      ],
      completion_approval: [
        {
          id: `${Date.now()}-1`,
          level: 1,
          title: 'Quality Control Review',
          description: 'Final quality inspection',
          required_role: 'quality_manager',
          status: 'pending' as const,
          escalation_hours: 6,
          is_escalated: false
        }
      ],
      quality_review: [
        {
          id: `${Date.now()}-1`,
          level: 1,
          title: 'Quality Manager Review',
          description: 'Quality standards assessment',
          required_role: 'quality_manager',
          status: 'pending' as const,
          escalation_hours: 8,
          is_escalated: false
        }
      ]
    };

    return baseSteps[type as keyof typeof baseSteps] || [];
  };

  const handleApproveStep = (approvalId: string, stepId: string, comments: string) => {
    setApprovals(prev => 
      prev.map(approval => {
        if (approval.id !== approvalId) return approval;
        
        const updatedSteps = approval.steps.map(step => 
          step.id === stepId 
            ? {
                ...step,
                status: 'approved' as const,
                decision_date: new Date().toISOString(),
                comments,
                approver_name: 'Current User'
              }
            : step
        );

        const currentStepIndex = updatedSteps.findIndex(step => step.id === stepId);
        const nextStep = currentStepIndex + 1;
        const allStepsCompleted = updatedSteps.every(step => step.status !== 'pending');

        return {
          ...approval,
          steps: updatedSteps,
          current_step: nextStep < updatedSteps.length ? nextStep + 1 : approval.current_step,
          status: allStepsCompleted ? 'approved' as const : approval.status
        };
      })
    );
    
    toast.success(t('recon_approval.step_approved'));
  };

  const handleRejectStep = (approvalId: string, stepId: string, comments: string) => {
    setApprovals(prev => 
      prev.map(approval => 
        approval.id === approvalId 
          ? {
              ...approval,
              steps: approval.steps.map(step => 
                step.id === stepId 
                  ? {
                      ...step,
                      status: 'rejected' as const,
                      decision_date: new Date().toISOString(),
                      comments,
                      approver_name: 'Current User'
                    }
                  : step
              ),
              status: 'rejected' as const
            }
          : approval
      )
    );
    
    toast.error(t('recon_approval.step_rejected'));
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'budget_increase': return DollarSign;
      case 'scope_change': return FileText;
      case 'completion_approval': return CheckCircle;
      case 'quality_review': return Eye;
      default: return FileText;
    }
  };

  const getRequestTypeColor = (type: string) => {
    switch (type) {
      case 'budget_increase': return 'bg-warning/10 text-warning';
      case 'scope_change': return 'bg-secondary/10 text-secondary';
      case 'completion_approval': return 'bg-success/10 text-success';
      case 'quality_review': return 'bg-primary/10 text-primary';
      default: return 'bg-muted/10 text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'rejected': return XCircle;
      case 'pending': return Clock;
      default: return Clock;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-success';
      case 'rejected': return 'text-destructive';
      case 'pending': return 'text-warning';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                {t('recon_approval.title')}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t('recon_approval.subtitle')} - {orderInfo.order_number}
              </p>
            </div>
            
            <Dialog open={isCreatingRequest} onOpenChange={setIsCreatingRequest}>
              <DialogTrigger asChild>
                <Button className="button-enhanced">
                  <Send className="w-4 h-4 mr-2" />
                  {t('recon_approval.new_request')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('recon_approval.create_request')}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      {t('recon_approval.request_type')}
                    </label>
                    <select 
                      className="w-full mt-1 p-2 border rounded-md"
                      value={newRequestType}
                      onChange={(e) => setNewRequestType(e.target.value as any)}
                    >
                      <option value="budget_increase">
                        {t('recon_approval.types.budget_increase')}
                      </option>
                      <option value="scope_change">
                        {t('recon_approval.types.scope_change')}
                      </option>
                      <option value="completion_approval">
                        {t('recon_approval.types.completion_approval')}
                      </option>
                      <option value="quality_review">
                        {t('recon_approval.types.quality_review')}
                      </option>
                    </select>
                  </div>

                  {newRequestType === 'budget_increase' && (
                    <div>
                      <label className="text-sm font-medium">
                        {t('recon_approval.requested_amount')}
                      </label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                          type="number"
                          className="w-full pl-10 p-2 border rounded-md"
                          value={requestAmount}
                          onChange={(e) => setRequestAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium">
                      {t('recon_approval.reason')}
                    </label>
                    <Textarea
                      className="mt-1"
                      value={requestReason}
                      onChange={(e) => setRequestReason(e.target.value)}
                      placeholder={t('recon_approval.reason_placeholder')}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={handleCreateRequest}
                      disabled={!requestReason.trim()}
                      className="flex-1"
                    >
                      {t('recon_approval.submit_request')}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsCreatingRequest(false)}
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Approvals List */}
      <div className="space-y-4">
        {approvals.map((approval) => {
          const RequestTypeIcon = getRequestTypeIcon(approval.request_type);
          const StatusIcon = getStatusIcon(approval.status);
          const currentStep = approval.steps[approval.current_step - 1];

          return (
            <Card key={approval.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      getRequestTypeColor(approval.request_type)
                    )}>
                      <RequestTypeIcon className="w-5 h-5" />
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {t(`recon_approval.types.${approval.request_type}`)}
                        </CardTitle>
                        <Badge className={cn(
                          "flex items-center gap-1",
                          approval.status === 'approved' && 'bg-success/20 text-success-foreground',
                          approval.status === 'rejected' && 'bg-destructive/20 text-destructive-foreground',
                          approval.status === 'pending' && 'bg-warning/20 text-warning-foreground'
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {t(`recon_approval.statuses.${approval.status}`)}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('recon_approval.requested_by')} {approval.created_by} • {' '}
                        {formatDistanceToNow(new Date(approval.created_at), { 
                          addSuffix: true, 
                          locale: getLocale() 
                        })}
                      </p>
                      
                      {approval.requested_amount && (
                        <p className="text-sm font-medium text-primary mt-1">
                          {t('recon_approval.amount')}: ${approval.total_amount?.toFixed(2)} → ${approval.requested_amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedApproval(selectedApproval?.id === approval.id ? null : approval)}
                  >
                    {selectedApproval?.id === approval.id ? t('common.hide') : t('common.details')}
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm">{approval.reason}</p>
                
                {/* Progress Steps */}
                <div className="space-y-3">
                  {approval.steps.map((step, index) => {
                    const StepStatusIcon = getStatusIcon(step.status);
                    const isCurrentStep = approval.current_step === index + 1 && approval.status === 'pending';
                    
                    return (
                      <div key={step.id} className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        isCurrentStep && "bg-primary/5 border-primary/20"
                      )}>
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                          step.status === 'approved' && "bg-success/20 text-success",
                          step.status === 'rejected' && "bg-destructive/20 text-destructive", 
                          step.status === 'pending' && isCurrentStep && "bg-warning/20 text-warning",
                          step.status === 'pending' && !isCurrentStep && "bg-muted/20 text-muted-foreground"
                        )}>
                          <StepStatusIcon className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-sm">{step.title}</h4>
                              <p className="text-xs text-muted-foreground">{step.description}</p>
                            </div>
                            
                            {step.status === 'pending' && isCurrentStep && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => handleRejectStep(approval.id, step.id, 'Rejected')}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  {t('recon_approval.reject')}
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => handleApproveStep(approval.id, step.id, 'Approved')}
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  {t('recon_approval.approve')}
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          {step.approver_name && (
                            <div className="flex items-center gap-2 mt-2">
                              <Avatar className="w-5 h-5">
                                <AvatarFallback className="text-xs">
                                  {step.approver_name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {step.approver_name}
                              </span>
                              {step.decision_date && (
                                <span className="text-xs text-muted-foreground">
                                  • {formatDistanceToNow(new Date(step.decision_date), { 
                                    addSuffix: true, 
                                    locale: getLocale() 
                                  })}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {step.comments && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-xs italic">
                              "{step.comments}"
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {approvals.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('recon_approval.no_requests')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('recon_approval.no_requests_desc')}
            </p>
            <Button onClick={() => setIsCreatingRequest(true)}>
              <Send className="w-4 h-4 mr-2" />
              {t('recon_approval.create_first_request')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}