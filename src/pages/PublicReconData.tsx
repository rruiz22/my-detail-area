import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { googleSheetsService, type GoogleSheetsRow } from '@/services/googleSheetsService';
import { OrderNumberService } from '@/services/orderNumberService';
import { AlertCircle, Car, CheckSquare, Download, Plus, RefreshCw, Search, Square } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

const PublicReconData: React.FC = () => {
  const [data, setData] = useState<GoogleSheetsRow[]>([]);
  const [filteredData, setFilteredData] = useState<GoogleSheetsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>('');

  // Cargar datos al montar el componente
  useEffect(() => {
    loadData();

    // Auto-refresh cada 5 minutos
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Filtrar datos cuando cambia el término de búsqueda
  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(data);
      return;
    }

    const filtered = data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
    setFilteredData(filtered);
  }, [data, searchTerm]);

  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await googleSheetsService.fetchData();

      if (response.success) {
        setData(response.data);
        setLastUpdated(response.lastUpdated || new Date().toISOString());

        if (response.data.length > 0) {
          toast.success(`✅ Datos cargados`, {
            description: `Se cargaron ${response.data.length} registros desde Google Sheets`,
          });
        }
      } else {
        setError(response.error || 'Error desconocido');
        toast.error("❌ Error", {
          description: response.error || "No se pudieron cargar los datos",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      toast.error("🔌 Error de conexión", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const convertSelectedToReconOrders = async () => {
    if (selectedRows.size === 0) {
      toast.error("⚠️ Sin selección", {
        description: "Por favor selecciona al menos un registro para convertir",
      });
      return;
    }

    setLoading(true);
    const orderService = new OrderNumberService();
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const rowId of selectedRows) {
        const row = data.find(r => r.id === rowId);
        if (!row) continue;

        try {
          // Convertir a formato ReconOrder
          const orderData = googleSheetsService.convertToReconOrder(row);

          // Generar número de orden
          const orderNumber = await orderService.generateOrderNumber('recon');

          // Insertar en la base de datos
          const { error } = await supabase.from('recon_orders').insert({
            ...orderData,
            orderNumber,
          });

          if (error) {
            console.error(`Error creating order for row ${rowId}:`, error);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (rowError) {
          console.error(`Error processing row ${rowId}:`, rowError);
          errorCount++;
        }
      }

      toast.success("🎉 Conversión completada", {
        description: `${successCount} órdenes creadas exitosamente${errorCount > 0 ? `, ${errorCount} errores` : ''}`,
      });

      // Limpiar selección
      setSelectedRows(new Set());

    } catch (error) {
      toast.error("❌ Error en la conversión", {
        description: "Ocurrió un error al convertir las órdenes de recon",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['VIN', 'Marca', 'Modelo', 'Año', 'Stock', 'Categoría', 'Grado', 'Costo', 'Prioridad', 'Fecha Entrega', 'Notas'];
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => [
        `"${row.vehicleVin || ''}"`,
        `"${row.vehicleMake || ''}"`,
        `"${row.vehicleModel || ''}"`,
        row.vehicleYear || '',
        `"${row.stockNumber || ''}"`,
        `"${row.reconCategory || ''}"`,
        `"${row.conditionGrade || ''}"`,
        row.reconCost || '',
        `"${row.priority || ''}"`,
        row.dueDate ? new Date(row.dueDate).toLocaleDateString('es-ES') : '',
        `"${(row.notes || '').replace(/"/g, '""')}"` // Escapar comillas
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recon-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleRowSelection = (rowId: string) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === filteredData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filteredData.map(row => row.id!)));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[priority as keyof typeof colors] || colors.normal;
  };

  const getGradeVariant = (grade: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (grade?.toLowerCase()) {
      case 'excellent':
      case 'excelente':
        return 'default';
      case 'good':
      case 'bueno':
        return 'secondary';
      case 'poor':
      case 'malo':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Car className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-900">
              Datos de Reconocimiento
            </h1>
          </div>
          <p className="text-lg text-slate-600">
            Información desde Google Sheets - Conversión a órdenes de recon
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Registros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.length}</div>
              <p className="text-xs text-muted-foreground">
                {filteredData.length} filtrados
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Seleccionados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{selectedRows.size}</div>
              <p className="text-xs text-muted-foreground">
                Para conversión
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Costo Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(data.reduce((sum, row) => sum + (row.reconCost || 0), 0))}
              </div>
              <p className="text-xs text-muted-foreground">
                Todos los registros
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Última Actualización
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {lastUpdated ? new Date(lastUpdated).toLocaleString('es-ES') : 'Nunca'}
              </div>
              <p className="text-xs text-muted-foreground">
                Actualización automática cada 5min
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  🎛️ Control de Datos
                </CardTitle>
                <CardDescription>
                  Gestiona y convierte los datos de Google Sheets a órdenes de recon
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  disabled={filteredData.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
                <Button
                  size="sm"
                  onClick={convertSelectedToReconOrders}
                  disabled={selectedRows.size === 0 || loading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Órdenes ({selectedRows.size})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="🔍 Buscar en todos los campos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Error Alert */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <h4 className="font-medium text-red-800">Error de conexión</h4>
                  <p className="text-sm text-red-600">{error}</p>
                  <p className="text-xs text-red-500 mt-1">
                    Verifica que la URL de tu Google Apps Script esté configurada correctamente en las variables de entorno
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleAllSelection}
                        className="h-8 w-8 p-0"
                      >
                        {selectedRows.size === filteredData.length && filteredData.length > 0 ?
                          <CheckSquare className="h-4 w-4 text-blue-600" /> :
                          <Square className="h-4 w-4" />
                        }
                      </Button>
                    </TableHead>
                    <TableHead>VIN</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Grado</TableHead>
                    <TableHead>Costo</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Fecha Entrega</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-sm">Cargando datos desde Google Sheets...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        {data.length === 0 ? (
                          <div className="space-y-2">
                            <p>📋 No hay datos disponibles</p>
                            <p className="text-xs">Verifica tu configuración de Google Apps Script</p>
                          </div>
                        ) : (
                          "🔍 No se encontraron resultados para la búsqueda"
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((row, index) => (
                      <TableRow
                        key={row.id || index}
                        className={`hover:bg-slate-50 ${selectedRows.has(row.id!) ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                      >
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowSelection(row.id!)}
                            className="h-8 w-8 p-0"
                          >
                            {selectedRows.has(row.id!) ?
                              <CheckSquare className="h-4 w-4 text-blue-600" /> :
                              <Square className="h-4 w-4" />
                            }
                          </Button>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {row.vehicleVin || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {row.vehicleYear} {row.vehicleMake} {row.vehicleModel}
                            </div>
                            {row.stockNumber && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                📋 Stock: {row.stockNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50">
                            {row.reconCategory || 'General'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getGradeVariant(row.conditionGrade || 'Good')}>
                            {row.conditionGrade || 'Good'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-700">
                            {formatCurrency(row.reconCost || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getPriorityColor(row.priority || 'normal')}>
                            {row.priority || 'normal'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {row.dueDate ? (
                            <span className="text-sm">
                              📅 {new Date(row.dueDate).toLocaleDateString('es-ES')}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="truncate text-sm" title={row.notes}>
                            {row.notes ? `📝 ${row.notes}` : '-'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <Card className="bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
          <CardContent className="text-center text-sm text-slate-700 py-4">
            <div className="space-y-2">
              <p className="font-medium">💡 Instrucciones de uso:</p>
              <div className="flex flex-wrap justify-center gap-4 text-xs">
                <span>📋 Datos se actualizan automáticamente cada 5 minutos</span>
                <span>☑️ Selecciona las filas que deseas convertir</span>
                <span>🔄 Presiona "Crear Órdenes" para convertir a recon</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                🔗 Conectado a Google Apps Script para sincronización en tiempo real
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicReconData;
