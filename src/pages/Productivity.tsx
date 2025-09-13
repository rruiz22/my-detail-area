import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CheckSquare, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProductivityTodos } from "@/components/productivity/ProductivityTodos";
import { ProductivityCalendar } from "@/components/productivity/ProductivityCalendar";
import { ProductivityDashboard } from "@/components/productivity/ProductivityDashboard";
import { useState } from "react";

export default function Productivity() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('productivity.title')}</h1>
            <p className="text-muted-foreground">
              {t('productivity.description')}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {t('productivity.dashboard')}
            </TabsTrigger>
            <TabsTrigger value="todos" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              {t('productivity.todos')}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('productivity.calendar')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <ProductivityDashboard />
          </TabsContent>

          <TabsContent value="todos" className="space-y-4">
            <ProductivityTodos />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <ProductivityCalendar />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}