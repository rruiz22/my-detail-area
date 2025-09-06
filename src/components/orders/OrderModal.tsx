import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, X, User, Car, Calendar, Settings } from 'lucide-react';

interface OrderModalProps {
  order?: any;
  open: boolean;
  onClose: () => void;
  onSave: (orderData: any) => void;
}

export function OrderModal({ order, open, onClose, onSave }: OrderModalProps) {
  const [formData, setFormData] = useState({
    client: '',
    contact: '',
    stockNumber: '',
    vin: '',
    year: '',
    make: '',
    model: '',
    color: '',
    dueDate: '',
    dueTime: '',
    status: 'pending',
    internalNotes: '',
    services: [] as string[],
  });

  const [clients] = useState([
    { id: '1', name: 'Cliente A' },
    { id: '2', name: 'Cliente B' },
    { id: '3', name: 'Cliente C' },
  ]);

  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);

  const availableServices = [
    { id: 'detail', name: 'Detail Completo', price: 299.99 },
    { id: 'wash', name: 'Lavado Express', price: 29.99 },
    { id: 'wax', name: 'Encerado Premium', price: 149.99 },
    { id: 'interior', name: 'Limpieza Interior', price: 79.99 },
    { id: 'engine', name: 'Limpieza Motor', price: 99.99 },
  ];

  useEffect(() => {
    if (order) {
      setFormData({
        client: order.client || '',
        contact: order.contact || '',
        stockNumber: order.stock || '',
        vin: order.vin || '',
        year: order.year?.toString() || '',
        make: order.make || '',
        model: order.model || '',
        color: order.color || '',
        dueDate: order.dueDate || '',
        dueTime: order.dueTime || '',
        status: order.status || 'pending',
        internalNotes: order.internalNotes || '',
        services: order.services || [],
      });
    } else {
      // Reset form for new order
      setFormData({
        client: '',
        contact: '',
        stockNumber: '',
        vin: '',
        year: '',
        make: '',
        model: '',
        color: '',
        dueDate: '',
        dueTime: '',
        status: 'pending',
        internalNotes: '',
        services: [],
      });
    }
  }, [order]);

  const handleClientChange = async (clientId: string) => {
    setFormData({ ...formData, client: clientId, contact: '', services: [] });
    
    // Simulate API calls for contacts and services
    setLoadingContacts(true);
    setLoadingServices(true);
    
    try {
      // Simulate contacts API call
      setTimeout(() => {
        const mockContacts = [
          { id: '1', first_name: 'Juan', last_name: 'Pérez', email: 'juan@email.com', phone: '555-0123' },
          { id: '2', first_name: 'María', last_name: 'García', email: 'maria@email.com', phone: '555-0456' },
        ];
        setContacts(mockContacts);
        setLoadingContacts(false);
      }, 500);

      // Simulate services API call
      setTimeout(() => {
        setServices(availableServices);
        setLoadingServices(false);
      }, 600);
    } catch (error) {
      console.error('Error loading client data:', error);
      setLoadingContacts(false);
      setLoadingServices(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleServiceToggle = (serviceId: string) => {
    const updatedServices = formData.services.includes(serviceId)
      ? formData.services.filter(id => id !== serviceId)
      : [...formData.services, serviceId];
    
    setFormData({ ...formData, services: updatedServices });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const selectedServicesTotal = formData.services.reduce((total, serviceId) => {
    const service = availableServices.find(s => s.id === serviceId);
    return total + (service?.price || 0);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            {order ? 'Editar Orden' : 'Nueva Orden'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1: Client Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Información del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente *</Label>
                    <Select 
                      value={formData.client} 
                      onValueChange={handleClientChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cliente..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact">Contacto</Label>
                    <Select 
                      value={formData.contact} 
                      onValueChange={(value) => handleInputChange('contact', value)}
                      disabled={!formData.client || loadingContacts}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingContacts ? "Cargando contactos..." : 
                          !formData.client ? "Seleccione un cliente primero" :
                          "Seleccionar contacto..."
                        } />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {contacts.map((contact: any) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.first_name} {contact.last_name} - {contact.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="stockNumber">Número de Stock</Label>
                    <Input
                      id="stockNumber"
                      value={formData.stockNumber}
                      onChange={(e) => handleInputChange('stockNumber', e.target.value)}
                      placeholder="Ej: A2024001"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vin">VIN *</Label>
                    <Input
                      id="vin"
                      value={formData.vin}
                      onChange={(e) => handleInputChange('vin', e.target.value)}
                      placeholder="Ej: 1HGCM82633A123456"
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Column 2: Vehicle Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    Información del Vehículo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="year">Año *</Label>
                      <Input
                        id="year"
                        type="number"
                        value={formData.year}
                        onChange={(e) => handleInputChange('year', e.target.value)}
                        placeholder="2024"
                        min="1900"
                        max="2030"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Color</Label>
                      <Input
                        id="color"
                        value={formData.color}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        placeholder="Blanco"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="make">Marca *</Label>
                    <Input
                      id="make"
                      value={formData.make}
                      onChange={(e) => handleInputChange('make', e.target.value)}
                      placeholder="Honda"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Modelo *</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => handleInputChange('model', e.target.value)}
                      placeholder="Accord"
                      required
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Fecha de Entrega *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={formData.dueDate}
                        onChange={(e) => handleInputChange('dueDate', e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueTime">Hora de Entrega</Label>
                      <Input
                        id="dueTime"
                        type="time"
                        value={formData.dueTime}
                        onChange={(e) => handleInputChange('dueTime', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => handleInputChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="in_progress">En Proceso</SelectItem>
                        <SelectItem value="completed">Completado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Column 3: Services & Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Servicios y Notas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Servicios</Label>
                    <div className="space-y-3 max-h-48 overflow-y-auto border rounded p-3">
                      {availableServices.map((service) => (
                        <div key={service.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={service.id}
                            checked={formData.services.includes(service.id)}
                            onCheckedChange={() => handleServiceToggle(service.id)}
                          />
                          <Label 
                            htmlFor={service.id} 
                            className="flex-1 cursor-pointer text-sm"
                          >
                            <div className="flex justify-between items-center">
                              <span>{service.name}</span>
                              <span className="text-muted-foreground">
                                ${service.price.toFixed(2)}
                              </span>
                            </div>
                          </Label>
                        </div>
                      ))}
                      {loadingServices && (
                        <div className="text-center text-sm text-muted-foreground py-4">
                          Cargando servicios...
                        </div>
                      )}
                    </div>
                    
                    {formData.services.length > 0 && (
                      <div className="text-right font-medium">
                        Total: ${selectedServicesTotal.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="internalNotes">Notas Internas</Label>
                    <Textarea
                      id="internalNotes"
                      value={formData.internalNotes}
                      onChange={(e) => handleInputChange('internalNotes', e.target.value)}
                      placeholder="Instrucciones especiales, observaciones, etc."
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Save className="w-4 h-4 mr-2" />
                {order ? 'Actualizar' : 'Crear'} Orden
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}