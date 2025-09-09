-- Complete the remaining test orders (Sales 11-20, Service 6-20, Recon 2-20, CarWash 3-20)

INSERT INTO orders (
  order_number, custom_order_number, order_type, customer_name, customer_email, customer_phone,
  vehicle_year, vehicle_make, vehicle_model, vehicle_vin, stock_number,
  status, priority, services, total_amount, notes, salesperson,
  dealer_id, created_at, updated_at, sla_deadline
) VALUES

-- Remaining Service Orders (6-20)
('SV-0006', 'SERVICE-00006', 'service', 'Jennifer Brown', 'jbrown2@email.com', '+1-555-0206',
 2022, 'BMW', 'X1 xDrive28i', '5UX4V5C03O9K12345', NULL,
 'completed', 'normal', '[{"name": "Tire Rotation", "price": 80}, {"name": "Wheel Alignment", "price": 150}]'::jsonb,
 230.00, 'Tire and wheel service complete', NULL,
 5, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),

('SV-0007', 'SERVICE-00007', 'service', 'Robert Garcia', 'rgarcia@email.com', '+1-555-0207',
 2021, 'BMW', '740i', 'WBA7F2C50M9L23456', NULL,
 'pending', 'high', '[{"name": "Air Suspension Service", "price": 650}, {"name": "Diagnostic Scan", "price": 120}]'::jsonb,
 770.00, 'Suspension system diagnosis needed', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days'),

('SV-0008', 'SERVICE-00008', 'service', 'Lisa Anderson', 'landerson2@email.com', '+1-555-0208',
 2020, 'BMW', 'M3', 'WBS8M9C09L5E56789', NULL,
 'cancelled', 'normal', '[{"name": "Performance Tune", "price": 400}]'::jsonb,
 400.00, 'Customer cancelled appointment', NULL,
 5, NOW() - INTERVAL '8 days', NOW() - INTERVAL '6 days', NULL),

('SV-0009', 'SERVICE-00009', 'service', 'Christopher Lee', 'clee@email.com', '+1-555-0209',
 2023, 'BMW', 'iX xDrive50', '5UX8V4C03O9I90123', NULL,
 'in_progress', 'normal', '[{"name": "Charging System Check", "price": 180}, {"name": "Climate Control Service", "price": 220}]'::jsonb,
 400.00, 'Electric vehicle climate system service', NULL,
 5, NOW() - INTERVAL '6 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '1 day'),

('SV-0010', 'SERVICE-00010', 'service', 'Amanda Taylor', 'ataylor@email.com', '+1-555-0210',
 2022, 'BMW', 'Z4 sDrive30i', 'WBA5V1C00O9J01234', NULL,
 'completed', 'normal', '[{"name": "Convertible Top Service", "price": 300}, {"name": "Roadster Detail", "price": 180}]'::jsonb,
 480.00, 'Convertible maintenance completed', NULL,
 5, NOW() - INTERVAL '12 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '6 days'),

('SV-0011', 'SERVICE-00011', 'service', 'Kevin White', 'kwhite@email.com', '+1-555-0211',
 2021, 'BMW', 'X6 M50i', '5UX5V4C03M9O56789', NULL,
 'pending', 'normal', '[{"name": "Performance Engine Service", "price": 500}, {"name": "Turbo Inspection", "price": 200}]'::jsonb,
 700.00, 'Performance engine maintenance', NULL,
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days'),

('SV-0012', 'SERVICE-00012', 'service', 'Maria Rodriguez', 'mrodriguez2@email.com', '+1-555-0212',
 2020, 'BMW', '228i', 'WBA2F1C00L7G78901', NULL,
 'in_progress', 'high', '[{"name": "Cooling System Repair", "price": 350}, {"name": "Thermostat Replacement", "price": 180}]'::jsonb,
 530.00, 'Cooling system repair in progress', NULL,
 5, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day'),

('SV-0013', 'SERVICE-00013', 'service', 'Daniel Wilson', 'dwilson@email.com', '+1-555-0213',
 2023, 'BMW', '420i', 'WBA4G7C50O7N45678', NULL,
 'completed', 'normal', '[{"name": "Spark Plug Replacement", "price": 220}, {"name": "Ignition Coil Service", "price": 150}]'::jsonb,
 370.00, 'Ignition system service complete', NULL,
 5, NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),

('SV-0014', 'SERVICE-00014', 'service', 'Nancy Martinez', 'nmartinez@email.com', '+1-555-0214',
 2022, 'BMW', 'i7 xDrive60', 'WBA7Y4C00O9Q78901', NULL,
 'pending', 'urgent', '[{"name": "High Voltage System Check", "price": 400}, {"name": "Battery Conditioning", "price": 250}]'::jsonb,
 650.00, 'Electric flagship system check needed', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day'),

('SV-0015', 'SERVICE-00015', 'service', 'Steven Brown', 'sbrown@email.com', '+1-555-0215',
 2021, 'BMW', 'X7 xDrive40i', '5UX4V1C03M9F67890', NULL,
 'in_progress', 'normal', '[{"name": "Air Filter Replacement", "price": 85}, {"name": "Engine Oil Analysis", "price": 45}]'::jsonb,
 130.00, 'Routine maintenance in progress', NULL,
 5, NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '2 days'),

('SV-0016', 'SERVICE-00016', 'service', 'Karen Johnson', 'kjohnson@email.com', '+1-555-0216',
 2020, 'BMW', '318i', 'WBA5R7C50L7R89012', NULL,
 'cancelled', 'normal', '[{"name": "Fuel System Service", "price": 180}]'::jsonb,
 180.00, 'Appointment rescheduled', NULL,
 5, NOW() - INTERVAL '18 days', NOW() - INTERVAL '16 days', NULL),

('SV-0017', 'SERVICE-00017', 'service', 'Charles Davis', 'cdavis@email.com', '+1-555-0217',
 2023, 'BMW', 'M4 Competition', 'WBS3M9C09O5M34567', NULL,
 'pending', 'high', '[{"name": "Track Day Prep", "price": 600}, {"name": "Performance Inspection", "price": 200}]'::jsonb,
 800.00, 'Track preparation service', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '1 day'),

('SV-0018', 'SERVICE-00018', 'service', 'Patricia Garcia', 'pgarcia@email.com', '+1-555-0218',
 2022, 'BMW', 'X2 xDrive28i', '5UX2V1C03O9S90123', NULL,
 'completed', 'normal', '[{"name": "Windshield Wiper Service", "price": 60}, {"name": "Headlight Restoration", "price": 120}]'::jsonb,
 180.00, 'Visibility maintenance complete', NULL,
 5, NOW() - INTERVAL '22 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '17 days'),

('SV-0019', 'SERVICE-00019', 'service', 'William Lee', 'wlee@email.com', '+1-555-0219',
 2021, 'BMW', '230i', 'WBA2F1C00M7P67890', NULL,
 'in_progress', 'normal', '[{"name": "Exhaust System Inspection", "price": 150}, {"name": "Emission Test", "price": 75}]'::jsonb,
 225.00, 'Emission system service', NULL,
 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days'),

('SV-0020', 'SERVICE-00020', 'service', 'Linda Anderson', 'landerson3@email.com', '+1-555-0220',
 2023, 'BMW', 'M8 Competition', 'WBS2M9C09O5T01234', NULL,
 'pending', 'urgent', '[{"name": "Carbon Fiber Inspection", "price": 300}, {"name": "Aerodynamics Check", "price": 250}]'::jsonb,
 550.00, 'Ultimate performance inspection needed', NULL,
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day'),

-- Recon Orders (2-20)
('RC-0002', 'RECON-00002', 'service', 'Auction Purchase', 'recon@dealership.com', '+1-555-0302',
 2020, 'BMW', '330i', 'WBA5R1C50L7B23456', 'RECON002',
 'in_progress', 'high', '[{"name": "Engine Diagnostics", "price": 500, "category": "recon"}, {"name": "Transmission Inspection", "price": 300, "category": "recon"}]'::jsonb,
 800.00, 'RECON: Auction vehicle mechanical assessment', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days'),

('RC-0003', 'RECON-00003', 'service', 'Lease Return', 'recon@dealership.com', '+1-555-0303',
 2022, 'BMW', 'X5 xDrive40i', '5UX53DP05N9C34567', 'RECON003',
 'completed', 'normal', '[{"name": "Wear and Tear Repair", "price": 650, "category": "recon"}, {"name": "Detailing Package", "price": 400, "category": "recon"}]'::jsonb,
 1050.00, 'RECON: Lease return reconditioning complete', NULL,
 5, NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),

('RC-0004', 'RECON-00004', 'service', 'CPO Preparation', 'recon@dealership.com', '+1-555-0304',
 2021, 'BMW', '530i', 'WBA5A7C50M7H89012', 'RECON004',
 'pending', 'urgent', '[{"name": "170-Point Inspection", "price": 400, "category": "recon"}, {"name": "Warranty Prep", "price": 300, "category": "recon"}]'::jsonb,
 700.00, 'RECON: Certified Pre-Owned preparation', NULL,
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days'),

('RC-0005', 'RECON-00005', 'service', 'Wholesale Purchase', 'recon@dealership.com', '+1-555-0305',
 2019, 'BMW', 'X1 xDrive28i', '5UX4V5C03K9K12345', 'RECON005',
 'in_progress', 'normal', '[{"name": "Collision Assessment", "price": 300, "category": "recon"}, {"name": "Frame Inspection", "price": 200, "category": "recon"}]'::jsonb,
 500.00, 'RECON: Wholesale vehicle body work assessment', NULL,
 5, NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '10 days'),

-- Car Wash Orders (3-20)
('CW-0003', 'WASH-00003', 'service', 'VIP Customer', 'vip@customer.com', '+1-555-0403',
 2024, 'BMW', 'X5', '5UX53DP05P9C34567', 'WASH003',
 'completed', 'urgent', '[{"name": "VIP Full Detail", "price": 120, "category": "car_wash"}, {"name": "Paint Protection", "price": 80, "category": "car_wash"}]'::jsonb,
 200.00, 'CARWASH: VIP complete detail service finished', NULL,
 5, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '15 minutes'),

('CW-0004', 'WASH-00004', 'service', 'Service Complete', 'service@dealership.com', '+1-555-0405',
 2023, 'BMW', 'M3', 'WBS8M9C09O5E56789', 'WASH005',
 'in_progress', 'high', '[{"name": "Post-Service Wash", "price": 30, "category": "car_wash"}, {"name": "Engine Bay Clean", "price": 25, "category": "car_wash"}]'::jsonb,
 55.00, 'CARWASH: Post-service cleanup in progress', NULL,
 5, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '25 minutes'),

('CW-0005', 'WASH-00005', 'service', 'Loaner Return', 'loaner@dealership.com', '+1-555-0406',
 2022, 'BMW', 'X7', '5UX4V1C03O9F67890', 'WASH006',
 'completed', 'normal', '[{"name": "Loaner Detail", "price": 50, "category": "car_wash"}, {"name": "Sanitization Service", "price": 20, "category": "car_wash"}]'::jsonb,
 70.00, 'CARWASH: Loaner vehicle cleaning complete', NULL,
 5, NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes'),

('CW-0006', 'WASH-00006', 'service', 'Walk-In Customer - Urgent', 'walkin@customer.com', '+1-555-0407',
 2021, 'BMW', '228i', 'WBA2F1C00M7G78901', 'WASH007',
 'pending', 'urgent', '[{"name": "Basic Wash", "price": 20, "category": "car_wash"}, {"name": "Wax Application", "price": 30, "category": "car_wash"}]'::jsonb,
 50.00, 'CARWASH: Walk-in customer waiting - urgent priority', NULL,
 5, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '35 minutes'),

('CW-0007', 'WASH-00007', 'service', 'Test Drive Prep', 'testdrive@dealership.com', '+1-555-0409',
 2023, 'BMW', 'Z4', 'WBA5V1C00O9J01234', 'WASH009',
 'in_progress', 'urgent', '[{"name": "Test Drive Clean", "price": 35, "category": "car_wash"}, {"name": "Interior Refresh", "price": 25, "category": "car_wash"}]'::jsonb,
 60.00, 'CARWASH: Test drive preparation urgent', NULL,
 5, NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '10 minutes', NOW() + INTERVAL '15 minutes'),

('CW-0008', 'WASH-00008', 'service', 'Customer Pick-up - Waiting', 'pickup@customer.com', '+1-555-0417',
 2021, 'BMW', 'X2', '5UX2V1C03M9S90123', 'WASH017',
 'pending', 'urgent', '[{"name": "Pick-up Prep Wash", "price": 30, "category": "car_wash"}, {"name": "Final Touch Detail", "price": 20, "category": "car_wash"}]'::jsonb,
 50.00, 'CARWASH: Customer arriving for pickup - waiting', NULL,
 5, NOW() - INTERVAL '8 minutes', NOW() - INTERVAL '8 minutes', NOW() + INTERVAL '40 minutes'),

('CW-0009', 'WASH-00009', 'service', 'Executive Demo', 'executive@dealership.com', '+1-555-0419',
 2024, 'BMW', '230i', 'WBA2F1C00P7P67890', 'WASH019',
 'in_progress', 'urgent', '[{"name": "Executive Demo Detail", "price": 65, "category": "car_wash"}, {"name": "VIP Presentation Prep", "price": 55, "category": "car_wash"}]'::jsonb,
 120.00, 'CARWASH: Executive demo preparation urgent', NULL,
 5, NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '12 minutes', NOW() + INTERVAL '20 minutes'),

('CW-0010', 'WASH-00010', 'service', 'Weekend Special - Waiting', 'weekend@customer.com', '+1-555-0420',
 2023, 'BMW', 'M8', 'WBS2M9C09O5T01234', 'WASH020',
 'pending', 'urgent', '[{"name": "Weekend Special Package", "price": 85, "category": "car_wash"}, {"name": "Premium Plus Detail", "price": 65, "category": "car_wash"}]'::jsonb,
 150.00, 'CARWASH: Weekend special customer waiting', NULL,
 5, NOW() - INTERVAL '12 minutes', NOW() - INTERVAL '12 minutes', NOW() + INTERVAL '2 hours');