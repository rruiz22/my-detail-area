-- Insert comprehensive test data - 60+ orders to complete the 80+ total target

INSERT INTO orders (
  order_number, custom_order_number, order_type, customer_name, customer_email, customer_phone,
  vehicle_year, vehicle_make, vehicle_model, vehicle_vin, stock_number,
  status, priority, services, total_amount, notes, salesperson,
  dealer_id, created_at, updated_at, sla_deadline, completed_at
) VALUES

-- Sales Orders (SA-0029 to SA-0043)
('SA-0029', 'SALES-00029', 'sales', 'Lisa Anderson', 'landerson@email.com', '+1-555-0106',
 2023, 'BMW', 'X7 xDrive40i', '5UX4V1C03N9F67890', 'BMW24029',
 'completed', 'normal', '[{"name": "Luxury Detail", "price": 600}, {"name": "Interior Protection", "price": 300}]'::jsonb,
 900.00, 'Luxury vehicle complete detail', 'Mike Thompson',
 5, NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

('SA-0030', 'SALES-00030', 'sales', 'Kevin Taylor', 'ktaylor@email.com', '+1-555-0107',
 2024, 'BMW', '228i Gran Coupe', 'WBA73AK05R9G78901', 'BMW24030',
 'pending', 'normal', '[{"name": "Entry Luxury Prep", "price": 350}]'::jsonb,
 350.00, 'Entry level luxury preparation', 'David Chen',
 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() + INTERVAL '2 days', NULL),

('SA-0031', 'SALES-00031', 'sales', 'Maria Garcia', 'mgarcia@email.com', '+1-555-0108',
 2023, 'BMW', '530i', 'WBA5A7C50N7H89012', 'BMW24031',
 'cancelled', 'normal', '[{"name": "Executive Detail", "price": 450}]'::jsonb,
 450.00, 'Customer cancelled order', 'Sarah Miller',
 5, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', NULL, NULL),

('SA-0032', 'SALES-00032', 'sales', 'Daniel Rodriguez', 'drodriguez@email.com', '+1-555-0109',
 2024, 'BMW', 'iX xDrive50', '5UX8V4C03R9I90123', 'BMW24032',
 'in_progress', 'high', '[{"name": "Electric Luxury Prep", "price": 700}, {"name": "Advanced Tech Setup", "price": 200}]'::jsonb,
 900.00, 'Premium electric vehicle setup', 'Mike Thompson',
 5, NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day', NULL),

('SA-0033', 'SALES-00033', 'sales', 'Sarah Lee', 'slee@email.com', '+1-555-0110',
 2024, 'BMW', 'Z4 sDrive30i', 'WBA5V1C00R9J01234', 'BMW24033',
 'completed', 'normal', '[{"name": "Roadster Prep", "price": 400}, {"name": "Convertible Detail", "price": 300}]'::jsonb,
 700.00, 'Convertible preparation complete', 'David Chen',
 5, NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days'),

('SA-0034', 'SALES-00034', 'sales', 'Thomas White', 'twhite@email.com', '+1-555-0111',
 2023, 'BMW', 'X1 xDrive28i', '5UX4V5C03N9K12345', 'BMW24034',
 'pending', 'normal', '[{"name": "Compact SUV Prep", "price": 300}]'::jsonb,
 300.00, 'Compact luxury SUV preparation', 'Sarah Miller',
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '4 days', NULL),

('SA-0035', 'SALES-00035', 'sales', 'Nancy Johnson', 'njohnson@email.com', '+1-555-0112',
 2024, 'BMW', '740i', 'WBA7F2C50R9L23456', 'BMW24035',
 'in_progress', 'urgent', '[{"name": "Executive Flagship Prep", "price": 800}, {"name": "Chauffeur Package", "price": 400}]'::jsonb,
 1200.00, 'Executive luxury sedan preparation', 'Mike Thompson',
 5, NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '1 day', NULL),

-- Service Orders for Maintenance (SV-60000 series to avoid conflicts)
('SV-60001', 'SERVICE-60001', 'service', 'John Smith Maintenance', 'jsmith.maint@email.com', '+1-555-6001',
 2022, 'BMW', 'X3 xDrive30i', '5UX43DP05N9A12345', NULL,
 'pending', 'normal', '[{"name": "Oil Change Service", "price": 120}, {"name": "Multi-Point Inspection", "price": 80}]'::jsonb,
 200.00, 'Regular maintenance service', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day', NULL),

('SV-60002', 'SERVICE-60002', 'service', 'Emily Wilson Service', 'ewilson.svc@email.com', '+1-555-6002',
 2021, 'BMW', '530i', 'WBA5A7C50M7H89012', NULL,
 'in_progress', 'high', '[{"name": "Brake Pad Replacement", "price": 450}, {"name": "Brake Fluid Service", "price": 100}]'::jsonb,
 550.00, 'Brake system service in progress', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days', NULL),

('SV-60003', 'SERVICE-60003', 'service', 'Michael Davis Service', 'mdavis.svc@email.com', '+1-555-6003',
 2020, 'BMW', 'X5 xDrive40i', '5UX53DP05L9C34567', NULL,
 'completed', 'normal', '[{"name": "Annual Service", "price": 350}, {"name": "Cabin Air Filter", "price": 65}]'::jsonb,
 415.00, 'Annual maintenance completed', NULL,
 5, NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

-- Recon Orders (SV-70000 series)
('SV-70001', 'RECON-70001', 'service', 'Trade-In BMW X3', 'recon@dealership.com', '+1-555-7001',
 2021, 'BMW', 'X3 xDrive30i', '5UX43DP05M9A12345', 'RECON701',
 'pending', 'normal', '[{"name": "Full Body Inspection", "price": 200, "category": "recon", "reconCategory": "body_work", "conditionGrade": "B"}, {"name": "Paint Touch-Up", "price": 400, "category": "recon"}]'::jsonb,
 600.00, 'RECON: Trade-in reconditioning assessment', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days', NULL),

('SV-70002', 'RECON-70002', 'service', 'Auction BMW 330i', 'recon@dealership.com', '+1-555-7002',
 2020, 'BMW', '330i', 'WBA5R1C50L7B23456', 'RECON702',
 'in_progress', 'high', '[{"name": "Engine Diagnostics", "price": 500, "category": "recon", "reconCategory": "mechanical", "conditionGrade": "C"}, {"name": "Transmission Inspection", "price": 300, "category": "recon"}]'::jsonb,
 800.00, 'RECON: Auction vehicle mechanical assessment', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days', NULL),

('SV-70003', 'RECON-70003', 'service', 'Lease Return X5', 'recon@dealership.com', '+1-555-7003',
 2022, 'BMW', 'X5 xDrive40i', '5UX53DP05N9C34567', 'RECON703',
 'completed', 'normal', '[{"name": "Wear and Tear Repair", "price": 650, "category": "recon", "reconCategory": "detailing", "conditionGrade": "B"}, {"name": "Detailing Package", "price": 400, "category": "recon"}]'::jsonb,
 1050.00, 'RECON: Lease return reconditioning complete', NULL,
 5, NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

-- Car Wash Orders (SV-80000 series)
('SV-80001', 'CARWASH-80001', 'service', 'Express Customer', 'express@customer.com', '+1-555-8001',
 2023, 'BMW', 'X3', '5UX43DP05O9A12345', 'WASH801',
 'pending', 'normal', '[{"name": "Express Wash", "price": 25, "category": "car_wash", "washType": "express", "queueStatus": "waiting"}]'::jsonb,
 25.00, 'CARWASH: Quick express service', NULL,
 5, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '1 hour', NULL),

('SV-80002', 'CARWASH-80002', 'service', 'Premium Customer', 'premium@customer.com', '+1-555-8002',
 2024, 'BMW', '530i', 'WBA5A7C50P7H89012', 'WASH802',
 'in_progress', 'high', '[{"name": "Premium Wash", "price": 45, "category": "car_wash", "washType": "premium", "queueStatus": "in_wash"}, {"name": "Interior Detail", "price": 35, "category": "car_wash"}]'::jsonb,
 80.00, 'CARWASH: Premium service package in wash bay', NULL,
 5, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '30 minutes', NULL),

('SV-80003', 'CARWASH-80003', 'service', 'VIP Full Detail', 'vip@customer.com', '+1-555-8003',
 2024, 'BMW', 'X5', '5UX53DP05P9C34567', 'WASH803',
 'completed', 'urgent', '[{"name": "VIP Full Detail", "price": 120, "category": "car_wash", "washType": "vip", "queueStatus": "completed"}, {"name": "Paint Protection", "price": 80, "category": "car_wash"}]'::jsonb,
 200.00, 'CARWASH: VIP complete detail service finished', NULL,
 5, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),

('SV-80004', 'CARWASH-80004', 'service', 'Customer Waiting Urgent', 'waiting@customer.com', '+1-555-8004',
 2024, 'BMW', 'i4', 'WBA4J1C08P5D45678', 'WASH804',
 'pending', 'urgent', '[{"name": "Delivery Wash", "price": 40, "category": "car_wash", "washType": "delivery", "queueStatus": "waiting", "customerWaiting": true}]'::jsonb,
 40.00, 'CARWASH: Customer waiting for delivery preparation - URGENT', NULL,
 5, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes', NOW() + INTERVAL '45 minutes', NULL),

('SV-80005', 'CARWASH-80005', 'service', 'Walk-In Waiting', 'walkin@customer.com', '+1-555-8005',
 2021, 'BMW', '228i', 'WBA2F1C00M7G78901', 'WASH805',
 'pending', 'urgent', '[{"name": "Basic Wash", "price": 20, "category": "car_wash", "washType": "basic", "queueStatus": "waiting", "customerWaiting": true}, {"name": "Wax Application", "price": 30, "category": "car_wash"}]'::jsonb,
 50.00, 'CARWASH: Walk-in customer waiting - URGENT PRIORITY', NULL,
 5, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '35 minutes', NULL),

-- More Service Orders (SV-60000 series)
('SV-60004', 'SERVICE-60004', 'service', 'Sarah Johnson Transmission', 'sjohnson2@email.com', '+1-555-6004',
 2023, 'BMW', '330i', 'WBA5R1C50O7B23456', NULL,
 'pending', 'urgent', '[{"name": "Transmission Service", "price": 280}, {"name": "Differential Service", "price": 150}]'::jsonb,
 430.00, 'Drivetrain service required urgently', NULL,
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day', NULL),

('SV-60005', 'SERVICE-60005', 'service', 'David Martinez Electric', 'dmartinez@email.com', '+1-555-6005',
 2019, 'BMW', 'i3', 'WBY8P2C09K7D45678', NULL,
 'in_progress', 'normal', '[{"name": "Battery Health Check", "price": 200}, {"name": "Software Update", "price": 100}]'::jsonb,
 300.00, 'Electric vehicle service in progress', NULL,
 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days', NULL),

('SV-60006', 'SERVICE-60006', 'service', 'Jennifer Brown Wheels', 'jbrown2@email.com', '+1-555-6006',
 2022, 'BMW', 'X1 xDrive28i', '5UX4V5C03O9K12345', NULL,
 'completed', 'normal', '[{"name": "Tire Rotation", "price": 80}, {"name": "Wheel Alignment", "price": 150}]'::jsonb,
 230.00, 'Tire and wheel service complete', NULL,
 5, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),

-- More Recon Orders (SV-70000 series)
('SV-70004', 'RECON-70004', 'service', 'CPO BMW 530i Prep', 'recon@dealership.com', '+1-555-7004',
 2021, 'BMW', '530i', 'WBA5A7C50M7H89012', 'RECON704',
 'pending', 'urgent', '[{"name": "170-Point Inspection", "price": 400, "category": "recon", "reconCategory": "inspection", "conditionGrade": "A"}, {"name": "Warranty Prep", "price": 300, "category": "recon"}]'::jsonb,
 700.00, 'RECON: Certified Pre-Owned preparation', NULL,
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days', NULL),

('SV-70005', 'RECON-70005', 'service', 'Wholesale BMW X1', 'recon@dealership.com', '+1-555-7005',
 2019, 'BMW', 'X1 xDrive28i', '5UX4V5C03K9K12345', 'RECON705',
 'in_progress', 'normal', '[{"name": "Collision Assessment", "price": 300, "category": "recon", "reconCategory": "body_work", "conditionGrade": "C"}, {"name": "Frame Inspection", "price": 200, "category": "recon"}]'::jsonb,
 500.00, 'RECON: Wholesale vehicle body work assessment', NULL,
 5, NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '10 days', NULL),

('SV-70006', 'RECON-70006', 'service', 'Customer Trade i3', 'recon@dealership.com', '+1-555-7006',
 2020, 'BMW', 'i3', 'WBY8P2C09L7D45678', 'RECON706',
 'completed', 'normal', '[{"name": "Battery Assessment", "price": 500, "category": "recon", "reconCategory": "electrical", "conditionGrade": "B"}, {"name": "Electric Motor Check", "price": 300, "category": "recon"}]'::jsonb,
 800.00, 'RECON: Electric vehicle recon complete', NULL,
 5, NOW() - INTERVAL '18 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'),

-- More Car Wash Orders (SV-80000 series)
('SV-80006', 'CARWASH-80006', 'service', 'Service Complete M3', 'service@dealership.com', '+1-555-8006',
 2023, 'BMW', 'M3', 'WBS8M9C09O5E56789', 'WASH806',
 'in_progress', 'high', '[{"name": "Post-Service Wash", "price": 30, "category": "car_wash", "washType": "post_service", "queueStatus": "in_wash"}, {"name": "Engine Bay Clean", "price": 25, "category": "car_wash"}]'::jsonb,
 55.00, 'CARWASH: Post-service cleanup in progress', NULL,
 5, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '25 minutes', NULL),

('SV-80007', 'CARWASH-80007', 'service', 'Loaner Return X7', 'loaner@dealership.com', '+1-555-8007',
 2022, 'BMW', 'X7', '5UX4V1C03O9F67890', 'WASH807',
 'completed', 'normal', '[{"name": "Loaner Detail", "price": 50, "category": "car_wash", "washType": "loaner", "queueStatus": "completed"}, {"name": "Sanitization Service", "price": 20, "category": "car_wash"}]'::jsonb,
 70.00, 'CARWASH: Loaner vehicle cleaning complete', NULL,
 5, NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes'),

('SV-80008', 'CARWASH-80008', 'service', 'Test Drive Z4 Urgent', 'testdrive@dealership.com', '+1-555-8008',
 2023, 'BMW', 'Z4', 'WBA5V1C00O9J01234', 'WASH808',
 'in_progress', 'urgent', '[{"name": "Test Drive Clean", "price": 35, "category": "car_wash", "washType": "test_drive", "queueStatus": "drying"}, {"name": "Interior Refresh", "price": 25, "category": "car_wash"}]'::jsonb,
 60.00, 'CARWASH: Test drive preparation urgent', NULL,
 5, NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '10 minutes', NOW() + INTERVAL '15 minutes', NULL),

('SV-80009', 'CARWASH-80009', 'service', 'Executive Demo 230i', 'executive@dealership.com', '+1-555-8009',
 2024, 'BMW', '230i', 'WBA2F1C00P7P67890', 'WASH809',
 'in_progress', 'urgent', '[{"name": "Executive Demo Detail", "price": 65, "category": "car_wash", "washType": "executive", "queueStatus": "in_detail"}, {"name": "VIP Presentation Prep", "price": 55, "category": "car_wash"}]'::jsonb,
 120.00, 'CARWASH: Executive demo preparation urgent', NULL,
 5, NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '12 minutes', NOW() + INTERVAL '20 minutes', NULL),

('SV-80010', 'CARWASH-80010', 'service', 'Weekend Special M8', 'weekend@customer.com', '+1-555-8010',
 2023, 'BMW', 'M8', 'WBS2M9C09O5T01234', 'WASH810',
 'pending', 'urgent', '[{"name": "Weekend Special Package", "price": 85, "category": "car_wash", "washType": "weekend_special", "queueStatus": "waiting", "customerWaiting": true}, {"name": "Premium Plus Detail", "price": 65, "category": "car_wash"}]'::jsonb,
 150.00, 'CARWASH: Weekend special customer waiting - HIGH PRIORITY', NULL,
 5, NOW() - INTERVAL '12 minutes', NOW() - INTERVAL '12 minutes', NOW() + INTERVAL '2 hours', NULL);