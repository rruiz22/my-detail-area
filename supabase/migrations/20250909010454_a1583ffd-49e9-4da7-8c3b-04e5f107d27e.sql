-- Test orders with high unique numbers to avoid conflicts

INSERT INTO orders (
  order_number, custom_order_number, order_type, customer_name, customer_email, customer_phone,
  vehicle_year, vehicle_make, vehicle_model, vehicle_vin, stock_number,
  status, priority, services, total_amount, notes, salesperson,
  dealer_id, created_at, updated_at, sla_deadline, completed_at
) VALUES

-- Sales Test Orders (SA-1001 series - guaranteed unique)
('SA-1001', 'SALES-T1001', 'sales', 'Michael Johnson BMW X3', 'mjohnson.test@email.com', '+1-555-1001',
 2024, 'BMW', 'X3 xDrive30i', '5UX43DP05R9T12345', 'TEST001',
 'pending', 'high', '[{"name": "Pre-Delivery Inspection", "price": 250}, {"name": "Premium Detail", "price": 450}]'::jsonb, 
 700.00, 'TEST: New vehicle delivery prep', 'Sarah Miller',
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day', NULL),

('SA-1002', 'SALES-T1002', 'sales', 'Jennifer Davis 330i', 'jdavis.test@email.com', '+1-555-1002',
 2023, 'BMW', '330i', 'WBA5R1C50N7T23456', 'TEST002',
 'in_progress', 'normal', '[{"name": "Final Inspection", "price": 150}, {"name": "Delivery Prep", "price": 200}]'::jsonb,
 350.00, 'TEST: Certified pre-owned preparation', 'Mike Thompson',
 5, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', NULL),

('SA-1003', 'SALES-T1003', 'sales', 'Robert Wilson X5', 'rwilson.test@email.com', '+1-555-1003',
 2024, 'BMW', 'X5 xDrive40i', '5UX53DP05R9T34567', 'TEST003',
 'completed', 'normal', '[{"name": "New Car Prep", "price": 300}, {"name": "Paint Protection", "price": 800}]'::jsonb,
 1100.00, 'TEST: Complete new vehicle preparation', 'Sarah Miller',
 5, NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

('SA-1004', 'SALES-T1004', 'sales', 'Amanda Brown i4', 'abrown.test@email.com', '+1-555-1004',
 2023, 'BMW', 'i4 eDrive40', 'WBA4J1C08N5T45678', 'TEST004',
 'pending', 'high', '[{"name": "Electric Vehicle Prep", "price": 400}, {"name": "Tech Setup", "price": 150}]'::jsonb,
 550.00, 'TEST: Electric vehicle delivery preparation', 'David Chen',
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '3 days', NULL),

('SA-1005', 'SALES-T1005', 'sales', 'Christopher Martinez M3', 'cmartinez.test@email.com', '+1-555-1005',
 2024, 'BMW', 'M3 Competition', 'WBS8M9C09R5T56789', 'TEST005',
 'in_progress', 'urgent', '[{"name": "Performance Package Prep", "price": 500}, {"name": "M Detail Package", "price": 750}]'::jsonb,
 1250.00, 'TEST: High-performance vehicle preparation', 'Sarah Miller',
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '6 hours', NOW() + INTERVAL '1 day', NULL),

-- Service Test Orders (SV-2001 series)
('SV-2001', 'SERVICE-T2001', 'service', 'John Smith Oil Change', 'jsmith.test@email.com', '+1-555-2001',
 2022, 'BMW', 'X3 xDrive30i', '5UX43DP05N9T12345', NULL,
 'pending', 'normal', '[{"name": "Oil Change Service", "price": 120}, {"name": "Multi-Point Inspection", "price": 80}]'::jsonb,
 200.00, 'TEST: Regular maintenance service', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day', NULL),

('SV-2002', 'SERVICE-T2002', 'service', 'Emily Wilson Brakes', 'ewilson.test@email.com', '+1-555-2002',
 2021, 'BMW', '530i', 'WBA5A7C50M7T89012', NULL,
 'in_progress', 'high', '[{"name": "Brake Pad Replacement", "price": 450}, {"name": "Brake Fluid Service", "price": 100}]'::jsonb,
 550.00, 'TEST: Brake system service in progress', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', NULL),

('SV-2003', 'SERVICE-T2003', 'service', 'Michael Davis Annual', 'mdavis.test@email.com', '+1-555-2003',
 2020, 'BMW', 'X5 xDrive40i', '5UX53DP05L9T34567', NULL,
 'completed', 'normal', '[{"name": "Annual Service", "price": 350}, {"name": "Cabin Air Filter", "price": 65}]'::jsonb,
 415.00, 'TEST: Annual maintenance completed', NULL,
 5, NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

('SV-2004', 'SERVICE-T2004', 'service', 'Sarah Johnson Urgent', 'sjohnson.test@email.com', '+1-555-2004',
 2023, 'BMW', '330i', 'WBA5R1C50O7T23456', NULL,
 'pending', 'urgent', '[{"name": "Transmission Service", "price": 280}, {"name": "Differential Service", "price": 150}]'::jsonb,
 430.00, 'TEST: Drivetrain service required urgently', NULL,
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day', NULL),

('SV-2005', 'SERVICE-T2005', 'service', 'David Martinez i3', 'dmartinez.test@email.com', '+1-555-2005',
 2019, 'BMW', 'i3', 'WBY8P2C09K7T45678', NULL,
 'in_progress', 'normal', '[{"name": "Battery Health Check", "price": 200}, {"name": "Software Update", "price": 100}]'::jsonb,
 300.00, 'TEST: Electric vehicle service in progress', NULL,
 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days', NULL),

-- Recon Test Orders (SV-3001 series)
('SV-3001', 'RECON-T3001', 'service', 'Trade-In Assessment', 'recon.test@dealership.com', '+1-555-3001',
 2021, 'BMW', 'X3 xDrive30i', '5UX43DP05M9T12345', 'RECON3001',
 'pending', 'normal', '[{"name": "Full Body Inspection", "price": 200, "category": "recon", "reconCategory": "body_work", "conditionGrade": "B"}, {"name": "Paint Touch-Up", "price": 400, "category": "recon"}]'::jsonb,
 600.00, 'TEST RECON: Trade-in reconditioning assessment', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days', NULL),

('SV-3002', 'RECON-T3002', 'service', 'Auction BMW 330i', 'auction.test@dealership.com', '+1-555-3002',
 2020, 'BMW', '330i', 'WBA5R1C50L7T23456', 'RECON3002',
 'in_progress', 'high', '[{"name": "Engine Diagnostics", "price": 500, "category": "recon", "reconCategory": "mechanical", "conditionGrade": "C"}, {"name": "Transmission Inspection", "price": 300, "category": "recon"}]'::jsonb,
 800.00, 'TEST RECON: Auction vehicle mechanical assessment', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days', NULL),

('SV-3003', 'RECON-T3003', 'service', 'Lease Return Damage', 'lease.test@dealership.com', '+1-555-3003',
 2022, 'BMW', 'X5 xDrive40i', '5UX53DP05N9T34567', 'RECON3003',
 'completed', 'normal', '[{"name": "Wear and Tear Repair", "price": 650, "category": "recon", "reconCategory": "detailing", "conditionGrade": "B"}, {"name": "Detailing Package", "price": 400, "category": "recon"}]'::jsonb,
 1050.00, 'TEST RECON: Lease return reconditioning complete', NULL,
 5, NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

('SV-3004', 'RECON-T3004', 'service', 'CPO BMW 530i Prep', 'cpo.test@dealership.com', '+1-555-3004',
 2021, 'BMW', '530i', 'WBA5A7C50M7T89012', 'RECON3004',
 'pending', 'urgent', '[{"name": "170-Point Inspection", "price": 400, "category": "recon", "reconCategory": "inspection", "conditionGrade": "A"}, {"name": "Warranty Prep", "price": 300, "category": "recon"}]'::jsonb,
 700.00, 'TEST RECON: Certified Pre-Owned preparation', NULL,
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days', NULL),

-- Car Wash Test Orders (SV-4001 series)
('SV-4001', 'CARWASH-T4001', 'service', 'Express Wash Test', 'express.test@customer.com', '+1-555-4001',
 2023, 'BMW', 'X3', '5UX43DP05O9T12345', 'WASH4001',
 'pending', 'normal', '[{"name": "Express Wash", "price": 25, "category": "car_wash", "washType": "express", "queueStatus": "waiting"}]'::jsonb,
 25.00, 'TEST CARWASH: Quick express service', NULL,
 5, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '1 hour', NULL),

('SV-4002', 'CARWASH-T4002', 'service', 'Premium Wash BMW 530i', 'premium.test@customer.com', '+1-555-4002',
 2024, 'BMW', '530i', 'WBA5A7C50P7T89012', 'WASH4002',
 'in_progress', 'high', '[{"name": "Premium Wash", "price": 45, "category": "car_wash", "washType": "premium", "queueStatus": "in_wash"}, {"name": "Interior Detail", "price": 35, "category": "car_wash"}]'::jsonb,
 80.00, 'TEST CARWASH: Premium service package in wash bay', NULL,
 5, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '30 minutes', NULL),

('SV-4003', 'CARWASH-T4003', 'service', 'VIP Detail BMW X5', 'vip.test@customer.com', '+1-555-4003',
 2024, 'BMW', 'X5', '5UX53DP05P9T34567', 'WASH4003',
 'completed', 'urgent', '[{"name": "VIP Full Detail", "price": 120, "category": "car_wash", "washType": "vip", "queueStatus": "completed"}, {"name": "Paint Protection", "price": 80, "category": "car_wash"}]'::jsonb,
 200.00, 'TEST CARWASH: VIP complete detail service finished', NULL,
 5, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),

('SV-4004', 'CARWASH-T4004', 'service', 'Customer Waiting BMW i4', 'waiting.test@customer.com', '+1-555-4004',
 2024, 'BMW', 'i4', 'WBA4J1C08P5T45678', 'WASH4004',
 'pending', 'urgent', '[{"name": "Delivery Wash", "price": 40, "category": "car_wash", "washType": "delivery", "queueStatus": "waiting", "customerWaiting": true}]'::jsonb,
 40.00, 'TEST CARWASH: Customer waiting for delivery - URGENT', NULL,
 5, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes', NOW() + INTERVAL '45 minutes', NULL),

('SV-4005', 'CARWASH-T4005', 'service', 'Walk-In Customer 228i', 'walkin.test@customer.com', '+1-555-4005',
 2021, 'BMW', '228i', 'WBA2F1C00M7T78901', 'WASH4005',
 'pending', 'urgent', '[{"name": "Basic Wash", "price": 20, "category": "car_wash", "washType": "basic", "queueStatus": "waiting", "customerWaiting": true}, {"name": "Wax Application", "price": 30, "category": "car_wash"}]'::jsonb,
 50.00, 'TEST CARWASH: Walk-in customer waiting - URGENT', NULL,
 5, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '35 minutes', NULL);