/**
 * KioskPinExample Component
 *
 * Complete example showing how to use all 4 kiosk components together:
 * - EmployeeHeader: Display employee info
 * - WeekStatsCard: Show weekly hours summary
 * - PinInputDisplay: Visual PIN input boxes
 * - NumericKeypad: PIN entry keypad
 *
 * This is a reference implementation for the intelligent kiosk system.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmployeeHeader } from './EmployeeHeader';
import { WeekStatsCard } from './WeekStatsCard';
import { PinInputDisplay } from './PinInputDisplay';
import { NumericKeypad } from './NumericKeypad';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { DetailHubEmployee } from '@/hooks/useDetailHubDatabase';

interface KioskPinExampleProps {
  employee: DetailHubEmployee;
  weeklyStats: {
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    daysWorked: number;
  };
  onPinVerified: () => void;
  onBack: () => void;
}

export function KioskPinExample({
  employee,
  weeklyStats,
  onPinVerified,
  onBack
}: KioskPinExampleProps) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // PIN length from employee record (4 or 6 digits)
  const pinLength = employee.pin_code?.length || 6;

  const handleNumberClick = (num: number) => {
    if (pin.length < pinLength) {
      setPin(pin + num);
      setError(false);
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const handleSubmit = async () => {
    if (pin.length !== pinLength) {
      return; // Wait for full PIN
    }

    setIsLoading(true);

    // Simulate PIN verification delay
    await new Promise(resolve => setTimeout(resolve, 500));

    if (pin === employee.pin_code) {
      // Success - PIN verified
      setError(false);
      onPinVerified();
    } else {
      // Error - incorrect PIN
      setError(true);
      setPin('');
      setTimeout(() => setError(false), 2000);
    }

    setIsLoading(false);
  };

  // Auto-submit when PIN is complete
  if (pin.length === pinLength && !isLoading) {
    handleSubmit();
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('detail_hub.punch_clock.back_to_search')}
        </Button>

        {/* Employee Header */}
        <EmployeeHeader
          employee={employee}
          statusBadge={{
            text: t('detail_hub.punch_clock.scheduled'),
            variant: 'secondary'
          }}
        />

        {/* Weekly Stats */}
        <WeekStatsCard
          totalHours={weeklyStats.totalHours}
          regularHours={weeklyStats.regularHours}
          overtimeHours={weeklyStats.overtimeHours}
          daysWorked={weeklyStats.daysWorked}
        />

        {/* PIN Entry Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('detail_hub.punch_clock.enter_pin')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('detail_hub.employees.kiosk_pin_help')}
            </p>
          </div>

          {/* PIN Display */}
          <PinInputDisplay
            pin={pin}
            length={pinLength}
            error={error}
          />

          {/* Keypad */}
          <NumericKeypad
            onNumberClick={handleNumberClick}
            onBackspace={handleBackspace}
            onSubmit={handleSubmit}
            disabled={isLoading}
          />

          {/* Error Message */}
          {error && (
            <div className="text-center text-sm text-red-600 bg-red-50 p-2 rounded">
              {t('detail_hub.punch_clock.pin_incorrect', { attempts: 3 })}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center text-sm text-gray-600">
              {t('detail_hub.common.loading')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
