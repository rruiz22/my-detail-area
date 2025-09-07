import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Download, Eye } from "lucide-react";
import { mockOrders } from "@/lib/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { useTranslation } from 'react-i18next';

export default function ReconOrders() {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const reconOrders = mockOrders.filter(order => order.department === 'Recon');
  
  const filteredOrders = reconOrders.filter(order => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.make.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.model.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout title={t('pages.recon_orders')}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder={t('orders.search_orders')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('orders.filter_by_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.all_status')}</SelectItem>
                <SelectItem value="Pending">{t('orders.pending')}</SelectItem>
                <SelectItem value="In Progress">{t('orders.in_progress')}</SelectItem>
                <SelectItem value="Complete">{t('orders.complete')}</SelectItem>
                <SelectItem value="Cancelled">{t('orders.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('orders.export')}
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('orders.new_order')}
            </Button>
          </div>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t('pages.recon_orders')} ({filteredOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orders.order_id')}</TableHead>
                  <TableHead>{t('orders.vehicle')}</TableHead>
                  <TableHead>{t('orders.vin')}</TableHead>
                  <TableHead>{t('orders.service')}</TableHead>
                  <TableHead>{t('orders.advisor')}</TableHead>
                  <TableHead>{t('orders.price')}</TableHead>
                  <TableHead>{t('orders.status')}</TableHead>
                  <TableHead>{t('orders.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.year} {order.make} {order.model}</p>
                        {order.stock && (
                          <p className="text-xs text-muted-foreground">{t('orders.stock')}: {order.stock}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {order.vin}
                      </code>
                    </TableCell>
                    <TableCell>{order.service}</TableCell>
                    <TableCell>{order.advisor}</TableCell>
                    <TableCell className="font-medium">${order.price}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}