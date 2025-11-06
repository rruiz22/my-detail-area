import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { getNewYorkDateString, getHourInTimezone } from '@/utils/dateUtils';

interface AppointmentSlot {
  date_slot: string;
  hour_slot: number;
  available_slots: number;
  max_capacity: number;
  is_available: boolean;
}

interface UseAppointmentCapacityReturn {
  checkSlotAvailability: (dealerId: number, date: Date, hour: number) => Promise<AppointmentSlot | null>;
  getAvailableSlots: (dealerId: number, date: Date) => Promise<AppointmentSlot[]>;
  reserveSlot: (dealerId: number, date: Date, hour: number) => Promise<boolean>;
  releaseSlot: (dealerId: number, date: Date, hour: number) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function useAppointmentCapacity(): UseAppointmentCapacityReturn {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if a specific slot is available
  const checkSlotAvailability = useCallback(async (
    dealerId: number,
    date: Date,
    hour: number
  ): Promise<AppointmentSlot | null> => {
    setLoading(true);
    setError(null);

    try {
      // Use New York timezone for consistent slot operations
      const dateString = getNewYorkDateString(date); // YYYY-MM-DD in America/New_York
      const hourInNY = getHourInTimezone(date);

      const { data, error: queryError } = await supabase.rpc('get_available_slots', {
        p_dealer_id: dealerId,
        p_date_slot: dateString,
        p_hour_slot: hourInNY
      });

      if (queryError) {
        setError(queryError.message);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check slot availability';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get all available slots for a specific date
  const getAvailableSlots = useCallback(async (
    dealerId: number,
    date: Date
  ): Promise<AppointmentSlot[]> => {
    setLoading(true);
    setError(null);

    try {
      // Use New York timezone for consistent slot operations
      const dateString = getNewYorkDateString(date);

      const { data, error: queryError } = await supabase.rpc('get_available_slots', {
        p_dealer_id: dealerId,
        p_date_slot: dateString,
        p_hour_slot: null // Get all hours for the date
      });

      if (queryError) {
        setError(queryError.message);
        return [];
      }

      return data || [];

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get available slots';
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Reserve a slot when creating an order
  const reserveSlot = useCallback(async (
    dealerId: number,
    date: Date,
    hour: number
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Use New York timezone for consistent slot operations
      const dateString = getNewYorkDateString(date);
      const hourInNY = getHourInTimezone(date);

      const { data, error: reserveError } = await supabase.rpc('reserve_appointment_slot', {
        p_dealer_id: dealerId,
        p_date_slot: dateString,
        p_hour_slot: hourInNY
      });

      if (reserveError) {
        setError(reserveError.message);
        return false;
      }

      return data === true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reserve slot';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Release a slot when canceling/completing an order
  const releaseSlot = useCallback(async (
    dealerId: number,
    date: Date,
    hour: number
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Use New York timezone for consistent slot operations
      const dateString = getNewYorkDateString(date);
      const hourInNY = getHourInTimezone(date);

      const { data, error: releaseError } = await supabase.rpc('release_appointment_slot', {
        p_dealer_id: dealerId,
        p_date_slot: dateString,
        p_hour_slot: hourInNY
      });

      if (releaseError) {
        setError(releaseError.message);
        return false;
      }

      return data === true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to release slot';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    checkSlotAvailability,
    getAvailableSlots,
    reserveSlot,
    releaseSlot,
    loading,
    error
  };
}