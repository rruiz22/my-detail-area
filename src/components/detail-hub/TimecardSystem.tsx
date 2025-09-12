import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Download, Filter, Clock, User, DollarSign, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

const TimecardSystem = () => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const timecards = [
    {
      employeeId: "EMP001",
      employeeName: "John Smith",
      date: "2024-12-12",
      clockIn: "8:00 AM",
      clockOut: "5:30 PM",
      breakStart: "12:00 PM",
      breakEnd: "12:30 PM",
      totalHours: 9.0,
      regularHours: 8.0,
      overtimeHours: 1.0,
      hourlyRate: 25.00,
      totalPay: 237.50,
      status: "Complete"
    },
    {
      employeeId: "EMP002",
      employeeName: "Maria Garcia", 
      date: "2024-12-12",
      clockIn: "8:15 AM",
      clockOut: "5:00 PM",
      breakStart: "12:15 PM",
      breakEnd: "12:45 PM",
      totalHours: 8.25,
      regularHours: 8.0,
      overtimeHours: 0.25,
      hourlyRate: 20.00,
      totalPay: 167.50,
      status: "Complete"
    },
    {
      employeeId: "EMP003",
      employeeName: "Mike Johnson",
      date: "2024-12-12",
      clockIn: "7:45 AM",
      clockOut: "4:30 PM",
      breakStart: "11:30 AM",
      breakEnd: "12:00 PM",
      totalHours: 8.25,
      regularHours: 8.0,
      overtimeHours: 0.25,
      hourlyRate: 18.00,
      totalPay: 150.75,
      status: "Complete"
    },
    {
      employeeId: "EMP004",
      employeeName: "Sarah Wilson",
      date: "2024-12-12",
      clockIn: "8:45 AM",
      clockOut: "--",
      breakStart: "12:30 PM",
      breakEnd: "1:00 PM",
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      hourlyRate: 22.00,
      totalPay: 0,
      status: "Clocked In"
    }
  ];

  const weeklyStats = {
    totalEmployees: 24,
    totalHours: 192,
    regularHours: 168,
    overtimeHours: 24,
    totalPayroll: 4680.00,
    averageHoursPerEmployee: 8.0
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Complete":
        return <Badge className="bg-green-100 text-green-800">Complete</Badge>;
      case "Clocked In":
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
      case "Late":
        return <Badge className="bg-red-100 text-red-800">Late</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Timecard System</h1>
          <p className="text-muted-foreground">Track employee hours and manage payroll</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{weeklyStats.totalHours}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overtime Hours</p>
                <p className="text-2xl font-bold">{weeklyStats.overtimeHours}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Employees</p>
                <p className="text-2xl font-bold">{weeklyStats.totalEmployees}</p>
              </div>
              <User className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Payroll</p>
                <p className="text-2xl font-bold">${weeklyStats.totalPayroll.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="weekly">Weekly Summary</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Daily Timecards - {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Today"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Break</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Overtime</TableHead>
                    <TableHead>Pay</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timecards.map((timecard) => (
                    <TableRow key={timecard.employeeId}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{timecard.employeeName}</p>
                          <p className="text-sm text-muted-foreground">{timecard.employeeId}</p>
                        </div>
                      </TableCell>
                      <TableCell>{timecard.clockIn}</TableCell>
                      <TableCell>{timecard.clockOut}</TableCell>
                      <TableCell>
                        {timecard.breakStart} - {timecard.breakEnd}
                      </TableCell>
                      <TableCell>{timecard.totalHours.toFixed(2)}h</TableCell>
                      <TableCell>
                        {timecard.overtimeHours > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {timecard.overtimeHours.toFixed(2)}h
                          </span>
                        ) : (
                          "--"
                        )}
                      </TableCell>
                      <TableCell>${timecard.totalPay.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(timecard.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Regular Hours:</span>
                    <span className="font-medium">{weeklyStats.regularHours}h</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Overtime Hours:</span>
                    <span className="font-medium text-orange-600">{weeklyStats.overtimeHours}h</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Average per Employee:</span>
                    <span className="font-medium">{weeklyStats.averageHoursPerEmployee}h</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Total Employees:</span>
                    <span className="font-medium">{weeklyStats.totalEmployees}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Total Hours:</span>
                    <span className="font-medium">{weeklyStats.totalHours}h</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span>Total Payroll:</span>
                    <span className="font-medium text-green-600">${weeklyStats.totalPayroll.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Report</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Monthly report functionality coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TimecardSystem;