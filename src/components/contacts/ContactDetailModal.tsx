import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  User, 
  Users, 
  MessageSquare,
  PhoneCall,
  Copy,
  QrCode,
  Download,
  Edit
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import { vCardService } from '@/services/vCardService';
import { toast } from 'sonner';

interface ContactDetailModalProps {
  contact: any;
  open: boolean;
  onClose: () => void;
  onEdit?: (contact: any) => void;
}

export function ContactDetailModal({ contact, open, onClose, onEdit }: ContactDetailModalProps) {
  const { t } = useTranslation();

  if (!contact) return null;

  const getDisplayName = (contact: any) => {
    return `${contact.first_name} ${contact.last_name}`.trim();
  };

  const getInitials = (contact: any) => {
    return `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase();
  };

  const getDealershipName = (contact: any) => {
    // Handle multiple possible data structures from Supabase
    if (contact.dealerships?.name) return contact.dealerships.name;
    if (contact.dealership?.name) return contact.dealership.name;
    if (contact.dealership_name) return contact.dealership_name;
    return 'Unknown Dealership';
  };

  const handleCall = () => {
    const phoneNumber = contact.mobile_phone || contact.phone;
    if (phoneNumber) {
      window.open(`tel:${phoneNumber}`);
    }
  };

  const handleEmail = () => {
    if (contact.email) {
      window.open(`mailto:${contact.email}`);
    }
  };

  const handleCopyPhone = () => {
    const phoneNumber = contact.mobile_phone || contact.phone;
    if (phoneNumber) {
      navigator.clipboard.writeText(phoneNumber);
    }
  };

  const handleCopyEmail = () => {
    if (contact.email) {
      navigator.clipboard.writeText(contact.email);
    }
  };

  const handleDownloadVCard = () => {
    try {
      vCardService.downloadVCard(contact);
toast.success(t('contacts.contact_downloaded'));
    } catch (error) {
      console.error('Error downloading vCard:', error);
toast.error(t('contacts.download_failed'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={contact.avatar_url} />
                <AvatarFallback className="text-lg">{getInitials(contact)}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl font-bold">{getDisplayName(contact)}</DialogTitle>
                <p className="text-muted-foreground">{contact.position} • {contact.department}</p>
              </div>
            </div>
            
            {/* Quick Action Buttons in Header */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCall} 
                disabled={!contact.mobile_phone && !contact.phone}
              >
                <PhoneCall className="h-4 w-4 mr-2" />
                Call Mobile
              </Button>
              
              <Button variant="outline" size="sm" onClick={handleEmail} disabled={!contact.email}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(contact)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <DialogDescription className="sr-only">
            Contact details for {getDisplayName(contact)}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6 p-6">
            {/* Main Content */}
            <div className="space-y-6">
              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t('contacts.contact_info')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{contact.email}</span>
                          <Button variant="ghost" size="sm" onClick={handleCopyEmail}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Mobile Phone</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{contact.mobile_phone || contact.phone}</span>
                          <Button variant="ghost" size="sm" onClick={handleCopyPhone}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Position</label>
                        <p className="text-sm mt-1">{contact.position || 'Not specified'}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Department</label>
                        <div className="mt-1">
                          <Badge variant="outline">{contact.department}</Badge>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Language</label>
                        <p className="text-sm mt-1">{contact.preferred_language?.toUpperCase() || 'EN'}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Notes */}
              {contact.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {t('contacts.contact_notes')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-muted/30 rounded-lg border-dashed border">
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">
                        {contact.notes}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

            </div>

            {/* Right Sidebar */}
            <div className="space-y-4">
              {/* Organization & Department */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    {t('contacts.organization_department')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Dealership</label>
                    <p className="text-sm mt-1 font-medium">{getDealershipName(contact)}</p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Department</label>
                    <div className="mt-1">
                      <Badge variant="outline" className="capitalize">
                        {contact.department}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Groups</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {contact.contact_groups?.length > 0 ? (
                        contact.contact_groups.map((group: any, index: number) => (
                          <Badge key={group.id || index} variant="secondary" className="text-xs">
                            {group.name}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {t('contacts.no_groups_assigned')}
                        </Badge>
                      )}
                      
                      {contact.is_primary && (
                        <Badge variant="default" className="text-xs">{t('contacts.primary_contact')}</Badge>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      <Badge variant={contact.status === 'active' ? 'default' : 'secondary'}>
                        {contact.status || 'Active'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Real vCard QR Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <QrCode className="h-4 w-4" />
                    {t('contacts.add_to_phone_contacts')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  {/* Real QR Code with vCard data */}
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <QRCodeCanvas
                      value={vCardService.generateCompactVCard(contact)}
                      size={150}
                      level="M"
                      includeMargin={true}
                      imageSettings={{
                        src: "/favicon.ico",
                        width: 20,
                        height: 20,
                        excavate: true
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
  {t('contacts.scan_to_add_contact')}
                    </p>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={handleDownloadVCard}
                    >
                      <Download className="h-3 w-3 mr-2" />
{t('contacts.download_vcf_file')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}