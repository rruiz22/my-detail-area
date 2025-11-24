-- Add final strategic test orders to complete comprehensive dataset

INSERT INTO orders (
  order_number, custom_order_number, order_type, customer_name, customer_email, customer_phone,
  vehicle_year, vehicle_make, vehicle_model, vehicle_vin, stock_number,
  status, priority, services, total_amount, notes, salesperson,
  dealer_id, created_at, updated_at, sla_deadline, completed_at
) VALUES

-- Final Sales Orders (SA-1006+)
('SA-1006', 'SALES-FINAL01', 'sales', 'Final Test X7', 'final.sales@test.com', '+1-555-9001',
 2024, 'BMW', 'X7 xDrive40i', '5UX4V1C03R9F99001', 'FINAL001',
 'pending', 'urgent', '[{"name": "Flagship SUV Prep", "price": 900}, {"name": "Executive Package", "price": 600}]'::jsonb,
 1500.00, 'FINAL TEST: Large luxury SUV preparation', 'Final Tester',
 5, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '6 hours', NULL),

-- Final Service Orders (SV-80011+)  
('SV-80011', 'SERVICE-FINAL01', 'service', 'Final Service Test', 'final.service@test.com', '+1-555-9011',
 2023, 'BMW', 'M4 Competition', 'WBS3M9C09O5F99001', NULL,
 'in_progress', 'high', '[{"name": "Track Day Service", "price": 800}, {"name": "Performance Inspection", "price": 200}]'::jsonb,
 1000.00, 'FINAL TEST: Track day preparation service', NULL,
 5, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '4 hours', NULL),

-- Final Recon Orders
('SV-80012', 'RECON-FINAL01', 'service', 'Final Recon Test', 'final.recon@test.com', '+1-555-9021',
 2020, 'BMW', 'M8 Competition', 'WBS2M9C09L5F99001', 'RECONFINL01',
 'pending', 'urgent', '[{"name": "Collision Damage Repair", "price": 3000, "category": "recon", "reconCategory": "body_work", "conditionGrade": "D"}, {"name": "Performance System Check", "price": 800, "category": "recon"}]'::jsonb,
 3800.00, 'FINAL TEST RECON: High-end collision repair', NULL,
 5, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours', NOW() + INTERVAL '14 days', NULL),

-- Final Car Wash Orders  
('SV-80013', 'CARWASH-FINAL01', 'service', 'Final CarWash Test - URGENT WAITER', 'final.wash@test.com', '+1-555-9031',
 2024, 'BMW', 'iX xDrive50', '5UX8V4C03P9F99001', 'WASHFINL01',
 'pending', 'urgent', '[{"name": "Executive Wash", "price": 75, "category": "car_wash", "washType": "executive", "queueStatus": "waiting", "customerWaiting": true}, {"name": "Concierge Detail", "price": 125, "category": "car_wash"}]'::jsonb,
 200.00, 'FINAL TEST CARWASH: VIP customer waiting - HIGHEST PRIORITY', NULL,
 5, NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '2 minutes', NOW() + INTERVAL '30 minutes', NULL);