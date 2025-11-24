-- Insert 80 test orders across all modules (Sales, Service, Recon, Car Wash)

-- Sales Orders (20 orders)
INSERT INTO orders (
  order_number, custom_order_number, order_type, customer_name, customer_email, customer_phone,
  vehicle_year, vehicle_make, vehicle_model, vehicle_vin, stock_number,
  status, priority, services, total_amount, notes, salesperson,
  dealer_id, created_at, updated_at, sla_deadline
) VALUES
-- Sales Order 1
('SA-0001', 'SALES-00001', 'sales', 'Michael Johnson', 'mjohnson@email.com', '+1-555-0101',
 2024, 'BMW', 'X3 xDrive30i', '5UX43DP05R9A12345', 'BMW24001',
 'pending', 'high', '[{"name": "Pre-Delivery Inspection", "price": 250}, {"name": "Premium Detail", "price": 450}]'::jsonb, 
 700.00, 'New vehicle delivery prep', 'Sarah Miller',
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day'),

-- Sales Order 2
('SA-0002', 'SALES-00002', 'sales', 'Jennifer Davis', 'jdavis@email.com', '+1-555-0102',
 2023, 'BMW', '330i', 'WBA5R1C50N7B23456', 'BMW24002',
 'in_progress', 'normal', '[{"name": "Final Inspection", "price": 150}, {"name": "Delivery Prep", "price": 200}]'::jsonb,
 350.00, 'Certified pre-owned preparation', 'Mike Thompson',
 5, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days'),

-- Sales Order 3
('SA-0003', 'SALES-00003', 'sales', 'Robert Wilson', 'rwilson@email.com', '+1-555-0103',
 2024, 'BMW', 'X5 xDrive40i', '5UX53DP05R9C34567', 'BMW24003',
 'completed', 'normal', '[{"name": "New Car Prep", "price": 300}, {"name": "Paint Protection", "price": 800}]'::jsonb,
 1100.00, 'Complete new vehicle preparation', 'Sarah Miller',
 5, NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),

-- Sales Order 4
('SA-0004', 'SALES-00004', 'sales', 'Amanda Brown', 'abrown@email.com', '+1-555-0104',
 2023, 'BMW', 'i4 eDrive40', 'WBA4J1C08N5D45678', 'BMW24004',
 'pending', 'high', '[{"name": "Electric Vehicle Prep", "price": 400}, {"name": "Tech Setup", "price": 150}]'::jsonb,
 550.00, 'Electric vehicle delivery preparation', 'David Chen',
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '3 days'),

-- Sales Order 5
('SA-0005', 'SALES-00005', 'sales', 'Christopher Martinez', 'cmartinez@email.com', '+1-555-0105',
 2024, 'BMW', 'M3 Competition', 'WBS8M9C09R5E56789', 'BMW24005',
 'in_progress', 'urgent', '[{"name": "Performance Package Prep", "price": 500}, {"name": "M Detail Package", "price": 750}]'::jsonb,
 1250.00, 'High-performance vehicle preparation', 'Sarah Miller',
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '6 hours', NOW() + INTERVAL '1 day'),

-- Sales Order 6
('SA-0006', 'SALES-00006', 'sales', 'Lisa Anderson', 'landerson@email.com', '+1-555-0106',
 2023, 'BMW', 'X7 xDrive40i', '5UX4V1C03N9F67890', 'BMW24006',
 'completed', 'normal', '[{"name": "Luxury Detail", "price": 600}, {"name": "Interior Protection", "price": 300}]'::jsonb,
 900.00, 'Luxury vehicle complete detail', 'Mike Thompson',
 5, NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '7 days'),

-- Sales Order 7
('SA-0007', 'SALES-00007', 'sales', 'Kevin Taylor', 'ktaylor@email.com', '+1-555-0107',
 2024, 'BMW', '228i Gran Coupe', 'WBA73AK05R9G78901', 'BMW24007',
 'pending', 'normal', '[{"name": "Entry Luxury Prep", "price": 350}]'::jsonb,
 350.00, 'Entry level luxury preparation', 'David Chen',
 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() + INTERVAL '2 days'),

-- Sales Order 8
('SA-0008', 'SALES-00008', 'sales', 'Maria Garcia', 'mgarcia@email.com', '+1-555-0108',
 2023, 'BMW', '530i', 'WBA5A7C50N7H89012', 'BMW24008',
 'cancelled', 'normal', '[{"name": "Executive Detail", "price": 450}]'::jsonb,
 450.00, 'Customer cancelled order', 'Sarah Miller',
 5, NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days', NULL),

-- Sales Order 9
('SA-0009', 'SALES-00009', 'sales', 'Daniel Rodriguez', 'drodriguez@email.com', '+1-555-0109',
 2024, 'BMW', 'iX xDrive50', '5UX8V4C03R9I90123', 'BMW24009',
 'in_progress', 'high', '[{"name": "Electric Luxury Prep", "price": 700}, {"name": "Advanced Tech Setup", "price": 200}]'::jsonb,
 900.00, 'Premium electric vehicle setup', 'Mike Thompson',
 5, NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day'),

-- Sales Order 10
('SA-0010', 'SALES-00010', 'sales', 'Sarah Lee', 'slee@email.com', '+1-555-0110',
 2024, 'BMW', 'Z4 sDrive30i', 'WBA5V1C00R9J01234', 'BMW24010',
 'completed', 'normal', '[{"name": "Roadster Prep", "price": 400}, {"name": "Convertible Detail", "price": 300}]'::jsonb,
 700.00, 'Convertible preparation complete', 'David Chen',
 5, NOW() - INTERVAL '20 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),

-- Sales Orders 11-20 (more variety)
('SA-0011', 'SALES-00011', 'sales', 'Thomas White', 'twhite@email.com', '+1-555-0111',
 2023, 'BMW', 'X1 xDrive28i', '5UX4V5C03N9K12345', 'BMW24011',
 'pending', 'normal', '[{"name": "Compact SUV Prep", "price": 300}]'::jsonb,
 300.00, 'Compact luxury SUV preparation', 'Sarah Miller',
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '4 days'),

('SA-0012', 'SALES-00012', 'sales', 'Nancy Johnson', 'njohnson@email.com', '+1-555-0112',
 2024, 'BMW', '740i', 'WBA7F2C50R9L23456', 'BMW24012',
 'in_progress', 'urgent', '[{"name": "Executive Flagship Prep", "price": 800}, {"name": "Chauffeur Package", "price": 400}]'::jsonb,
 1200.00, 'Executive luxury sedan preparation', 'Mike Thompson',
 5, NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '1 day'),

('SA-0013', 'SALES-00013', 'sales', 'Jason Brown', 'jbrown@email.com', '+1-555-0113',
 2024, 'BMW', 'M4 Competition', 'WBS3M9C09R5M34567', 'BMW24013',
 'completed', 'high', '[{"name": "M Performance Prep", "price": 600}, {"name": "Track Package Setup", "price": 350}]'::jsonb,
 950.00, 'High performance coupe complete', 'David Chen',
 5, NOW() - INTERVAL '18 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days'),

('SA-0014', 'SALES-00014', 'sales', 'Michelle Davis', 'mdavis@email.com', '+1-555-0114',
 2023, 'BMW', '420i Gran Coupe', 'WBA4G7C50N7N45678', 'BMW24014',
 'pending', 'normal', '[{"name": "Gran Coupe Prep", "price": 375}]'::jsonb,
 375.00, '4-door coupe preparation', 'Sarah Miller',
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days'),

('SA-0015', 'SALES-00015', 'sales', 'Steven Wilson', 'swilson@email.com', '+1-555-0115',
 2024, 'BMW', 'X6 M50i', '5UX5V4C03R9O56789', 'BMW24015',
 'in_progress', 'high', '[{"name": "M Performance SUV Prep", "price": 750}, {"name": "Sport Activity Coupe Detail", "price": 450}]'::jsonb,
 1200.00, 'Performance SUV coupe preparation', 'Mike Thompson',
 5, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days'),

('SA-0016', 'SALES-00016', 'sales', 'Karen Martinez', 'kmartinez@email.com', '+1-555-0116',
 2023, 'BMW', '230i Convertible', 'WBA2F1C00N7P67890', 'BMW24016',
 'cancelled', 'normal', '[{"name": "Convertible Prep", "price": 425}]'::jsonb,
 425.00, 'Order cancelled by customer', 'David Chen',
 5, NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days', NULL),

('SA-0017', 'SALES-00017', 'sales', 'Charles Anderson', 'canderson@email.com', '+1-555-0117',
 2024, 'BMW', 'i7 xDrive60', 'WBA7Y4C00R9Q78901', 'BMW24017',
 'pending', 'urgent', '[{"name": "Electric Flagship Prep", "price": 1000}, {"name": "Executive Package", "price": 500}]'::jsonb,
 1500.00, 'Electric luxury flagship preparation', 'Sarah Miller',
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '2 days'),

('SA-0018', 'SALES-00018', 'sales', 'Patricia Taylor', 'ptaylor@email.com', '+1-555-0118',
 2023, 'BMW', '318i', 'WBA5R7C50N7R89012', 'BMW24018',
 'completed', 'normal', '[{"name": "Entry Sedan Prep", "price": 275}]'::jsonb,
 275.00, 'Entry level sedan complete', 'Mike Thompson',
 5, NOW() - INTERVAL '28 days', NOW() - INTERVAL '23 days', NOW() - INTERVAL '22 days'),

('SA-0019', 'SALES-00019', 'sales', 'William Garcia', 'wgarcia@email.com', '+1-555-0119',
 2024, 'BMW', 'X2 xDrive28i', '5UX2V1C03R9S90123', 'BMW24019',
 'in_progress', 'normal', '[{"name": "Compact Crossover Prep", "price": 325}, {"name": "Urban Package", "price": 175}]'::jsonb,
 500.00, 'Compact crossover urban setup', 'David Chen',
 5, NOW() - INTERVAL '9 days', NOW() - INTERVAL '4 days', NOW() + INTERVAL '1 day'),

('SA-0020', 'SALES-00020', 'sales', 'Linda Rodriguez', 'lrodriguez@email.com', '+1-555-0120',
 2024, 'BMW', 'M8 Competition', 'WBS2M9C09R5T01234', 'BMW24020',
 'pending', 'urgent', '[{"name": "Ultimate M Prep", "price": 900}, {"name": "Competition Package", "price": 600}]'::jsonb,
 1500.00, 'Ultimate performance coupe preparation', 'Sarah Miller',
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days'),

-- Service Orders (20 orders)
('SV-0001', 'SERVICE-00001', 'service', 'John Smith', 'jsmith@email.com', '+1-555-0201',
 2022, 'BMW', 'X3 xDrive30i', '5UX43DP05N9A12345', NULL,
 'pending', 'normal', '[{"name": "Oil Change Service", "price": 120}, {"name": "Multi-Point Inspection", "price": 80}]'::jsonb,
 200.00, 'Regular maintenance service', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day'),

('SV-0002', 'SERVICE-00002', 'service', 'Emily Wilson', 'ewilson@email.com', '+1-555-0202',
 2021, 'BMW', '530i', 'WBA5A7C50M7H89012', NULL,
 'in_progress', 'high', '[{"name": "Brake Pad Replacement", "price": 450}, {"name": "Brake Fluid Service", "price": 100}]'::jsonb,
 550.00, 'Brake system service in progress', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days'),

('SV-0003', 'SERVICE-00003', 'service', 'Michael Davis', 'mdavis2@email.com', '+1-555-0203',
 2020, 'BMW', 'X5 xDrive40i', '5UX53DP05L9C34567', NULL,
 'completed', 'normal', '[{"name": "Annual Service", "price": 350}, {"name": "Cabin Air Filter", "price": 65}]'::jsonb,
 415.00, 'Annual maintenance completed', NULL,
 5, NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),

('SV-0004', 'SERVICE-00004', 'service', 'Sarah Johnson', 'sjohnson2@email.com', '+1-555-0204',
 2023, 'BMW', '330i', 'WBA5R1C50O7B23456', NULL,
 'pending', 'urgent', '[{"name": "Transmission Service", "price": 280}, {"name": "Differential Service", "price": 150}]'::jsonb,
 430.00, 'Drivetrain service required urgently', NULL,
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day'),

('SV-0005', 'SERVICE-00005', 'service', 'David Martinez', 'dmartinez@email.com', '+1-555-0205',
 2019, 'BMW', 'i3', 'WBY8P2C09K7D45678', NULL,
 'in_progress', 'normal', '[{"name": "Battery Health Check", "price": 200}, {"name": "Software Update", "price": 100}]'::jsonb,
 300.00, 'Electric vehicle service in progress', NULL,
 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days'),

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

-- Recon Orders (20 orders)
('RC-0001', 'RECON-00001', 'recon', 'Trade-In Vehicle', 'recon@dealership.com', '+1-555-0301',
 2021, 'BMW', 'X3 xDrive30i', '5UX43DP05M9A12345', 'RECON001',
 'pending', 'normal', '[{"name": "Full Body Inspection", "price": 200}, {"name": "Paint Touch-Up", "price": 400}, {"name": "Interior Deep Clean", "price": 300}]'::jsonb,
 900.00, 'Trade-in reconditioning assessment', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days'),

('RC-0002', 'RECON-00002', 'recon', 'Auction Purchase', 'recon@dealership.com', '+1-555-0302',
 2020, 'BMW', '330i', 'WBA5R1C50L7B23456', 'RECON002',
 'in_progress', 'high', '[{"name": "Engine Diagnostics", "price": 500}, {"name": "Transmission Inspection", "price": 300}, {"name": "Electrical System Check", "price": 250}]'::jsonb,
 1050.00, 'Auction vehicle mechanical assessment', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days'),

('RC-0003', 'RECON-00003', 'recon', 'Lease Return', 'recon@dealership.com', '+1-555-0303',
 2022, 'BMW', 'X5 xDrive40i', '5UX53DP05N9C34567', 'RECON003',
 'completed', 'normal', '[{"name": "Wear and Tear Repair", "price": 650}, {"name": "Detailing Package", "price": 400}, {"name": "Tire Replacement", "price": 800}]'::jsonb,
 1850.00, 'Lease return reconditioning complete', NULL,
 5, NOW() - INTERVAL '12 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),

('RC-0004', 'RECON-00004', 'recon', 'CPO Preparation', 'recon@dealership.com', '+1-555-0304',
 2021, 'BMW', '530i', 'WBA5A7C50M7H89012', 'RECON004',
 'pending', 'urgent', '[{"name": "170-Point Inspection", "price": 400}, {"name": "Warranty Prep", "price": 300}, {"name": "Certification Detail", "price": 250}]'::jsonb,
 950.00, 'Certified Pre-Owned preparation', NULL,
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '3 days'),

('RC-0005', 'RECON-00005', 'recon', 'Wholesale Purchase', 'recon@dealership.com', '+1-555-0305',
 2019, 'BMW', 'X1 xDrive28i', '5UX4V5C03K9K12345', 'RECON005',
 'in_progress', 'normal', '[{"name": "Collision Assessment", "price": 300}, {"name": "Frame Inspection", "price": 200}, {"name": "Paint Correction", "price": 800}]'::jsonb,
 1300.00, 'Wholesale vehicle body work assessment', NULL,
 5, NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '10 days'),

('RC-0006', 'RECON-00006', 'recon', 'Customer Trade', 'recon@dealership.com', '+1-555-0306',
 2020, 'BMW', 'i3', 'WBY8P2C09L7D45678', 'RECON006',
 'completed', 'normal', '[{"name": "Battery Assessment", "price": 500}, {"name": "Electric Motor Check", "price": 300}, {"name": "Software Updates", "price": 150}]'::jsonb,
 950.00, 'Electric vehicle recon complete', NULL,
 5, NOW() - INTERVAL '18 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),

('RC-0007', 'RECON-00007', 'recon', 'Dealer Exchange', 'recon@dealership.com', '+1-555-0307',
 2022, 'BMW', '740i', 'WBA7F2C50N9L23456', 'RECON007',
 'pending', 'high', '[{"name": "Luxury Interior Restoration", "price": 1200}, {"name": "Wood Trim Refinishing", "price": 400}, {"name": "Leather Conditioning", "price": 300}]'::jsonb,
 1900.00, 'Luxury vehicle interior restoration', NULL,
 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() + INTERVAL '8 days'),

('RC-0008', 'RECON-00008', 'recon', 'Service Loaner', 'recon@dealership.com', '+1-555-0308',
 2021, 'BMW', 'X6 M50i', '5UX5V4C03M9O56789', 'RECON008',
 'cancelled', 'normal', '[{"name": "Performance Inspection", "price": 600}]'::jsonb,
 600.00, 'Vehicle returned to service loaner fleet', NULL,
 5, NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days', NULL),

('RC-0009', 'RECON-00009', 'recon', 'Repo Recovery', 'recon@dealership.com', '+1-555-0309',
 2020, 'BMW', 'Z4 sDrive30i', 'WBA5V1C00L9J01234', 'RECON009',
 'in_progress', 'urgent', '[{"name": "Damage Assessment", "price": 400}, {"name": "Key Replacement", "price": 200}, {"name": "Security System Reset", "price": 150}]'::jsonb,
 750.00, 'Repossessed vehicle assessment', NULL,
 5, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '6 days'),

('RC-0010', 'RECON-00010', 'recon', 'Fleet Return', 'recon@dealership.com', '+1-555-0310',
 2021, 'BMW', 'M3', 'WBS8M9C09M5E56789', 'RECON010',
 'completed', 'normal', '[{"name": "High Mileage Service", "price": 800}, {"name": "Performance Restoration", "price": 1200}, {"name": "Track Wear Assessment", "price": 300}]'::jsonb,
 2300.00, 'Fleet performance vehicle restoration', NULL,
 5, NOW() - INTERVAL '25 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),

('RC-0011', 'RECON-00011', 'recon', 'Insurance Recovery', 'recon@dealership.com', '+1-555-0311',
 2019, 'BMW', '228i', 'WBA2F1C00K7G78901', 'RECON011',
 'pending', 'normal', '[{"name": "Insurance Damage Repair", "price": 2500}, {"name": "Airbag System Check", "price": 400}, {"name": "Safety Inspection", "price": 200}]'::jsonb,
 3100.00, 'Insurance claim vehicle repair', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '14 days'),

('RC-0012', 'RECON-00012', 'recon', 'Demo Vehicle', 'recon@dealership.com', '+1-555-0312',
 2023, 'BMW', 'iX xDrive50', '5UX8V4C03N9I90123', 'RECON012',
 'in_progress', 'high', '[{"name": "Demo Mileage Service", "price": 350}, {"name": "Customer Wear Repair", "price": 500}, {"name": "Technology Reset", "price": 200}]'::jsonb,
 1050.00, 'Demo vehicle reconditioning', NULL,
 5, NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days'),

('RC-0013', 'RECON-00013', 'recon', 'Wholesale Flip', 'recon@dealership.com', '+1-555-0313',
 2020, 'BMW', '420i', 'WBA4G7C50L7N45678', 'RECON013',
 'completed', 'normal', '[{"name": "Quick Flip Prep", "price": 400}, {"name": "Mechanical Safety Check", "price": 250}, {"name": "Cosmetic Touch-Up", "price": 300}]'::jsonb,
 950.00, 'Wholesale flip preparation complete', NULL,
 5, NOW() - INTERVAL '30 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '21 days'),

('RC-0014', 'RECON-00014', 'recon', 'Trade Assessment', 'recon@dealership.com', '+1-555-0314',
 2022, 'BMW', 'X7 xDrive40i', '5UX4V1C03N9F67890', 'RECON014',
 'pending', 'urgent', '[{"name": "Luxury SUV Assessment", "price": 600}, {"name": "Third Row Inspection", "price": 200}, {"name": "Premium Audio Check", "price": 150}]'::jsonb,
 950.00, 'Large luxury SUV assessment', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days'),

('RC-0015', 'RECON-00015', 'recon', 'Auction Prep', 'recon@dealership.com', '+1-555-0315',
 2019, 'BMW', '318i', 'WBA5R7C50K7R89012', 'RECON015',
 'in_progress', 'normal', '[{"name": "Auction Condition Report", "price": 150}, {"name": "Minor Repair Work", "price": 400}, {"name": "Documentation Prep", "price": 100}]'::jsonb,
 650.00, 'Auction preparation in progress', NULL,
 5, NOW() - INTERVAL '8 days', NOW() - INTERVAL '4 days', NOW() + INTERVAL '3 days'),

('RC-0016', 'RECON-00016', 'recon', 'Manager Special', 'recon@dealership.com', '+1-555-0316',
 2021, 'BMW', 'M4 Competition', 'WBS3M9C09M5M34567', 'RECON016',
 'cancelled', 'high', '[{"name": "Performance Inspection", "price": 500}, {"name": "Track Package Verification", "price": 300}]'::jsonb,
 800.00, 'Manager decided to keep as demo', NULL,
 5, NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days', NULL),

('RC-0017', 'RECON-00017', 'recon', 'Lease Damage', 'recon@dealership.com', '+1-555-0317',
 2020, 'BMW', 'X2 xDrive28i', '5UX2V1C03L9S90123', 'RECON017',
 'pending', 'high', '[{"name": "Excess Wear Repair", "price": 800}, {"name": "Interior Restoration", "price": 600}, {"name": "Exterior Touch-Up", "price": 400}]'::jsonb,
 1800.00, 'Lease excess wear and tear repair', NULL,
 5, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() + INTERVAL '9 days'),

('RC-0018', 'RECON-00018', 'recon', 'Corporate Fleet', 'recon@dealership.com', '+1-555-0318',
 2022, 'BMW', '230i', 'WBA2F1C00N7P67890', 'RECON018',
 'completed', 'normal', '[{"name": "Fleet Vehicle Prep", "price": 350}, {"name": "Corporate Branding Removal", "price": 200}, {"name": "Interior Sanitization", "price": 100}]'::jsonb,
 650.00, 'Corporate fleet vehicle prep complete', NULL,
 5, NOW() - INTERVAL '16 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days'),

('RC-0019', 'RECON-00019', 'recon', 'Wholesaler Return', 'recon@dealership.com', '+1-555-0319',
 2021, 'BMW', 'i7 xDrive60', 'WBA7Y4C00M9Q78901', 'RECON019',
 'in_progress', 'urgent', '[{"name": "Electric Flagship Assessment", "price": 1000}, {"name": "High-Tech Systems Check", "price": 500}, {"name": "Luxury Component Inspection", "price": 400}]'::jsonb,
 1900.00, 'Electric flagship comprehensive assessment', NULL,
 5, NOW() - INTERVAL '9 days', NOW() - INTERVAL '4 days', NOW() + INTERVAL '7 days'),

('RC-0020', 'RECON-00020', 'recon', 'Damage Claim', 'recon@dealership.com', '+1-555-0320',
 2023, 'BMW', 'M8 Competition', 'WBS2M9C09N5T01234', 'RECON020',
 'pending', 'urgent', '[{"name": "Collision Damage Assessment", "price": 1500}, {"name": "Carbon Fiber Repair", "price": 2000}, {"name": "Performance System Check", "price": 600}]'::jsonb,
 4100.00, 'High-performance vehicle collision repair', NULL,
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '21 days'),

-- Car Wash Orders (20 orders)
('CW-0001', 'WASH-00001', 'car_wash', 'Express Customer', 'express@customer.com', '+1-555-0401',
 2023, 'BMW', 'X3', '5UX43DP05O9A12345', 'WASH001',
 'pending', 'normal', '[{"name": "Express Wash", "price": 25}, {"name": "Basic Vacuum", "price": 10}]'::jsonb,
 35.00, 'Quick express service', NULL,
 5, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '1 hour'),

('CW-0002', 'WASH-00002', 'car_wash', 'Premium Customer', 'premium@customer.com', '+1-555-0402',
 2024, 'BMW', '530i', 'WBA5A7C50P7H89012', 'WASH002',
 'in_progress', 'high', '[{"name": "Premium Wash", "price": 45}, {"name": "Interior Detail", "price": 35}, {"name": "Tire Shine", "price": 15}]'::jsonb,
 95.00, 'Premium service package in wash bay', NULL,
 5, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '30 minutes'),

('CW-0003', 'WASH-00003', 'car_wash', 'VIP Customer', 'vip@customer.com', '+1-555-0403',
 2024, 'BMW', 'X5', '5UX53DP05P9C34567', 'WASH003',
 'completed', 'urgent', '[{"name": "VIP Full Detail", "price": 120}, {"name": "Paint Protection", "price": 80}, {"name": "Interior Protection", "price": 60}]'::jsonb,
 260.00, 'VIP complete detail service finished', NULL,
 5, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '15 minutes'),

('CW-0004', 'WASH-00004', 'car_wash', 'Delivery Prep', 'delivery@dealership.com', '+1-555-0404',
 2024, 'BMW', 'i4', 'WBA4J1C08P5D45678', 'WASH004',
 'pending', 'waiter', '[{"name": "Delivery Wash", "price": 40}, {"name": "Final Inspection Clean", "price": 20}]'::jsonb,
 60.00, 'Customer waiting for delivery preparation', NULL,
 5, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes', NOW() + INTERVAL '45 minutes'),

('CW-0005', 'WASH-00005', 'car_wash', 'Service Complete', 'service@dealership.com', '+1-555-0405',
 2023, 'BMW', 'M3', 'WBS8M9C09O5E56789', 'WASH005',
 'in_progress', 'high', '[{"name": "Post-Service Wash", "price": 30}, {"name": "Engine Bay Clean", "price": 25}]'::jsonb,
 55.00, 'Post-service cleanup in progress', NULL,
 5, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '25 minutes'),

('CW-0006', 'WASH-00006', 'car_wash', 'Loaner Return', 'loaner@dealership.com', '+1-555-0406',
 2022, 'BMW', 'X7', '5UX4V1C03O9F67890', 'WASH006',
 'completed', 'normal', '[{"name": "Loaner Detail", "price": 50}, {"name": "Sanitization Service", "price": 20}]'::jsonb,
 70.00, 'Loaner vehicle cleaning complete', NULL,
 5, NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '30 minutes'),

('CW-0007', 'WASH-00007', 'car_wash', 'Walk-In Customer', 'walkin@customer.com', '+1-555-0407',
 2021, 'BMW', '228i', 'WBA2F1C00M7G78901', 'WASH007',
 'pending', 'waiter', '[{"name": "Basic Wash", "price": 20}, {"name": "Wax Application", "price": 30}]'::jsonb,
 50.00, 'Walk-in customer waiting', NULL,
 5, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes', NOW() + INTERVAL '35 minutes'),

('CW-0008', 'WASH-00008', 'car_wash', 'Showroom Prep', 'showroom@dealership.com', '+1-555-0408',
 2024, 'BMW', 'iX', '5UX8V4C03P9I90123', 'WASH008',
 'cancelled', 'normal', '[{"name": "Showroom Detail", "price": 80}]'::jsonb,
 80.00, 'Vehicle moved to different location', NULL,
 5, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', NULL),

('CW-0009', 'WASH-00009', 'car_wash', 'Test Drive Prep', 'testdrive@dealership.com', '+1-555-0409',
 2023, 'BMW', 'Z4', 'WBA5V1C00O9J01234', 'WASH009',
 'in_progress', 'urgent', '[{"name": "Test Drive Clean", "price": 35}, {"name": "Interior Refresh", "price": 25}]'::jsonb,
 60.00, 'Test drive preparation urgent', NULL,
 5, NOW() - INTERVAL '35 minutes', NOW() - INTERVAL '10 minutes', NOW() + INTERVAL '15 minutes'),

('CW-0010', 'WASH-00010', 'car_wash', 'Complimentary Service', 'complimentary@customer.com', '+1-555-0410',
 2022, 'BMW', '330i', 'WBA5R1C50O7B23456', 'WASH010',
 'completed', 'normal', '[{"name": "Complimentary Wash", "price": 0}, {"name": "Customer Appreciation", "price": 0}]'::jsonb,
 0.00, 'Complimentary customer service complete', NULL,
 5, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 45 minutes'),

('CW-0011', 'WASH-00011', 'car_wash', 'Auction Prep', 'auction@dealership.com', '+1-555-0411',
 2020, 'BMW', 'X1', '5UX4V5C03L9K12345', 'WASH011',
 'pending', 'high', '[{"name": "Auction Presentation Wash", "price": 60}, {"name": "Photo Prep Detail", "price": 40}]'::jsonb,
 100.00, 'Auction presentation preparation', NULL,
 5, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '2 hours'),

('CW-0012', 'WASH-00012', 'car_wash', 'Corporate Fleet', 'fleet@customer.com', '+1-555-0412',
 2021, 'BMW', '740i', 'WBA7F2C50M9L23456', 'WASH012',
 'in_progress', 'normal', '[{"name": "Fleet Wash Package", "price": 35}, {"name": "Corporate Clean", "price": 15}]'::jsonb,
 50.00, 'Corporate fleet vehicle cleaning', NULL,
 5, NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '20 minutes', NOW() + INTERVAL '30 minutes'),

('CW-0013', 'WASH-00013', 'car_wash', 'Insurance Photo', 'insurance@customer.com', '+1-555-0413',
 2019, 'BMW', 'X6', '5UX5V4C03K9O56789', 'WASH013',
 'completed', 'urgent', '[{"name": "Insurance Photo Prep", "price": 45}, {"name": "Damage Documentation Clean", "price": 25}]'::jsonb,
 70.00, 'Insurance photo documentation complete', NULL,
 5, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 30 minutes'),

('CW-0014', 'WASH-00014', 'car_wash', 'Manager Special', 'manager@dealership.com', '+1-555-0414',
 2023, 'BMW', '420i', 'WBA4G7C50O7N45678', 'WASH014',
 'pending', 'waiter', '[{"name": "Manager Special Detail", "price": 75}, {"name": "Executive Wash", "price": 45}]'::jsonb,
 120.00, 'Manager special preparation - customer waiting', NULL,
 5, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '1 hour 30 minutes'),

('CW-0015', 'WASH-00015', 'car_wash', 'Social Media Photo', 'social@dealership.com', '+1-555-0415',
 2024, 'BMW', 'M4', 'WBS3M9C09P5M34567', 'WASH015',
 'in_progress', 'high', '[{"name": "Photo Shoot Prep", "price": 90}, {"name": "Studio Quality Detail", "price": 110}]'::jsonb,
 200.00, 'Social media photo shoot preparation', NULL,
 5, NOW() - INTERVAL '50 minutes', NOW() - INTERVAL '25 minutes', NOW() + INTERVAL '45 minutes'),

('CW-0016', 'WASH-00016', 'car_wash', 'Event Display', 'events@dealership.com', '+1-555-0416',
 2022, 'BMW', 'i7', 'WBA7Y4C00O9Q78901', 'WASH016',
 'cancelled', 'normal', '[{"name": "Event Display Detail", "price": 100}]'::jsonb,
 100.00, 'Event cancelled - vehicle returned', NULL,
 5, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours', NULL),

('CW-0017', 'WASH-00017', 'car_wash', 'Customer Pick-up', 'pickup@customer.com', '+1-555-0417',
 2021, 'BMW', 'X2', '5UX2V1C03M9S90123', 'WASH017',
 'pending', 'waiter', '[{"name": "Pick-up Prep Wash", "price": 30}, {"name": "Final Touch Detail", "price": 20}]'::jsonb,
 50.00, 'Customer arriving for pickup', NULL,
 5, NOW() - INTERVAL '8 minutes', NOW() - INTERVAL '8 minutes', NOW() + INTERVAL '40 minutes'),

('CW-0018', 'WASH-00018', 'car_wash', 'Warranty Work', 'warranty@customer.com', '+1-555-0418',
 2020, 'BMW', '318i', 'WBA5R7C50L7R89012', 'WASH018',
 'completed', 'normal', '[{"name": "Post-Warranty Wash", "price": 25}, {"name": "Service Area Clean", "price": 15}]'::jsonb,
 40.00, 'Post-warranty work cleanup complete', NULL,
 5, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 45 minutes'),

('CW-0019', 'WASH-00019', 'car_wash', 'Executive Demo', 'executive@dealership.com', '+1-555-0419',
 2024, 'BMW', '230i', 'WBA2F1C00P7P67890', 'WASH019',
 'in_progress', 'urgent', '[{"name": "Executive Demo Detail", "price": 65}, {"name": "VIP Presentation Prep", "price": 55}]'::jsonb,
 120.00, 'Executive demo preparation urgent', NULL,
 5, NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '12 minutes', NOW() + INTERVAL '20 minutes'),

('CW-0020', 'WASH-00020', 'car_wash', 'Weekend Special', 'weekend@customer.com', '+1-555-0420',
 2023, 'BMW', 'M8', 'WBS2M9C09O5T01234', 'WASH020',
 'pending', 'waiter', '[{"name": "Weekend Special Package", "price": 85}, {"name": "Premium Plus Detail", "price": 65}]'::jsonb,
 150.00, 'Weekend special customer waiting', NULL,
 5, NOW() - INTERVAL '12 minutes', NOW() - INTERVAL '12 minutes', NOW() + INTERVAL '2 hours');