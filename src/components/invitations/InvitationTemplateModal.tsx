import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Mail, Plus, Edit, Trash2, Save, Eye } from 'lucide-react';

interface InvitationTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables: string[];
  isDefault?: boolean;
}

interface InvitationTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InvitationTemplateModal: React.FC<InvitationTemplateModalProps> = ({
  isOpen,
  onClose
}) => {
  const { toast } = useToast();
  
  // Mock templates - in a real app, these would come from the database
  const [templates, setTemplates] = useState<InvitationTemplate[]>([
    {
      id: '1',
      name: 'Default Welcome',
      subject: 'Welcome to {{dealership_name}} - Account Setup Required',
      content: `Hello,

You have been invited to join {{dealership_name}} with the role of {{role_name}}.

Click the link below to accept your invitation and set up your account:
{{invitation_link}}

This invitation will expire on {{expiration_date}}.

If you have any questions, please contact {{inviter_name}} at {{inviter_email}}.

Best regards,
{{dealership_name}} Team`,
      variables: ['dealership_name', 'role_name', 'invitation_link', 'expiration_date', 'inviter_name', 'inviter_email'],
      isDefault: true
    },
    {
      id: '2',
      name: 'Manager Invitation',
      subject: 'Management Role Invitation - {{dealership_name}}',
      content: `Dear {{invitee_name}},

We are pleased to invite you to join our management team at {{dealership_name}} as a {{role_name}}.

Your management dashboard will include:
- User management capabilities
- Access to reports and analytics
- Permission to manage orders and workflows

Please accept this invitation by clicking the link below:
{{invitation_link}}

The invitation expires on {{expiration_date}}.

Welcome to the team!

{{inviter_name}}
{{dealership_name}}`,
      variables: ['invitee_name', 'dealership_name', 'role_name', 'invitation_link', 'expiration_date', 'inviter_name']
    }
  ]);

  const [selectedTemplate, setSelectedTemplate] = useState<InvitationTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    subject: '',
    content: ''
  });

  const handleEdit = (template: InvitationTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      name: template.name,
      subject: template.subject,
      content: template.content
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!selectedTemplate) return;

    const updatedTemplates = templates.map(t => 
      t.id === selectedTemplate.id 
        ? { ...t, ...editForm }
        : t
    );
    
    setTemplates(updatedTemplates);
    setIsEditing(false);
    setSelectedTemplate(null);
    
    toast({
      title: 'Success',
      description: 'Template updated successfully',
    });
  };

  const handleDelete = (templateId: string) => {
    if (templates.find(t => t.id === templateId)?.isDefault) {
      toast({
        title: 'Error',
        description: 'Cannot delete default template',
        variant: 'destructive',
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this template?')) return;

    setTemplates(templates.filter(t => t.id !== templateId));
    toast({
      title: 'Success',
      description: 'Template deleted successfully',
    });
  };

  const previewContent = (content: string) => {
    // Replace variables with sample data for preview
    const sampleData = {
      '{{dealership_name}}': 'Sample Dealership',
      '{{role_name}}': 'Sales Manager',
      '{{invitation_link}}': 'https://app.example.com/accept/abc123',
      '{{expiration_date}}': 'January 15, 2024',
      '{{inviter_name}}': 'John Smith',
      '{{inviter_email}}': 'john@dealership.com',
      '{{invitee_name}}': 'Jane Doe'
    };

    let preview = content;
    Object.entries(sampleData).forEach(([variable, value]) => {
      preview = preview.replace(new RegExp(variable.replace(/[{}]/g, '\\$&'), 'g'), value);
    });

    return preview;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invitation Templates
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {!isEditing ? (
            <Tabs defaultValue="templates" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
              </TabsList>

              <TabsContent value="templates" className="flex-1 overflow-auto space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    Manage email templates for user invitations
                  </p>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    New Template
                  </Button>
                </div>

                <div className="grid gap-4">
                  {templates.map((template) => (
                    <Card key={template.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            {template.isDefault && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTemplate(template)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!template.isDefault && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(template.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium">Subject:</p>
                            <p className="text-sm text-muted-foreground">{template.subject}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Variables:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {template.variables.map((variable) => (
                                <Badge key={variable} variant="outline" className="text-xs">
                                  {`{{${variable}}}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="variables" className="flex-1 overflow-auto">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Available variables for email templates
                  </p>
                  
                  <div className="grid gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">User Variables</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            'invitee_name', 'invitee_email', 'role_name', 
                            'inviter_name', 'inviter_email'
                          ].map((variable) => (
                            <Badge key={variable} variant="outline">
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Dealership Variables</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            'dealership_name', 'dealership_email', 'dealership_phone',
                            'dealership_address'
                          ].map((variable) => (
                            <Badge key={variable} variant="outline">
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">System Variables</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            'invitation_link', 'expiration_date', 'current_date',
                            'app_name', 'support_email'
                          ].map((variable) => (
                            <Badge key={variable} variant="outline">
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="h-full flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Edit Template</h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 flex-1 overflow-hidden">
                {/* Editor */}
                <div className="space-y-4 overflow-auto">
                  <div>
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input
                      id="template-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-subject">Subject</Label>
                    <Input
                      id="template-subject"
                      value={editForm.subject}
                      onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                    />
                  </div>

                  <div className="flex-1">
                    <Label htmlFor="template-content">Content</Label>
                    <Textarea
                      id="template-content"
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      className="min-h-[300px] resize-none"
                      placeholder="Enter your email template content..."
                    />
                  </div>
                </div>

                {/* Preview */}
                <div className="space-y-4 overflow-auto">
                  <h4 className="font-medium">Preview</h4>
                  <Card>
                    <CardHeader className="pb-2">
                      <p className="text-sm font-medium">Subject:</p>
                      <p className="text-sm text-muted-foreground">
                        {previewContent(editForm.subject)}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                        {previewContent(editForm.content)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Template Preview Modal */}
          {selectedTemplate && !isEditing && (
            <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Preview: {selectedTemplate.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Subject:</p>
                    <p className="text-sm text-muted-foreground">
                      {previewContent(selectedTemplate.subject)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Content:</p>
                    <div className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg mt-2">
                      {previewContent(selectedTemplate.content)}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};