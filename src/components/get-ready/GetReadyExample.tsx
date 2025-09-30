import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { GetReadyContent } from './GetReadyContent';

/**
 * Ejemplo completo de cómo usar el módulo Get Ready optimizado
 *
 * Este componente demuestra todas las funcionalidades implementadas:
 * 1. Vista principal con tabs (Overview, Vehicles, Analytics, Workflow)
 * 2. Dashboard con KPIs en tiempo real
 * 3. Sistema de alertas avanzado
 * 4. Lista de vehículos con filtros y búsqueda
 * 5. Sidebar con métricas y SLA indicators
 * 6. Acciones de workflow
 * 7. Soporte multiidioma
 */
export function GetReadyExample() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header con información del ejemplo */}
      <div className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Get Ready - Workflow Optimizado</h1>
              <p className="text-muted-foreground">
                Ejemplo completo de implementación con todas las funcionalidades
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary">
                ✨ Nuevo
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                v2.0 Mejorado
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Características implementadas */}
      <div className="container mx-auto px-6 py-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🎯 Dashboard KPIs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                T2L, SLA Compliance, Throughput, Costos de retención
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🚨 Sistema de Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Bottlenecks, SLA warnings, escalaciones automáticas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">🔍 Filtros Avanzados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Búsqueda, filtros por step/workflow/prioridad, ordenamiento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">⚡ Workflow Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Acciones rápidas, optimización, gestión de recursos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Características técnicas */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>🛠️ Características Técnicas</CardTitle>
            <CardDescription>
              Tecnologías y patrones implementados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <h4 className="font-semibold mb-2">Frontend</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• React + TypeScript</li>
                  <li>• Tailwind CSS + shadcn/ui</li>
                  <li>• React Query para datos</li>
                  <li>• React i18next para traducciones</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Arquitectura</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Componentes modulares</li>
                  <li>• Custom hooks para lógica</li>
                  <li>• TypeScript interfaces</li>
                  <li>• Estado compartido (Zustand)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">UX/UI</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Diseño responsive</li>
                  <li>• Indicadores visuales</li>
                  <li>• Tooltips informativos</li>
                  <li>• Loading states</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instrucciones de uso */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>📋 Cómo Usar</CardTitle>
            <CardDescription>
              Instrucciones paso a paso para usar el módulo Get Ready
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold">Overview Dashboard</h4>
                  <p className="text-sm text-muted-foreground">
                    Monitorea KPIs en tiempo real: T2L, SLA compliance, throughput diario, costos
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold">Lista de Vehículos</h4>
                  <p className="text-sm text-muted-foreground">
                    Filtra por step, workflow, prioridad. Ordena y busca vehículos fácilmente
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold">Workflow Management</h4>
                  <p className="text-sm text-muted-foreground">
                    Ejecuta acciones rápidas, resuelve bottlenecks, optimiza procesos
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-semibold">Alertas y SLA</h4>
                  <p className="text-sm text-muted-foreground">
                    Recibe notificaciones proactivas sobre cuellos de botella y SLA risks
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botón para comenzar */}
        <div className="text-center">
          <Button size="lg" className="px-8">
            🚀 Explorar Get Ready Optimizado
          </Button>
        </div>
      </div>

      {/* El módulo Get Ready completo */}
      <div className="border-t">
        <GetReadyContent />
      </div>
    </div>
  );
}


