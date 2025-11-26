/**
 * RemoteKioskTokenCharts
 *
 * Analytics charts for remote kiosk tokens:
 * 1. Line chart: Tokens created per day (last 30 days)
 * 2. Bar chart: Usage by employee (top 10)
 */

import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import { useTokensCreatedPerDay, useUsageByEmployee } from "@/hooks/useRemoteKioskTokens";

export function RemoteKioskTokenCharts() {
  const { t } = useTranslation();

  const { data: tokensPerDay = [], isLoading: loadingTokensPerDay } = useTokensCreatedPerDay(30);
  const { data: usageByEmployee = [], isLoading: loadingUsageByEmployee } = useUsageByEmployee(10);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Tokens Created Per Day */}
      <Card className="card-enhanced">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-gray-500" />
            {t('remote_kiosk_management.charts.tokens_created_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTokensPerDay ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : tokensPerDay.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
              {t('remote_kiosk_management.empty_states.no_tokens_message')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={tokensPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  fontSize={12}
                  tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                  formatter={(value) => [`${value} ${t('remote_kiosk_management.charts.count')}`, t('remote_kiosk_management.charts.count')]}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Usage By Employee */}
      <Card className="card-enhanced">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            {t('remote_kiosk_management.charts.usage_by_employee_title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingUsageByEmployee ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : usageByEmployee.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
              {t('remote_kiosk_management.empty_states.no_tokens_message')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={usageByEmployee}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value) => [`${value} ${t('remote_kiosk_management.charts.uses')}`, t('remote_kiosk_management.charts.uses')]}
                />
                <Bar
                  dataKey="uses"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
