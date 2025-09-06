import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Search, Filter, Download, Upload } from 'lucide-react';
import { UserRoleManager } from '@/components/permissions/UserRoleManager';
import { useTranslation } from 'react-i18next';

export const UserManagementSection = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('management.user_management')}
          </CardTitle>
          <CardDescription>
            Gestiona usuarios del sistema, roles y permisos en todos los concesionarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {t('users.add_new')}
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Importar Usuarios
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Exportar Reporte
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Management Table */}
      <UserRoleManager />
    </div>
  );
};