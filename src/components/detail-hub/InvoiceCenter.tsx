import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Send, Eye, Plus, Search, DollarSign, Clock, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";

// REAL DATABASE INTEGRATION
import {
  useDetailHubInvoices,
  useInvoiceStatistics,
  useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  generateInvoiceNumber,
  type DetailHubInvoice,
  type DetailHubInvoiceLineItem
} from "@/hooks/useDetailHubInvoices";
import { useDealerFilter } from "@/contexts/DealerFilterContext";

const InvoiceCenter = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [selectedTab, setSelectedTab] = useState("all");

  // Form state
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [lineItems, setLineItems] = useState<Partial<DetailHubInvoiceLineItem>[]>([
    { service_name: "", quantity: 1, unit_price: 0 }
  ]);

  const { selectedDealerId } = useDealerFilter();

  // REAL DATABASE INTEGRATION
  const { data: invoices = [], isLoading, error } = useDetailHubInvoices();
  const { data: stats } = useInvoiceStatistics();
  const { mutate: createInvoice, isPending: isCreating } = useCreateInvoice();
  const { mutate: updateInvoice } = useUpdateInvoice();
  const { mutate: deleteInvoice } = useDeleteInvoice();

  // Filter invoices
  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab =
      selectedTab === "all" ||
      invoice.status === selectedTab;

    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">{t('detail_hub.invoices.status_values.paid')}</Badge>;
      case "pending":
      case "sent":
        return <Badge className="bg-blue-100 text-blue-800">{t('common.status.pending')}</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">{t('detail_hub.invoices.status_values.overdue')}</Badge>;
      case "draft":
        return <Badge variant="secondary">{t('detail_hub.invoices.status_values.draft')}</Badge>;
      case "cancelled":
        return <Badge variant="destructive">{t('common.status.cancelled')}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "pending":
      case "sent":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "overdue":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { service_name: "", quantity: 1, unit_price: 0 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleLineItemChange = (index: number, field: keyof DetailHubInvoiceLineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const handleCreateInvoice = async () => {
    if (selectedDealerId === 'all') {
      alert('Please select a specific dealership');
      return;
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(selectedDealerId);

    // Calculate totals
    const validLineItems = lineItems.filter(item => item.service_name && item.quantity && item.unit_price);

    createInvoice({
      dealership_id: selectedDealerId,
      invoice_number: invoiceNumber,
      client_name: clientName,
      client_email: clientEmail || null,
      description: description || null,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: dueDate,
      status: 'draft',
      tax_rate: 0,
      line_items: validLineItems
    }, {
      onSuccess: () => {
        setIsCreatingInvoice(false);
        // Reset form
        setClientName("");
        setClientEmail("");
        setDescription("");
        setDueDate("");
        setLineItems([{ service_name: "", quantity: 1, unit_price: 0 }]);
      }
    });
  };

  const handleDeleteInvoice = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoice(id);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading invoices...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">Error loading invoices</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('detail_hub.invoices.title')}</h1>
          <p className="text-muted-foreground">{t('detail_hub.invoices.subtitle')}</p>
        </div>
        <Dialog open={isCreatingInvoice} onOpenChange={setIsCreatingInvoice}>
          <DialogTrigger asChild>
            <Button disabled={selectedDealerId === 'all'}>
              <Plus className="w-4 h-4 mr-2" />
              {t('detail_hub.invoices.create_invoice')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('detail_hub.invoices.create_invoice')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">{t('detail_hub.invoices.client_name')}</Label>
                  <Input
                    id="clientName"
                    placeholder="ABC Dealership"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Client Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="client@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">{t('detail_hub.invoices.due_date')}</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">{t('detail_hub.invoices.description')}</Label>
                <Textarea
                  id="description"
                  placeholder="Detail services for December 2024"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Services</Label>
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-[2fr,1fr,1fr,1fr,auto] gap-2 text-sm font-medium">
                    <span>Service</span>
                    <span>Quantity</span>
                    <span>Unit Price</span>
                    <span>Total</span>
                    <span></span>
                  </div>
                  {lineItems.map((item, index) => {
                    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
                    return (
                      <div key={index} className="grid grid-cols-[2fr,1fr,1fr,1fr,auto] gap-2">
                        <Input
                          placeholder="Service name"
                          value={item.service_name || ""}
                          onChange={(e) => handleLineItemChange(index, 'service_name', e.target.value)}
                        />
                        <Input
                          type="number"
                          placeholder="1"
                          value={item.quantity || 1}
                          onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value))}
                        />
                        <Input
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          value={item.unit_price || 0}
                          onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value))}
                        />
                        <Input
                          value={`$${lineTotal.toFixed(2)}`}
                          disabled
                          className="bg-muted"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLineItem(index)}
                          disabled={lineItems.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <Button variant="outline" size="sm" onClick={handleAddLineItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreatingInvoice(false)}>
                {t('detail_hub.common.cancel')}
              </Button>
              <Button onClick={handleCreateInvoice} disabled={isCreating || !clientName || !dueDate}>
                {isCreating ? 'Creating...' : t('detail_hub.invoices.create_invoice')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.dashboard.stats.total_revenue')}</p>
                <p className="text-2xl font-bold text-green-600">
                  ${(stats?.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('common.status.pending')}</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${(stats?.pending_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.invoices.status_values.overdue')}</p>
                <p className="text-2xl font-bold text-red-600">
                  ${(stats?.overdue_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{stats?.total_invoices || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Invoices ({stats?.total_invoices || 0})</TabsTrigger>
          <TabsTrigger value="pending">{t('common.status.pending')} ({stats?.pending_count || 0})</TabsTrigger>
          <TabsTrigger value="paid">{t('detail_hub.invoices.status_values.paid')} ({stats?.paid_count || 0})</TabsTrigger>
          <TabsTrigger value="overdue">{t('detail_hub.invoices.status_values.overdue')} ({stats?.overdue_count || 0})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({stats?.draft_count || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('detail_hub.common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('detail_hub.invoices.invoice_list')} ({filteredInvoices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredInvoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No invoices found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>{t('detail_hub.invoices.client_name')}</TableHead>
                      <TableHead>{t('detail_hub.invoices.amount')}</TableHead>
                      <TableHead>{t('detail_hub.invoices.status')}</TableHead>
                      <TableHead>{t('detail_hub.invoices.due_date')}</TableHead>
                      <TableHead>{t('detail_hub.invoices.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(invoice.status)}
                            <div>
                              <p className="font-medium">{invoice.invoice_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(invoice.issue_date), 'MMM dd, yyyy')}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.client_name}</p>
                            <p className="text-sm text-muted-foreground">{invoice.description}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${invoice.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <span className={invoice.status === 'overdue' ? 'text-red-600 font-medium' : ''}>
                            {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" title="View invoice">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Download PDF">
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Send invoice">
                              <Send className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete invoice"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoiceCenter;
