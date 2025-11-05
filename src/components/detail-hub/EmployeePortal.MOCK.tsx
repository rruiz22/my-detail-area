import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Search, Edit, Trash2, Camera, Shield, Clock, DollarSign } from "lucide-react";

const EmployeePortal = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);

  const employees = [
    {
      id: "EMP001",
      name: "John Smith",
      email: "john.smith@dealership.com",
      role: "Senior Detailer",
      department: "Detail",
      status: "Active",
      hourlyRate: 25.00,
      hireDate: "2023-01-15",
      lastPunch: "2024-12-12 5:30 PM",
      avatar: "/placeholder.svg"
    },
    {
      id: "EMP002",
      name: "Maria Garcia",
      email: "maria.garcia@dealership.com",
      role: "Detail Technician",
      department: "Detail",
      status: "Active",
      hourlyRate: 20.00,
      hireDate: "2023-03-20",
      lastPunch: "2024-12-12 10:15 AM",
      avatar: "/placeholder.svg"
    },
    {
      id: "EMP003",
      name: "Mike Johnson",
      email: "mike.johnson@dealership.com",
      role: "Car Wash Attendant",
      department: "Car Wash",
      status: "Active",
      hourlyRate: 18.00,
      hireDate: "2023-06-10",
      lastPunch: "2024-12-12 5:30 PM",
      avatar: "/placeholder.svg"
    },
    {
      id: "EMP004",
      name: "Sarah Wilson",
      email: "sarah.wilson@dealership.com",
      role: "Quality Inspector",
      department: "Detail",
      status: "Inactive",
      hourlyRate: 22.00,
      hireDate: "2023-02-28",
      lastPunch: "2024-12-10 4:45 PM",
      avatar: "/placeholder.svg"
    }
  ];

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    return status === "Active" ?
      <Badge className="bg-green-100 text-green-800">{t('detail_hub.employees.active')}</Badge> :
      <Badge variant="secondary">{t('detail_hub.employees.inactive')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('detail_hub.employees.title')}</h1>
          <p className="text-muted-foreground">{t('detail_hub.employees.subtitle')}</p>
        </div>
        <Dialog open={isAddingEmployee} onOpenChange={setIsAddingEmployee}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              {t('detail_hub.employees.add_employee')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('detail_hub.employees.add_employee')}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('common.first_name')}</Label>
                  <Input id="firstName" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('common.last_name')}</Label>
                  <Input id="lastName" placeholder="Smith" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('common.email')}</Label>
                <Input id="email" type="email" placeholder="john.smith@dealership.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">{t('detail_hub.employees.role')}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={t('validation.option_required')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="senior-detailer">{t('detail_hub.employees.roles.detailer')}</SelectItem>
                      <SelectItem value="detail-technician">{t('detail_hub.employees.roles.technician')}</SelectItem>
                      <SelectItem value="car-wash-attendant">{t('detail_hub.employees.roles.car_wash')}</SelectItem>
                      <SelectItem value="quality-inspector">{t('detail_hub.employees.roles.supervisor')}</SelectItem>
                      <SelectItem value="supervisor">{t('detail_hub.employees.roles.manager')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">{t('detail_hub.employees.department')}</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder={t('validation.option_required')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="detail">{t('detail_hub.employees.departments.detail')}</SelectItem>
                      <SelectItem value="car-wash">{t('detail_hub.employees.departments.car_wash')}</SelectItem>
                      <SelectItem value="quality-control">{t('detail_hub.employees.departments.service')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">{t('detail_hub.employees.hourly_rate')} ($)</Label>
                <Input id="hourlyRate" type="number" placeholder="25.00" step="0.01" />
              </div>
              <div className="flex justify-center">
                <Button variant="outline" className="w-40">
                  <Camera className="w-4 h-4 mr-2" />
                  {t('detail_hub.employees.enroll_face_id')}
                </Button>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddingEmployee(false)}>
                {t('detail_hub.common.cancel')}
              </Button>
              <Button onClick={() => setIsAddingEmployee(false)}>
                {t('detail_hub.employees.add_employee')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t('detail_hub.employees.search_employees')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Employees Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('detail_hub.employees.employee_list')} ({filteredEmployees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('detail_hub.employees.employee_details')}</TableHead>
                <TableHead>{t('detail_hub.employees.role')}</TableHead>
                <TableHead>{t('detail_hub.employees.department')}</TableHead>
                <TableHead>{t('detail_hub.employees.status')}</TableHead>
                <TableHead>{t('detail_hub.employees.hourly_rate')}</TableHead>
                <TableHead>{t('detail_hub.employees.last_punch')}</TableHead>
                <TableHead>{t('detail_hub.employees.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={employee.avatar} />
                        <AvatarFallback>
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.id}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{employee.role}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{getStatusBadge(employee.status)}</TableCell>
                  <TableCell>${employee.hourlyRate.toFixed(2)}/hr</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {employee.lastPunch}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Clock className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Shield className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.timecard.stats.active_employees')}</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.employees.active')} {t('time.today')}</p>
                <p className="text-2xl font-bold">{employees.filter(e => e.status === 'Active').length}</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.employees.hourly_rate')}</p>
                <p className="text-2xl font-bold">
                  ${(employees.reduce((sum, emp) => sum + emp.hourlyRate, 0) / employees.length).toFixed(2)}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeePortal;
