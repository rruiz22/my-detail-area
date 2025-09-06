import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Clock, CheckCircle, AlertCircle, DollarSign, Plus } from "lucide-react";
import { getDashboardMetrics, mockOrders } from "@/lib/mockData";
import { StatusBadge } from "@/components/StatusBadge";
import { useNotifications } from "@/components/NotificationProvider";
import dealershipHero from "@/assets/dealership-hero.jpg";
export default function Dashboard() {
  const metrics = getDashboardMetrics();
  const recentOrders = mockOrders.slice(0, 5);
  const notifications = useNotifications();
  const handleQuickAction = (action: string) => {
    notifications.showSuccess(`${action} initiated successfully!`, "Action Started");
  };
  return <DashboardLayout title="Dashboard">
      {/* Hero Section */}
      <div className="mb-8 relative overflow-hidden rounded-xl bg-gradient-primary p-8 text-white">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{
        backgroundImage: `url(${dealershipHero})`
      }} />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Welcome to My Detail Area</h1>
          <p className="text-xl opacity-90">Your dealership operations command center</p>
          <div className="mt-4 flex gap-3">
            <Button variant="secondary" onClick={() => handleQuickAction("New order creation")}>
              <Plus className="h-4 w-4 mr-2" />
              Create Order
            </Button>
            <Button variant="outline" className="border-white/20 text-slate-50 bg-slate-950 hover:bg-slate-800">
              View Reports
            </Button>
          </div>
        </div>
      </div>
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{metrics.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{metrics.completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Orders</CardTitle>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map(order => <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{order.id}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.year} {order.make} {order.model}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.service} • {order.advisor}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${order.price}</p>
                    <Badge variant="outline" className="text-xs">
                      {order.department}
                    </Badge>
                  </div>
                </div>)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button className="h-20 flex flex-col gap-2" variant="outline" onClick={() => handleQuickAction("New Sales Order")}>
                <Plus className="h-6 w-6" />
                <span>New Sales Order</span>
              </Button>
              <Button className="h-20 flex flex-col gap-2" variant="outline" onClick={() => handleQuickAction("New Service Order")}>
                <Plus className="h-6 w-6" />
                <span>New Service Order</span>
              </Button>
              <Button className="h-20 flex flex-col gap-2" variant="outline" onClick={() => handleQuickAction("New Recon Order")}>
                <Plus className="h-6 w-6" />
                <span>New Recon Order</span>
              </Button>
              <Button className="h-20 flex flex-col gap-2" variant="outline" onClick={() => handleQuickAction("Car Wash Order")}>
                <Plus className="h-6 w-6" />
                <span>Car Wash</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>;
}