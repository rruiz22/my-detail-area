// Mock vehicle data - centralized for consistent counting
export const mockVehicles = [
  // Inspection vehicles (3)
  {
    id: 'v1',
    stock_number: 'STK001',
    vin: '1HGBH41JXMN109186',
    year: 2023,
    make: 'Honda',
    model: 'Civic',
    trim: 'LX',
    step_id: 'inspection',
    step_name: 'Inspection',
    workflow_type: 'standard',
    priority: 'high',
    days_in_step: 3,
    days_to_frontline: 15,
    sla_status: 'warning',
    t2l: 15.2,
    holding_cost: 35,
    assigned_to: 'Mike Rodriguez',
    notes: 'Needs detail work for inspection completion',
    progress: 65,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-18T14:22:00Z',
    images: ['/api/placeholder/80/60'],
    work_items: 4,
    media_count: 2
  },
  {
    id: 'v2',
    stock_number: 'STK004',
    vin: '2HGBH41JXMN109187',
    year: 2023,
    make: 'Nissan',
    model: 'Altima',
    trim: 'S',
    step_id: 'inspection',
    step_name: 'Inspection',
    workflow_type: 'express',
    priority: 'medium',
    days_in_step: 1,
    days_to_frontline: 14,
    sla_status: 'on_track',
    t2l: 14.0,
    holding_cost: 30,
    assigned_to: 'Lisa Chen',
    notes: 'Routine inspection, minor scratches noted',
    progress: 25,
    created_at: '2024-01-20T08:30:00Z',
    updated_at: '2024-01-20T10:15:00Z',
    images: ['/api/placeholder/80/60'],
    work_items: 2,
    media_count: 1
  },
  {
    id: 'v3',
    stock_number: 'STK005',
    vin: '3HGBH41JXMN109188',
    year: 2022,
    make: 'Mazda',
    model: 'CX-5',
    trim: 'Touring',
    step_id: 'inspection',
    step_name: 'Inspection',
    workflow_type: 'priority',
    priority: 'urgent',
    days_in_step: 5,
    days_to_frontline: 16,
    sla_status: 'critical',
    t2l: 16.5,
    holding_cost: 40,
    assigned_to: 'Carlos Martinez',
    notes: 'Priority inspection - customer waiting',
    progress: 80,
    created_at: '2024-01-14T14:00:00Z',
    updated_at: '2024-01-19T16:30:00Z',
    images: ['/api/placeholder/80/60'],
    work_items: 3,
    media_count: 3
  },

  // Mechanical vehicles (2)
  {
    id: 'v4',
    stock_number: 'STK002',
    vin: '4T1BF1FK5DU109187',
    year: 2022,
    make: 'Toyota',
    model: 'Camry',
    trim: 'LE',
    step_id: 'mechanical',
    step_name: 'Mechanical',
    workflow_type: 'express',
    priority: 'medium',
    days_in_step: 7,
    days_to_frontline: 8,
    sla_status: 'critical',
    t2l: 8.1,
    holding_cost: 50,
    assigned_to: 'Sarah Johnson',
    notes: 'Oil change required, brake inspection needed',
    progress: 40,
    created_at: '2024-01-12T09:15:00Z',
    updated_at: '2024-01-19T11:30:00Z',
    images: ['/api/placeholder/80/60'],
    work_items: 3,
    media_count: 1
  },
  {
    id: 'v5',
    stock_number: 'STK006',
    vin: '5T1BF1FK5DU109189',
    year: 2023,
    make: 'Subaru',
    model: 'Outback',
    trim: 'Premium',
    step_id: 'mechanical',
    step_name: 'Mechanical',
    workflow_type: 'standard',
    priority: 'high',
    days_in_step: 4,
    days_to_frontline: 6,
    sla_status: 'warning',
    t2l: 6.8,
    holding_cost: 45,
    assigned_to: 'David Kim',
    notes: 'Transmission service, timing belt replacement',
    progress: 60,
    created_at: '2024-01-16T11:20:00Z',
    updated_at: '2024-01-20T09:45:00Z',
    images: ['/api/placeholder/80/60'],
    work_items: 5,
    media_count: 2
  },

  // Body Work vehicles (1)
  {
    id: 'v6',
    stock_number: 'STK007',
    vin: '6FTFW1ET5DFC109190',
    year: 2024,
    make: 'Hyundai',
    model: 'Tucson',
    trim: 'SEL',
    step_id: 'body_work',
    step_name: 'Body Work',
    workflow_type: 'standard',
    priority: 'medium',
    days_in_step: 6,
    days_to_frontline: 8,
    sla_status: 'warning',
    t2l: 8.2,
    holding_cost: 55,
    assigned_to: 'Roberto Silva',
    notes: 'Rear bumper repair, paint touch-up required',
    progress: 30,
    created_at: '2024-01-13T15:30:00Z',
    updated_at: '2024-01-19T12:00:00Z',
    images: ['/api/placeholder/80/60'],
    work_items: 4,
    media_count: 6
  },

  // Detailing vehicles (2)
  {
    id: 'v7',
    stock_number: 'STK003',
    vin: '1FTFW1ET5DFC109188',
    year: 2024,
    make: 'Ford',
    model: 'F-150',
    trim: 'XLT',
    step_id: 'detailing',
    step_name: 'Detailing',
    workflow_type: 'priority',
    priority: 'low',
    days_in_step: 2,
    days_to_frontline: 2,
    sla_status: 'on_track',
    t2l: 2.5,
    holding_cost: 15,
    assigned_to: 'Alex Chen',
    notes: 'Interior detail in progress, exterior complete',
    progress: 85,
    created_at: '2024-01-17T13:45:00Z',
    updated_at: '2024-01-19T16:20:00Z',
    images: ['/api/placeholder/80/60'],
    work_items: 2,
    media_count: 8
  },
  {
    id: 'v8',
    stock_number: 'STK008',
    vin: '7FTFW1ET5DFC109191',
    year: 2023,
    make: 'Jeep',
    model: 'Cherokee',
    trim: 'Latitude',
    step_id: 'detailing',
    step_name: 'Detailing',
    workflow_type: 'express',
    priority: 'normal',
    days_in_step: 1,
    days_to_frontline: 1,
    sla_status: 'on_track',
    t2l: 1.2,
    holding_cost: 20,
    assigned_to: 'Maria Gonzalez',
    notes: 'Final detail and quality check',
    progress: 95,
    created_at: '2024-01-19T10:00:00Z',
    updated_at: '2024-01-20T14:30:00Z',
    images: ['/api/placeholder/80/60'],
    work_items: 1,
    media_count: 4
  }
];

export interface MockVehicle {
  id: string;
  stock_number: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  step_id: string;
  step_name: string;
  workflow_type: 'standard' | 'express' | 'priority';
  priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
  days_in_step: number;
  days_to_frontline: number;
  sla_status: 'on_track' | 'warning' | 'critical';
  t2l: number;
  holding_cost: number;
  assigned_to: string;
  notes: string;
  progress: number;
  created_at: string;
  updated_at: string;
  images: string[];
  work_items: number;
  media_count: number;
}






