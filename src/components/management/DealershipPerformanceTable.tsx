import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Building2, 
  Users, 
  ClipboardList, 
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es, ptBR } from 'date-fns/locale';

interface DealershipPerformance {
  dealership_id: number;
  dealership_name: string;
  total_users: number;
  active_users: number;
  total_orders: number;
  orders_this_month: number;
  avg_orders_per_user: number;
  user_growth_rate: number;
  last_activity: string;
  status: string;
}

interface DealershipPerformanceTableProps {
  className?: string;
}

export const DealershipPerformanceTable: React.FC<DealershipPerformanceTableProps> = ({ 
  className 
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [performance, setPerformance] = useState<DealershipPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceStats();
  }, []);

  const fetchPerformanceStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .rpc('get_dealership_performance_stats');

      if (error) throw error;

      setPerformance(data || []);
    } catch (err: any) {
      console.error('Error fetching performance stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPerformanceIndicator = (rate: number) => {
    if (rate >= 80) {
      return { icon: TrendingUp, color: 'text-green-600', label: 'Excelente' };
    } else if (rate >= 60) {
      return { icon: TrendingUp, color: 'text-yellow-600', label: 'Bueno' };
    } else {
      return { icon: TrendingDown, color: 'text-red-600', label: 'Bajo' };
    }
  };

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'es':
        return es;
      case 'pt-BR':
        return ptBR;
      default:
        return undefined;
    }
  };

  const handleViewDealership = (dealershipId: number) => {
    navigate(`/dealers/${dealershipId}`);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Rendimiento de Concesionarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p>Error al cargar estadísticas de rendimiento</p>
            <Button variant="outline" size="sm" onClick={fetchPerformanceStats} className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Rendimiento de Concesionarios
            </CardTitle>
            <CardDescription>
              Análisis de actividad y métricas de rendimiento por concesionario
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={fetchPerformanceStats}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {performance.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No hay datos de rendimiento disponibles</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concesionario</TableHead>
                  <TableHead className="text-center">Usuarios</TableHead>
                  <TableHead className="text-center">Órdenes</TableHead>
                  <TableHead className="text-center">Rendimiento</TableHead>
                  <TableHead className="text-center">Actividad</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.map((dealership) => {
                  const performanceIndicator = getPerformanceIndicator(dealership.user_growth_rate);
                  const PerformanceIcon = performanceIndicator.icon;
                  
                  return (
                    <TableRow 
                      key={dealership.dealership_id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDealership(dealership.dealership_id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              <Building2 className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{dealership.dealership_name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {dealership.dealership_id}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{dealership.total_users}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dealership.active_users} activos
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1">
                            <ClipboardList className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{dealership.total_orders}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dealership.orders_this_month} este mes
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`flex items-center gap-1 ${performanceIndicator.color}`}>
                            <PerformanceIcon className="h-4 w-4" />
                            <span className="font-medium">{dealership.user_growth_rate}%</span>
                          </div>
                          <div className={`text-xs ${performanceIndicator.color}`}>
                            {performanceIndicator.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {dealership.avg_orders_per_user.toFixed(1)} órd/usuario
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(dealership.last_activity), {
                            addSuffix: true,
                            locale: getDateLocale()
                          })}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-center">
                        <Badge variant={getStatusBadgeVariant(dealership.status)}>
                          {t(`dealerships.${dealership.status}`)}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDealership(dealership.dealership_id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};