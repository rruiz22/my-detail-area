export interface Order {
  id: string;
  vin: string;
  stock?: string;
  year: number;
  make: string;
  model: string;
  service: string;
  description: string;
  price: number;
  status: 'Pending' | 'In Progress' | 'Complete' | 'Cancelled';
  advisor: string;
  createdAt: string;
  updatedAt: string;
  department: 'Sales' | 'Service' | 'Recon' | 'Car Wash';
}

export const mockOrders: Order[] = [
  {
    id: 'SO-2024-001',
    vin: '1HGCM82633A123456',
    stock: 'A2024001',
    year: 2023,
    make: 'Honda',
    model: 'Accord',
    service: 'Pre-Delivery Detail',
    description: 'Full exterior wash, interior detail, and protection package',
    price: 299.99,
    status: 'In Progress',
    advisor: 'Mike Johnson',
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    department: 'Sales'
  },
  {
    id: 'SV-2024-002',
    vin: '2T1BURHE8KC123789',
    year: 2022,
    make: 'Toyota',
    model: 'Corolla',
    service: 'Oil Change + Detail',
    description: 'Standard oil change with interior and exterior detail',
    price: 149.99,
    status: 'Complete',
    advisor: 'Sarah Williams',
    createdAt: '2024-01-14T11:15:00Z',
    updatedAt: '2024-01-14T16:45:00Z',
    department: 'Service'
  },
  {
    id: 'RC-2024-003',
    vin: '1FTFW1ET5DFC123456',
    stock: 'R2024003',
    year: 2021,
    make: 'Ford',
    model: 'F-150',
    service: 'Recon Detail Package',
    description: 'Paint correction, interior deep clean, engine bay detail',
    price: 499.99,
    status: 'Pending',
    advisor: 'Carlos Martinez',
    createdAt: '2024-01-16T08:30:00Z',
    updatedAt: '2024-01-16T08:30:00Z',
    department: 'Recon'
  },
  {
    id: 'CW-2024-004',
    vin: '3VWDB7AJ8CM123456',
    year: 2024,
    make: 'Volkswagen',
    model: 'Jetta',
    service: 'Express Wash',
    description: 'Quick exterior wash and dry',
    price: 29.99,
    status: 'Complete',
    advisor: 'Lisa Chen',
    createdAt: '2024-01-16T12:00:00Z',
    updatedAt: '2024-01-16T12:30:00Z',
    department: 'Car Wash'
  },
  {
    id: 'SO-2024-005',
    vin: '1G6DW677X80123456',
    stock: 'A2024005',
    year: 2023,
    make: 'Cadillac',
    model: 'CT5',
    service: 'Premium Detail',
    description: 'Full premium detail with ceramic coating application',
    price: 799.99,
    status: 'In Progress',
    advisor: 'Robert Taylor',
    createdAt: '2024-01-16T10:15:00Z',
    updatedAt: '2024-01-16T13:20:00Z',
    department: 'Sales'
  }
];

export const getDashboardMetrics = () => {
  const totalOrders = mockOrders.length;
  const pendingOrders = mockOrders.filter(o => o.status === 'Pending').length;
  const inProgressOrders = mockOrders.filter(o => o.status === 'In Progress').length;
  const completedOrders = mockOrders.filter(o => o.status === 'Complete').length;
  const totalRevenue = mockOrders
    .filter(o => o.status === 'Complete')
    .reduce((sum, order) => sum + order.price, 0);

  return {
    totalOrders,
    pendingOrders,
    inProgressOrders,
    completedOrders,
    totalRevenue
  };
};