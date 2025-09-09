-- Insert 40 additional test orders with unique sequential numbers

INSERT INTO orders (
  order_number, custom_order_number, order_type, customer_name, customer_email, customer_phone,
  vehicle_year, vehicle_make, vehicle_model, vehicle_vin, stock_number,
  status, priority, services, total_amount, notes, salesperson,
  dealer_id, created_at, updated_at, sla_deadline
) VALUES

-- Sales Orders (continuing from SA-0024 onwards)
('SA-0024', 'SALES-00024', 'sales', 'Michael Johnson', 'mjohnson@email.com', '+1-555-0101',
 2024, 'BMW', 'X3 xDrive30i', '5UX43DP05R9A12345', 'BMW24024',
 'pending', 'high', '[{"name": "Pre-Delivery Inspection", "price": 250}, {"name": "Premium Detail", "price": 450}]'::jsonb, 
 700.00, 'New vehicle delivery prep', 'Sarah Miller',
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day'),

('SA-0025', 'SALES-00025', 'sales', 'Jennifer Davis', 'jdavis@email.com', '+1-555-0102',
 2023, 'BMW', '330i', 'WBA5R1C50N7B23456', 'BMW24025',
 'in_progress', 'normal', '[{"name": "Final Inspection", "price": 150}, {"name": "Delivery Prep", "price": 200}]'::jsonb,
 350.00, 'Certified pre-owned preparation', 'Mike Thompson',
 5, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days'),

('SA-0026', 'SALES-00026', 'sales', 'Robert Wilson', 'rwilson@email.com', '+1-555-0103',
 2024, 'BMW', 'X5 xDrive40i', '5UX53DP05R9C34567', 'BMW24026',
 'completed', 'normal', '[{"name": "New Car Prep", "price": 300}, {"name": "Paint Protection", "price": 800}]'::jsonb,
 1100.00, 'Complete new vehicle preparation', 'Sarah Miller',
 5, NOW() - INTERVAL '8 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'),

('SA-0027', 'SALES-00027', 'sales', 'Amanda Brown', 'abrown@email.com', '+1-555-0104',
 2023, 'BMW', 'i4 eDrive40', 'WBA4J1C08N5D45678', 'BMW24027',
 'pending', 'high', '[{"name": "Electric Vehicle Prep", "price": 400}, {"name": "Tech Setup", "price": 150}]'::jsonb,
 550.00, 'Electric vehicle delivery preparation', 'David Chen',
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '3 days'),

('SA-0028', 'SALES-00028', 'sales', 'Christopher Martinez', 'cmartinez@email.com', '+1-555-0105',
 2024, 'BMW', 'M3 Competition', 'WBS8M9C09R5E56789', 'BMW24028',
 'in_progress', 'urgent', '[{"name": "Performance Package Prep", "price": 500}, {"name": "M Detail Package", "price": 750}]'::jsonb,
 1250.00, 'High-performance vehicle preparation', 'Sarah Miller',
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '6 hours', NOW() + INTERVAL '1 day'),

-- Service Orders (continuing from SV-0062 onwards) 
('SV-0062', 'SERVICE-00062', 'service', 'John Smith', 'jsmith@email.com', '+1-555-0201',
 2022, 'BMW', 'X3 xDrive30i', '5UX43DP05N9A12345', NULL,
 'pending', 'normal', '[{"name": "Oil Change Service", "price": 120}, {"name": "Multi-Point Inspection", "price": 80}]'::jsonb,
 200.00, 'Regular maintenance service', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day'),

('SV-0063', 'SERVICE-00063', 'service', 'Emily Wilson', 'ewilson@email.com', '+1-555-0202',
 2021, 'BMW', '530i', 'WBA5A7C50M7H89012', NULL,
 'in_progress', 'high', '[{"name": "Brake Pad Replacement", "price": 450}, {"name": "Brake Fluid Service", "price": 100}]'::jsonb,
 550.00, 'Brake system service in progress', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days'),

('SV-0064', 'SERVICE-00064', 'service', 'Michael Davis', 'mdavis2@email.com', '+1-555-0203',
 2020, 'BMW', 'X5 xDrive40i', '5UX53DP05L9C34567', NULL,
 'completed', 'normal', '[{"name": "Annual Service", "price": 350}, {"name": "Cabin Air Filter", "price": 65}]'::jsonb,
 415.00, 'Annual maintenance completed', NULL,
 5, NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'),

-- Recon Orders (using higher service numbers)
('SV-0065', 'SERVICE-00065', 'service', 'Trade-In Vehicle', 'recon@dealership.com', '+1-555-0301',
 2021, 'BMW', 'X3 xDrive30i', '5UX43DP05M9A12345', 'RECON001',
 'pending', 'normal', '[{"name": "Full Body Inspection", "price": 200, "category": "recon"}, {"name": "Paint Touch-Up", "price": 400, "category": "recon"}]'::jsonb,
 600.00, 'RECON: Trade-in reconditioning assessment', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days'),

('SV-0066', 'SERVICE-00066', 'service', 'Auction Purchase', 'recon@dealership.com', '+1-555-0302',
 2020, 'BMW', '330i', 'WBA5R1C50L7B23456', 'RECON002',
 'in_progress', 'high', '[{"name": "Engine Diagnostics", "price": 500, "category": "recon"}, {"name": "Transmission Inspection", "price": 300, "category": "recon"}]'::jsonb,
 800.00, 'RECON: Auction vehicle mechanical assessment', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '1 day', NOW() + INTERVAL '7 days'),

-- Car Wash Orders (using higher service numbers)
('SV-0067', 'SERVICE-00067', 'service', 'Express Customer', 'express@customer.com', '+1-555-0401',
 2023, 'BMW', 'X3', '5UX43DP05O9A12345', 'WASH001',
 'pending', 'normal', '[{"name": "Express Wash", "price": 25, "category": "car_wash"}]'::jsonb,
 25.00, 'CARWASH: Quick express service', NULL,
 5, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '30 minutes', NOW() + INTERVAL '1 hour'),

('SV-0068', 'SERVICE-00068', 'service', 'Customer Waiting - Urgent', 'waiting@customer.com', '+1-555-0404',
 2024, 'BMW', 'i4', 'WBA4J1C08P5D45678', 'WASH004',
 'pending', 'urgent', '[{"name": "Delivery Wash", "price": 40, "category": "car_wash"}]'::jsonb,
 40.00, 'CARWASH: Customer waiting for delivery preparation', NULL,
 5, NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes', NOW() + INTERVAL '45 minutes');