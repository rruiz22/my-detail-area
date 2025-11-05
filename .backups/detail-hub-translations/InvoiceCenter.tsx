import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Send, Eye, Plus, Search, DollarSign, Clock, CheckCircle, AlertCircle } from "lucide-react";

const InvoiceCenter = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  const invoices = [
    {
      id: "INV-2024-001",
      clientName: "Smith Auto Group",
      description: "Detail Services - December 2024",
      amount: 2450.00,
      status: "Paid",
      dueDate: "2024-12-15",
      createdDate: "2024-12-01",
      paidDate: "2024-12-10",
      services: [
        { name: "Premium Detail Package", quantity: 5, rate: 350.00, total: 1750.00 },
        { name: "Paint Correction", quantity: 2, rate: 200.00, total: 400.00 },
        { name: "Ceramic Coating", quantity: 1, rate: 300.00, total: 300.00 }
      ]
    },
    {
      id: "INV-2024-002",
      clientName: "Johnson Dealership",
      description: "Car Wash Services - December 2024",
      amount: 1250.00,
      status: "Pending",
      dueDate: "2024-12-20",
      createdDate: "2024-12-05",
      paidDate: null,
      services: [
        { name: "Express Wash", quantity: 25, rate: 25.00, total: 625.00 },
        { name: "Full Service Wash", quantity: 15, rate: 40.00, total: 600.00 },
        { name: "Additional Wax", quantity: 5, rate: 5.00, total: 25.00 }
      ]
    },
    {
      id: "INV-2024-003",
      clientName: "Metro Motors",
      description: "Recon Services - December 2024",
      amount: 3200.00,
      status: "Overdue",
      dueDate: "2024-12-08",
      createdDate: "2024-11-25",
      paidDate: null,
      services: [
        { name: "Full Recon Package", quantity: 8, rate: 400.00, total: 3200.00 }
      ]
    },
    {
      id: "INV-2024-004",
      clientName: "Preferred Auto",
      description: "Mixed Services - December 2024",
      amount: 1800.00,
      status: "Draft",
      dueDate: "2024-12-25",
      createdDate: "2024-12-12",
      paidDate: null,
      services: [
        { name: "Detail Package", quantity: 3, rate: 350.00, total: 1050.00 },
        { name: "Express Wash", quantity: 30, rate: 25.00, total: 750.00 }
      ]
    }
  ];

  const filteredInvoices = invoices.filter(invoice =>
    invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "Pending":
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
      case "Overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      case "Draft":
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Paid":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "Pending":
        return <Clock className="w-4 h-4 text-blue-600" />;
      case "Overdue":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const totalRevenue = invoices.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.amount, 0);
  const pendingAmount = invoices.filter(inv => inv.status === 'Pending').reduce((sum, inv) => sum + inv.amount, 0);
  const overdueAmount = invoices.filter(inv => inv.status === 'Overdue').reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoice Center</h1>
          <p className="text-muted-foreground">Manage billing and invoicing for detail services</p>
        </div>
        <Dialog open={isCreatingInvoice} onOpenChange={setIsCreatingInvoice}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input id="clientName" placeholder="ABC Dealership" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Detail services for December 2024" />
              </div>
              <div className="space-y-2">
                <Label>Services</Label>
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-sm font-medium">
                    <span>Service</span>
                    <span>Quantity</span>
                    <span>Rate</span>
                    <span>Total</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="detail-premium">Premium Detail Package</SelectItem>
                        <SelectItem value="detail-basic">Basic Detail Package</SelectItem>
                        <SelectItem value="wash-express">Express Wash</SelectItem>
                        <SelectItem value="wash-full">Full Service Wash</SelectItem>
                        <SelectItem value="recon-full">Full Recon Package</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" placeholder="1" />
                    <Input type="number" placeholder="350.00" step="0.01" />
                    <Input placeholder="$350.00" disabled />
                  </div>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreatingInvoice(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsCreatingInvoice(false)}>
                Create Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-blue-600">${pendingAmount.toFixed(2)}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-600">${overdueAmount.toFixed(2)}</p>
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
                <p className="text-2xl font-bold">{invoices.length}</p>
              </div>
              <FileText className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Invoices</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="paid">Paid</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
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
              <CardTitle>Invoices ({filteredInvoices.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(invoice.status)}
                          <div>
                            <p className="font-medium">{invoice.id}</p>
                            <p className="text-sm text-muted-foreground">{invoice.createdDate}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.clientName}</p>
                          <p className="text-sm text-muted-foreground">{invoice.description}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">${invoice.amount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
                        <span className={invoice.status === 'Overdue' ? 'text-red-600' : ''}>
                          {invoice.dueDate}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Send className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Pending invoices view</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paid">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Paid invoices view</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Overdue invoices view</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvoiceCenter;