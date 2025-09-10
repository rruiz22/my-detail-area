import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { 
  Car, 
  MapPin, 
  Settings, 
  Activity, 
  Wrench, 
  Package,
  Users,
  Clock
} from 'lucide-react';
import { useNFCManagement } from '../../hooks/useNFCManagement';

interface NFCTagTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  tag_type: string;
  defaultFields: {
    name: string;
    description: string;
    vehicle_vin?: string;
    location_name?: string;
    is_permanent: boolean;
  };
  color: string;
}

interface NFCTagTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect?: (template: NFCTagTemplate) => void;
}

export function NFCTagTemplates({ isOpen, onClose, onTemplateSelect }: NFCTagTemplatesProps) {
  const { t } = useTranslation();
  const { createTag } = useNFCManagement();
  const [selectedTemplate, setSelectedTemplate] = useState<NFCTagTemplate | null>(null);
  const [customData, setCustomData] = useState({
    name: '',
    vehicle_vin: '',
    location_name: '',
    description: ''
  });

  const templates: NFCTagTemplate[] = [
    {
      id: 'vehicle-delivery',
      name: t('nfc.templates.vehicle_delivery.name'),
      description: t('nfc.templates.vehicle_delivery.description'),
      icon: <Car className="h-5 w-5" />,
      tag_type: 'vehicle',
      defaultFields: {
        name: 'Vehicle Delivery Tag',
        description: 'Track vehicle from sales to customer delivery',
        is_permanent: false
      },
      color: 'bg-blue-500'
    },
    {
      id: 'service-bay',
      name: t('nfc.templates.service_bay.name'),
      description: t('nfc.templates.service_bay.description'),
      icon: <Wrench className="h-5 w-5" />,
      tag_type: 'location',
      defaultFields: {
        name: 'Service Bay',
        description: 'Service department work area tracking',
        location_name: 'Service Bay #',
        is_permanent: true
      },
      color: 'bg-green-500'
    },
    {
      id: 'parts-inventory',
      name: t('nfc.templates.parts_inventory.name'),
      description: t('nfc.templates.parts_inventory.description'),
      icon: <Package className="h-5 w-5" />,
      tag_type: 'equipment',
      defaultFields: {
        name: 'Parts Inventory Tag',
        description: 'Track parts and inventory movement',
        is_permanent: true
      },
      color: 'bg-orange-500'
    },
    {
      id: 'quality-control',
      name: t('nfc.templates.quality_control.name'),
      description: t('nfc.templates.quality_control.description'),
      icon: <Activity className="h-5 w-5" />,
      tag_type: 'process',
      defaultFields: {
        name: 'Quality Control Checkpoint',
        description: 'Quality inspection and validation point',
        is_permanent: true
      },
      color: 'bg-purple-500'
    },
    {
      id: 'customer-area',
      name: t('nfc.templates.customer_area.name'),
      description: t('nfc.templates.customer_area.description'),
      icon: <Users className="h-5 w-5" />,
      tag_type: 'location',
      defaultFields: {
        name: 'Customer Area',
        description: 'Customer service and waiting area',
        location_name: 'Customer Lounge',
        is_permanent: true
      },
      color: 'bg-pink-500'
    },
    {
      id: 'time-tracking',
      name: t('nfc.templates.time_tracking.name'),
      description: t('nfc.templates.time_tracking.description'),
      icon: <Clock className="h-5 w-5" />,
      tag_type: 'process',
      defaultFields: {
        name: 'Time Tracking Point',
        description: 'Employee time clock and attendance',
        is_permanent: true
      },
      color: 'bg-indigo-500'
    }
  ];

  const handleTemplateSelect = (template: NFCTagTemplate) => {
    setSelectedTemplate(template);
    setCustomData({
      name: template.defaultFields.name,
      vehicle_vin: '',
      location_name: template.defaultFields.location_name || '',
      description: template.defaultFields.description
    });
  };

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const tagData = {
        name: customData.name,
        tag_uid: generateTagUID(),
        tag_type: selectedTemplate.tag_type,
        description: customData.description,
        vehicle_vin: customData.vehicle_vin || undefined,
        location_name: customData.location_name || undefined,
        is_active: true,
        is_permanent: selectedTemplate.defaultFields.is_permanent,
        dealer_id: 1 // Should come from auth context
      };

      await createTag(tagData);
      
      if (onTemplateSelect) {
        onTemplateSelect(selectedTemplate);
      }
      
      onClose();
      setSelectedTemplate(null);
      setCustomData({ name: '', vehicle_vin: '', location_name: '', description: '' });
    } catch (error) {
      console.error('Failed to create tag from template:', error);
    }
  };

  const generateTagUID = () => {
    return Array.from({ length: 8 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('').toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('nfc.templates.title')}
          </DialogTitle>
        </DialogHeader>

        {!selectedTemplate ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('nfc.templates.subtitle')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`p-2 rounded-lg ${template.color} text-white`}>
                        {template.icon}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {template.tag_type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-semibold mb-2">{template.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {template.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Template Info */}
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <div className={`p-2 rounded-lg ${selectedTemplate.color} text-white`}>
                {selectedTemplate.icon}
              </div>
              <div>
                <h3 className="font-semibold">{selectedTemplate.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedTemplate.description}
                </p>
              </div>
            </div>

            {/* Customization Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">{t('nfc.templates.form.name')}</Label>
                <Input
                  id="template-name"
                  value={customData.name}
                  onChange={(e) => setCustomData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('nfc.templates.form.name_placeholder')}
                />
              </div>

              {selectedTemplate.tag_type === 'vehicle' && (
                <div>
                  <Label htmlFor="template-vin">{t('nfc.templates.form.vin')}</Label>
                  <Input
                    id="template-vin"
                    value={customData.vehicle_vin}
                    onChange={(e) => setCustomData(prev => ({ ...prev, vehicle_vin: e.target.value }))}
                    placeholder={t('nfc.templates.form.vin_placeholder')}
                  />
                </div>
              )}

              {selectedTemplate.tag_type === 'location' && (
                <div>
                  <Label htmlFor="template-location">{t('nfc.templates.form.location')}</Label>
                  <Input
                    id="template-location"
                    value={customData.location_name}
                    onChange={(e) => setCustomData(prev => ({ ...prev, location_name: e.target.value }))}
                    placeholder={t('nfc.templates.form.location_placeholder')}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="template-description">{t('nfc.templates.form.description')}</Label>
                <Textarea
                  id="template-description"
                  value={customData.description}
                  onChange={(e) => setCustomData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('nfc.templates.form.description_placeholder')}
                  rows={3}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedTemplate(null)}
              >
                {t('common.back')}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreateFromTemplate}>
                  {t('nfc.templates.create_tag')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}