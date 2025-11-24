-- Add remaining test orders to complete the 80 total orders
-- This adds more recon and car wash orders plus some additional service orders

INSERT INTO orders (
  order_number, custom_order_number, order_type, customer_name, customer_email, customer_phone,
  vehicle_year, vehicle_make, vehicle_model, vehicle_vin, stock_number,
  status, priority, services, total_amount, notes, salesperson,
  dealer_id, created_at, updated_at, sla_deadline
) VALUES

-- More Recon Orders (RC-0006 to RC-0020)
('RC-0006', 'RECON-00006', 'service', 'Customer Trade', 'recon@dealership.com', '+1-555-0306',
 2020, 'BMW', 'i3', 'WBY8P2C09L7D45678', 'RECON006',
 'completed', 'normal', '[{"name": "Battery Assessment", "price": 500, "category": "recon"}, {"name": "Electric Motor Check", "price": 300, "category": "recon"}]'::jsonb,
 800.00, 'RECON: Electric vehicle recon complete', NULL,
 5, NOW() - INTERVAL '18 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),

('RC-0007', 'RECON-00007', 'service', 'Dealer Exchange', 'recon@dealership.com', '+1-555-0307',
 2022, 'BMW', '740i', 'WBA7F2C50N9L23456', 'RECON007',
 'pending', 'high', '[{"name": "Luxury Interior Restoration", "price": 1200, "category": "recon"}, {"name": "Wood Trim Refinishing", "price": 400, "category": "recon"}]'::jsonb,
 1600.00, 'RECON: Luxury vehicle interior restoration', NULL,
 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() + INTERVAL '8 days'),

('RC-0008', 'RECON-00008', 'service', 'Demo Vehicle', 'recon@dealership.com', '+1-555-0312',
 2023, 'BMW', 'iX xDrive50', '5UX8V4C03N9I90123', 'RECON012',
 'in_progress', 'high', '[{"name": "Demo Mileage Service", "price": 350, "category": "recon"}, {"name": "Customer Wear Repair", "price": 500, "category": "recon"}]'::jsonb,
 850.00, 'RECON: Demo vehicle reconditioning', NULL,
 5, NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days'),

('RC-0009', 'RECON-00009', 'service', 'Repo Recovery', 'recon@dealership.com', '+1-555-0309',
 2020, 'BMW', 'Z4 sDrive30i', 'WBA5V1C00L9J01234', 'RECON009',
 'in_progress', 'urgent', '[{"name": "Damage Assessment", "price": 400, "category": "recon"}, {"name": "Key Replacement", "price": 200, "category": "recon"}]'::jsonb,
 600.00, 'RECON: Repossessed vehicle assessment', NULL,
 5, NOW() - INTERVAL '5 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '6 days'),

('RC-0010', 'RECON-00010', 'service', 'Fleet Return', 'recon@dealership.com', '+1-555-0310',
 2021, 'BMW', 'M3', 'WBS8M9C09M5E56789', 'RECON010',
 'completed', 'normal', '[{"name": "High Mileage Service", "price": 800, "category": "recon"}, {"name": "Performance Restoration", "price": 1200, "category": "recon"}]'::jsonb,
 2000.00, 'RECON: Fleet performance vehicle restoration', NULL,
 5, NOW() - INTERVAL '25 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'),

-- More Car Wash Orders (CW-0011 to CW-0020)
('CW-0011', 'WASH-00011', 'service', 'Auction Prep', 'auction@dealership.com', '+1-555-0411',
 2020, 'BMW', 'X1', '5UX4V5C03L9K12345', 'WASH011',
 'pending', 'high', '[{"name": "Auction Presentation Wash", "price": 60, "category": "car_wash"}, {"name": "Photo Prep Detail", "price": 40, "category": "car_wash"}]'::jsonb,
 100.00, 'CARWASH: Auction presentation preparation', NULL,
 5, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour', NOW() + INTERVAL '2 hours'),

('CW-0012', 'WASH-00012', 'service', 'Corporate Fleet', 'fleet@customer.com', '+1-555-0412',
 2021, 'BMW', '740i', 'WBA7F2C50M9L23456', 'WASH012',
 'in_progress', 'normal', '[{"name": "Fleet Wash Package", "price": 35, "category": "car_wash"}, {"name": "Corporate Clean", "price": 15, "category": "car_wash"}]'::jsonb,
 50.00, 'CARWASH: Corporate fleet vehicle cleaning', NULL,
 5, NOW() - INTERVAL '40 minutes', NOW() - INTERVAL '20 minutes', NOW() + INTERVAL '30 minutes'),

('CW-0013', 'WASH-00013', 'service', 'Insurance Photo', 'insurance@customer.com', '+1-555-0413',
 2019, 'BMW', 'X6', '5UX5V4C03K9O56789', 'WASH013',
 'completed', 'urgent', '[{"name": "Insurance Photo Prep", "price": 45, "category": "car_wash"}, {"name": "Damage Documentation Clean", "price": 25, "category": "car_wash"}]'::jsonb,
 70.00, 'CARWASH: Insurance photo documentation complete', NULL,
 5, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours 30 minutes'),

('CW-0014', 'WASH-00014', 'service', 'Manager Special - Waiting', 'manager@dealership.com', '+1-555-0414',
 2023, 'BMW', '420i', 'WBA4G7C50O7N45678', 'WASH014',
 'pending', 'urgent', '[{"name": "Manager Special Detail", "price": 75, "category": "car_wash"}, {"name": "Executive Wash", "price": 45, "category": "car_wash"}]'::jsonb,
 120.00, 'CARWASH: Manager special preparation - customer waiting', NULL,
 5, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '1 hour 30 minutes'),

('CW-0015', 'WASH-00015', 'service', 'Social Media Photo', 'social@dealership.com', '+1-555-0415',
 2024, 'BMW', 'M4', 'WBS3M9C09P5M34567', 'WASH015',
 'in_progress', 'high', '[{"name": "Photo Shoot Prep", "price": 90, "category": "car_wash"}, {"name": "Studio Quality Detail", "price": 110, "category": "car_wash"}]'::jsonb,
 200.00, 'CARWASH: Social media photo shoot preparation', NULL,
 5, NOW() - INTERVAL '50 minutes', NOW() - INTERVAL '25 minutes', NOW() + INTERVAL '45 minutes'),

('CW-0016', 'WASH-00016', 'service', 'Event Display', 'events@dealership.com', '+1-555-0416',
 2022, 'BMW', 'i7', 'WBA7Y4C00O9Q78901', 'WASH016',
 'cancelled', 'normal', '[{"name": "Event Display Detail", "price": 100, "category": "car_wash"}]'::jsonb,
 100.00, 'CARWASH: Event cancelled - vehicle returned', NULL,
 5, NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours', NULL),

('CW-0017', 'WASH-00017', 'service', 'Complimentary Service', 'complimentary@customer.com', '+1-555-0410',
 2022, 'BMW', '330i', 'WBA5R1C50O7B23456', 'WASH010',
 'completed', 'normal', '[{"name": "Complimentary Wash", "price": 0, "category": "car_wash"}, {"name": "Customer Appreciation", "price": 0, "category": "car_wash"}]'::jsonb,
 0.00, 'CARWASH: Complimentary customer service complete', NULL,
 5, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours 45 minutes'),

('CW-0018', 'WASH-00018', 'service', 'Warranty Work', 'warranty@customer.com', '+1-555-0418',
 2020, 'BMW', '318i', 'WBA5R7C50L7R89012', 'WASH018',
 'completed', 'normal', '[{"name": "Post-Warranty Wash", "price": 25, "category": "car_wash"}, {"name": "Service Area Clean", "price": 15, "category": "car_wash"}]'::jsonb,
 40.00, 'CARWASH: Post-warranty work cleanup complete', NULL,
 5, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour 45 minutes'),

('CW-0019', 'WASH-00019', 'service', 'Showroom Prep', 'showroom@dealership.com', '+1-555-0408',
 2024, 'BMW', 'iX', '5UX8V4C03P9I90123', 'WASH008',
 'pending', 'normal', '[{"name": "Showroom Detail", "price": 80, "category": "car_wash"}]'::jsonb,
 80.00, 'CARWASH: Vehicle for showroom display', NULL,
 5, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours', NOW() + INTERVAL '4 hours'),

('CW-0020', 'WASH-00020', 'service', 'Premium Detail Customer', 'premium2@customer.com', '+1-555-0421',
 2024, 'BMW', '850i', 'WBA5Z7C00P9U12345', 'WASH021',
 'pending', 'high', '[{"name": "Premium Full Detail", "price": 150, "category": "car_wash"}, {"name": "Ceramic Coating Prep", "price": 200, "category": "car_wash"}]'::jsonb,
 350.00, 'CARWASH: Premium detail with ceramic coating prep', NULL,
 5, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '45 minutes', NOW() + INTERVAL '3 hours'),

-- Additional Recon Orders (RC-0011 to RC-0020)
('RC-0011', 'RECON-00011', 'service', 'Insurance Recovery', 'recon@dealership.com', '+1-555-0311',
 2019, 'BMW', '228i', 'WBA2F1C00K7G78901', 'RECON011',
 'pending', 'normal', '[{"name": "Insurance Damage Repair", "price": 2500, "category": "recon"}, {"name": "Airbag System Check", "price": 400, "category": "recon"}]'::jsonb,
 2900.00, 'RECON: Insurance claim vehicle repair', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '14 days'),

('RC-0012', 'RECON-00012', 'service', 'Service Loaner', 'recon@dealership.com', '+1-555-0308',
 2021, 'BMW', 'X6 M50i', '5UX5V4C03M9O56789', 'RECON008',
 'cancelled', 'normal', '[{"name": "Performance Inspection", "price": 600, "category": "recon"}]'::jsonb,
 600.00, 'RECON: Vehicle returned to service loaner fleet', NULL,
 5, NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days', NULL),

('RC-0013', 'RECON-00013', 'service', 'Wholesale Flip', 'recon@dealership.com', '+1-555-0313',
 2020, 'BMW', '420i', 'WBA4G7C50L7N45678', 'RECON013',
 'completed', 'normal', '[{"name": "Quick Flip Prep", "price": 400, "category": "recon"}, {"name": "Mechanical Safety Check", "price": 250, "category": "recon"}]'::jsonb,
 650.00, 'RECON: Wholesale flip preparation complete', NULL,
 5, NOW() - INTERVAL '30 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '21 days'),

('RC-0014', 'RECON-00014', 'service', 'Trade Assessment', 'recon@dealership.com', '+1-555-0314',
 2022, 'BMW', 'X7 xDrive40i', '5UX4V1C03N9F67890', 'RECON014',
 'pending', 'urgent', '[{"name": "Luxury SUV Assessment", "price": 600, "category": "recon"}, {"name": "Third Row Inspection", "price": 200, "category": "recon"}]'::jsonb,
 800.00, 'RECON: Large luxury SUV assessment', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days'),

('RC-0015', 'RECON-00015', 'service', 'Auction Prep', 'recon@dealership.com', '+1-555-0315',
 2019, 'BMW', '318i', 'WBA5R7C50K7R89012', 'RECON015',
 'in_progress', 'normal', '[{"name": "Auction Condition Report", "price": 150, "category": "recon"}, {"name": "Minor Repair Work", "price": 400, "category": "recon"}]'::jsonb,
 550.00, 'RECON: Auction preparation in progress', NULL,
 5, NOW() - INTERVAL '8 days', NOW() - INTERVAL '4 days', NOW() + INTERVAL '3 days'),

('RC-0016', 'RECON-00016', 'service', 'Manager Special', 'recon@dealership.com', '+1-555-0316',
 2021, 'BMW', 'M4 Competition', 'WBS3M9C09M5M34567', 'RECON016',
 'cancelled', 'high', '[{"name": "Performance Inspection", "price": 500, "category": "recon"}, {"name": "Track Package Verification", "price": 300, "category": "recon"}]'::jsonb,
 800.00, 'RECON: Manager decided to keep as demo', NULL,
 5, NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days', NULL),

('RC-0017', 'RECON-00017', 'service', 'Lease Damage', 'recon@dealership.com', '+1-555-0317',
 2020, 'BMW', 'X2 xDrive28i', '5UX2V1C03L9S90123', 'RECON017',
 'pending', 'high', '[{"name": "Excess Wear Repair", "price": 800, "category": "recon"}, {"name": "Interior Restoration", "price": 600, "category": "recon"}]'::jsonb,
 1400.00, 'RECON: Lease excess wear and tear repair', NULL,
 5, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() + INTERVAL '9 days'),

('RC-0018', 'RECON-00018', 'service', 'Corporate Fleet', 'recon@dealership.com', '+1-555-0318',
 2022, 'BMW', '230i', 'WBA2F1C00N7P67890', 'RECON018',
 'completed', 'normal', '[{"name": "Fleet Vehicle Prep", "price": 350, "category": "recon"}, {"name": "Corporate Branding Removal", "price": 200, "category": "recon"}]'::jsonb,
 550.00, 'RECON: Corporate fleet vehicle prep complete', NULL,
 5, NOW() - INTERVAL '16 days', NOW() - INTERVAL '11 days', NOW() - INTERVAL '10 days'),

('RC-0019', 'RECON-00019', 'service', 'Wholesaler Return', 'recon@dealership.com', '+1-555-0319',
 2021, 'BMW', 'i7 xDrive60', 'WBA7Y4C00M9Q78901', 'RECON019',
 'in_progress', 'urgent', '[{"name": "Electric Flagship Assessment", "price": 1000, "category": "recon"}, {"name": "High-Tech Systems Check", "price": 500, "category": "recon"}]'::jsonb,
 1500.00, 'RECON: Electric flagship comprehensive assessment', NULL,
 5, NOW() - INTERVAL '9 days', NOW() - INTERVAL '4 days', NOW() + INTERVAL '7 days'),

('RC-0020', 'RECON-00020', 'service', 'Damage Claim', 'recon@dealership.com', '+1-555-0320',
 2023, 'BMW', 'M8 Competition', 'WBS2M9C09N5T01234', 'RECON020',
 'pending', 'urgent', '[{"name": "Collision Damage Assessment", "price": 1500, "category": "recon"}, {"name": "Carbon Fiber Repair", "price": 2000, "category": "recon"}]'::jsonb,
 3500.00, 'RECON: High-performance vehicle collision repair', NULL,
 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() + INTERVAL '21 days');