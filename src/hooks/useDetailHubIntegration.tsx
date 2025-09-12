import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  department: string;
  hourly_rate: number;
  hire_date: string;
  status: 'active' | 'inactive';
  face_id?: string;
  created_at: string;
  updated_at: string;
}

interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out?: string;
  break_start?: string;
  break_end?: string;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  status: 'active' | 'complete';
  created_at: string;
}

interface FaceRecognitionResult {
  employee_id: string;
  confidence: number;
  success: boolean;
  face_id?: string;
}

// Mock data for development
const mockEmployees: Employee[] = [
  {
    id: 'emp-001',
    employee_number: 'EMP001',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@dealership.com',
    role: 'Senior Detailer',
    department: 'Detail',
    hourly_rate: 25.00,
    hire_date: '2023-01-15',
    status: 'active',
    face_id: 'face_001',
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: 'emp-002',
    employee_number: 'EMP002',
    first_name: 'Maria',
    last_name: 'Garcia',
    email: 'maria.garcia@dealership.com',
    role: 'Detail Technician',
    department: 'Detail',
    hourly_rate: 20.00,
    hire_date: '2023-03-20',
    status: 'active',
    created_at: '2023-03-20T00:00:00Z',
    updated_at: '2023-03-20T00:00:00Z'
  }
];

export const useDetailHubIntegration = () => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const { toast } = useToast();

  // Employee Management
  const createEmployee = useCallback(async (employeeData: Partial<Employee>) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newEmployee: Employee = {
        id: `emp-${Date.now()}`,
        employee_number: `EMP${String(employees.length + 1).padStart(3, '0')}`,
        first_name: employeeData.first_name || '',
        last_name: employeeData.last_name || '',
        email: employeeData.email || '',
        role: employeeData.role || '',
        department: employeeData.department || '',
        hourly_rate: employeeData.hourly_rate || 0,
        hire_date: employeeData.hire_date || new Date().toISOString().split('T')[0],
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setEmployees(prev => [...prev, newEmployee]);
      
      toast({
        title: "Employee Created",
        description: `${newEmployee.first_name} ${newEmployee.last_name} has been added successfully.`
      });

      return { data: newEmployee, error: null };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [employees.length, toast]);

  const updateEmployee = useCallback(async (employeeId: string, updates: Partial<Employee>) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setEmployees(prev => prev.map(emp => 
        emp.id === employeeId 
          ? { ...emp, ...updates, updated_at: new Date().toISOString() }
          : emp
      ));
      
      toast({
        title: "Employee Updated",
        description: "Employee information has been updated successfully."
      });

      return { data: updates, error: null };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Employees are already set in state
      return { data: employees, error: null };
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch employees",
        variant: "destructive"
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [employees, toast]);

  // Face Recognition Integration (Mock)
  const enrollFace = useCallback(async (employeeId: string, imageData: string) => {
    setLoading(true);
    try {
      // Simulate AWS Rekognition API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const faceId = `face_${employeeId}_${Date.now()}`;
      
      // Update employee with face_id
      await updateEmployee(employeeId, { face_id: faceId });

      toast({
        title: "Face Enrollment Complete",
        description: "Employee can now use facial recognition for time tracking."
      });

      return { data: { face_id: faceId }, error: null };
    } catch (error: any) {
      toast({
        title: "Enrollment Failed",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [updateEmployee, toast]);

  const verifyFace = useCallback(async (imageData: string): Promise<FaceRecognitionResult> => {
    setLoading(true);
    try {
      // Simulate face recognition
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful recognition for demo
      const employee = employees.find(emp => emp.face_id);
      
      if (employee && Math.random() > 0.2) { // 80% success rate for demo
        return {
          employee_id: employee.id,
          confidence: 0.95,
          success: true,
          face_id: employee.face_id
        };
      } else {
        return {
          employee_id: '',
          confidence: 0,
          success: false
        };
      }
    } catch (error: any) {
      toast({
        title: "Face Recognition Error",
        description: error.message,
        variant: "destructive"
      });
      return {
        employee_id: '',
        confidence: 0,
        success: false
      };
    } finally {
      setLoading(false);
    }
  }, [employees, toast]);

  // Time Tracking (Mock)
  const clockIn = useCallback(async (employeeId: string, method: 'face' | 'manual' = 'manual') => {
    setLoading(true);
    try {
      // Check if employee already clocked in
      const existingEntry = timeEntries.find(entry => 
        entry.employee_id === employeeId && entry.status === 'active'
      );

      if (existingEntry) {
        throw new Error('Employee is already clocked in');
      }

      const newEntry: TimeEntry = {
        id: `time-${Date.now()}`,
        employee_id: employeeId,
        clock_in: new Date().toISOString(),
        status: 'active',
        regular_hours: 0,
        overtime_hours: 0,
        total_hours: 0,
        created_at: new Date().toISOString()
      };

      setTimeEntries(prev => [...prev, newEntry]);

      toast({
        title: "Clocked In",
        description: `Successfully clocked in at ${new Date().toLocaleTimeString()}`
      });

      return { data: newEntry, error: null };
    } catch (error: any) {
      toast({
        title: "Clock In Failed",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [timeEntries, toast]);

  const clockOut = useCallback(async (employeeId: string) => {
    setLoading(true);
    try {
      const activeEntry = timeEntries.find(entry => 
        entry.employee_id === employeeId && entry.status === 'active'
      );

      if (!activeEntry) {
        throw new Error('No active time entry found');
      }

      const clockOutTime = new Date();
      const clockInTime = new Date(activeEntry.clock_in);
      const totalHours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
      const regularHours = Math.min(totalHours, 8);
      const overtimeHours = Math.max(totalHours - 8, 0);

      const updatedEntry: TimeEntry = {
        ...activeEntry,
        clock_out: clockOutTime.toISOString(),
        total_hours: totalHours,
        regular_hours: regularHours,
        overtime_hours: overtimeHours,
        status: 'complete'
      };

      setTimeEntries(prev => prev.map(entry => 
        entry.id === activeEntry.id ? updatedEntry : entry
      ));

      toast({
        title: "Clocked Out",
        description: `Successfully clocked out. Total hours: ${totalHours.toFixed(2)}`
      });

      return { data: updatedEntry, error: null };
    } catch (error: any) {
      toast({
        title: "Clock Out Failed",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [timeEntries, toast]);

  const startBreak = useCallback(async (employeeId: string) => {
    setLoading(true);
    try {
      const activeEntry = timeEntries.find(entry => 
        entry.employee_id === employeeId && entry.status === 'active'
      );

      if (!activeEntry) {
        throw new Error('No active time entry found');
      }

      const updatedEntry = {
        ...activeEntry,
        break_start: new Date().toISOString()
      };

      setTimeEntries(prev => prev.map(entry => 
        entry.id === activeEntry.id ? updatedEntry : entry
      ));

      toast({
        title: "Break Started",
        description: "Break time has been recorded"
      });

      return { data: updatedEntry, error: null };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [timeEntries, toast]);

  const endBreak = useCallback(async (employeeId: string) => {
    setLoading(true);
    try {
      const activeEntry = timeEntries.find(entry => 
        entry.employee_id === employeeId && entry.status === 'active'
      );

      if (!activeEntry || !activeEntry.break_start) {
        throw new Error('No active break found');
      }

      const updatedEntry = {
        ...activeEntry,
        break_end: new Date().toISOString()
      };

      setTimeEntries(prev => prev.map(entry => 
        entry.id === activeEntry.id ? updatedEntry : entry
      ));

      toast({
        title: "Break Ended",
        description: "Break time has been recorded"
      });

      return { data: updatedEntry, error: null };
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [timeEntries, toast]);

  // Utility function to generate employee number
  const generateEmployeeNumber = async (): Promise<string> => {
    return `EMP${String(employees.length + 1).padStart(3, '0')}`;
  };

  // Fetch time entries (Mock)
  const fetchTimeEntries = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filteredEntries = timeEntries;
      
      if (startDate) {
        filteredEntries = filteredEntries.filter(entry => 
          entry.clock_in >= startDate
        );
      }
      if (endDate) {
        filteredEntries = filteredEntries.filter(entry => 
          entry.clock_in <= endDate
        );
      }

      return { data: filteredEntries, error: null };
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch time entries",
        variant: "destructive"
      });
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  }, [timeEntries, toast]);

  return {
    // State
    loading,
    employees,
    timeEntries,

    // Employee Management
    createEmployee,
    updateEmployee,
    fetchEmployees,

    // Face Recognition
    enrollFace,
    verifyFace,

    // Time Tracking
    clockIn,
    clockOut,
    startBreak,
    endBreak,
    fetchTimeEntries,

    // Utilities
    generateEmployeeNumber
  };
};