import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, DollarSign, Calendar, UserCheck, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DetailHubDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const stats = [
    { title: "Active Employees", value: "24", icon: Users, change: "+2", color: "text-blue-600" },
    { title: "Today's Hours", value: "192", icon: Clock, change: "+5%", color: "text-green-600" },
    { title: "Pending Invoices", value: "$12,450", icon: DollarSign, change: "-3%", color: "text-orange-600" },
    { title: "Attendance Rate", value: "96%", icon: UserCheck, change: "+1%", color: "text-emerald-600" }
  ];

  const recentActivity = [
    { employee: "John Smith", action: "Clocked In", time: "8:00 AM", status: "success" },
    { employee: "Maria Garcia", action: "Break Started", time: "10:15 AM", status: "warning" },
    { employee: "Mike Johnson", action: "Clocked Out", time: "5:30 PM", status: "success" },
    { employee: "Sarah Wilson", action: "Late Check-in", time: "8:45 AM", status: "error" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Detail Hub</h1>
          <p className="text-muted-foreground">Employee management and time tracking dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate("/detail-hub/kiosk")}>
            <Clock className="w-4 h-4 mr-2" />
            Open Kiosk
          </Button>
          <Button variant="outline" onClick={() => navigate("/detail-hub/employees")}>
            <Users className="w-4 h-4 mr-2" />
            Manage Employees
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.change.startsWith('+') ? 'text-green-600' : stat.change.startsWith('-') ? 'text-red-600' : 'text-muted-foreground'}>
                  {stat.change}
                </span>
                {" "}from last week
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => navigate("/detail-hub/timecard")}
            >
              <Calendar className="w-4 h-4 mr-2" />
              View Timecard System
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate("/detail-hub/invoices")}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Invoice Center
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate("/detail-hub/reports")}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Reports & Analytics
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate("/detail-hub/kiosk-manager")}
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Kiosk Manager
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-500' :
                      activity.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium">{activity.employee}</p>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.time}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Facial Recognition: Online</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm">Time Clock: Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">Sync Status: Pending</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailHubDashboard;