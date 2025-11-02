import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, UserX, Briefcase } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ContactsStatsProps {
  total: number;
  active: number;
  inactive: number;
  byDepartment: Record<string, number>;
  loading?: boolean;
}

export function ContactsStats({ total, active, inactive, byDepartment, loading }: ContactsStatsProps) {
  const { t } = useTranslation();

  const stats = [
    {
      label: t('contacts.total_contacts', 'Total Contacts'),
      value: total,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: t('contacts.active_contacts', 'Active'),
      value: active,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: t('contacts.inactive_contacts', 'Inactive'),
      value: inactive,
      icon: UserX,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      label: t('contacts.departments', 'Departments'),
      value: Object.keys(byDepartment).length,
      icon: Briefcase,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 w-16 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} p-3 rounded-full`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
