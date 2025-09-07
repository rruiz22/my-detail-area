import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, TrendingUp, Calendar } from "lucide-react";
import { useTranslation } from 'react-i18next';

export default function Reports() {
  const { t } = useTranslation();
  
  return (
    <DashboardLayout title={t('pages.reports')}>
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Select defaultValue="30days">
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('placeholders.select_time_period')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select defaultValue="all">
            <SelectTrigger className="w-48">
              <SelectValue placeholder={t('placeholders.select_department')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="service">Service</SelectItem>
              <SelectItem value="recon">Recon</SelectItem>
              <SelectItem value="carwash">Car Wash</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Daily Report</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Daily operations summary with order counts and revenue
              </p>
              <Button size="sm" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Weekly Report</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Weekly performance metrics and trends analysis
              </p>
              <Button size="sm" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Monthly Report</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Comprehensive monthly business overview
              </p>
              <Button size="sm" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download CSV
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Custom Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Reports & Advanced Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium mb-2">Database Integration Required</h4>
              <p className="text-muted-foreground mb-4">
                For advanced reporting, SMS notifications, VIN decoding, and file storage features, 
                connect your MDA platform to Supabase using our native integration.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Supabase integration enables:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 mb-4">
                <li>Persistent order storage and management</li>
                <li>SMS notifications via Twilio integration</li>
                <li>Advanced reporting and analytics</li>
                <li>Photo management and file storage</li>
                <li>User authentication and role management</li>
              </ul>
              <Button>
                Connect to Supabase
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}