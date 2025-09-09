-- Final batch of remaining test orders with unique order numbers

INSERT INTO orders (
  order_number, custom_order_number, order_type, customer_name, customer_email, customer_phone,
  vehicle_year, vehicle_make, vehicle_model, vehicle_vin, stock_number,
  status, priority, services, total_amount, notes, salesperson,
  dealer_id, created_at, updated_at, sla_deadline
) VALUES

-- Additional Recon Orders (RC-0100 series to avoid conflicts)
('RC-0101', 'RECON-00101', 'service', 'Customer Trade', 'recon@dealership.com', '+1-555-0306',
 2020, 'BMW', 'i3', 'WBY8P2C09L7D45678', 'RECON101',
 'completed', 'normal', '[{"name": "Battery Assessment", "price": 500, "category": "recon"}, {"name": "Electric Motor Check", "price": 300, "category": "recon"}]'::jsonb,
 800.00, 'RECON: Electric vehicle recon complete', NULL,
 5, NOW() - INTERVAL '18 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days'),

('RC-0102', 'RECON-00102', 'service', 'Dealer Exchange', 'recon@dealership.com', '+1-555-0307',
 2022, 'BMW', '740i', 'WBA7F2C50N9L23456', 'RECON102',
 'pending', 'high', '[{"name": "Luxury Interior Restoration", "price": 1200, "category": "recon"}, {"name": "Wood Trim Refinishing", "price": 400, "category": "recon"}]'::jsonb,
 1600.00, 'RECON: Luxury vehicle interior restoration', NULL,
 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() + INTERVAL '8 days'),

('RC-0103', 'RECON-00103', 'service', 'Demo Vehicle', 'recon@dealership.com', '+1-555-0312',
 2023, 'BMW', 'iX xDrive50', '5UX8V4C03N9I90123', 'RECON103',
 'in_progress', 'high', '[{"name": "Demo Mileage Service", "price": 350, "category": "recon"}, {"name": "Customer Wear Repair", "price": 500, "category": "recon"}]'::jsonb,
 850.00, 'RECON: Demo vehicle reconditioning', NULL,
 5, NOW() - INTERVAL '7 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days'),

('RC-0104', 'RECON-00104', 'service', 'Insurance Recovery', 'recon@dealership.com', '+1-555-0311',
 2019, 'BMW', '228i', 'WBA2F1C00K7G78901', 'RECON104',
 'pending', 'normal', '[{"name": "Insurance Damage Repair", "price": 2500, "category": "recon"}, {"name": "Airbag System Check", "price": 400, "category": "recon"}]'::jsonb,
 2900.00, 'RECON: Insurance claim vehicle repair', NULL,
 5, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() + INTERVAL '14 days'),

('RC-0105', 'RECON-00105', 'service', 'Trade Assessment', 'recon@dealership.com', '+1-555-0314',
 2022, 'BMW', 'X7 xDrive40i', '5UX4V1C03N9F67890', 'RECON105',
 'pending', 'urgent', '[{"name": "Luxury SUV Assessment", "price": 600, "category": "recon"}, {"name": "Third Row Inspection", "price": 200, "category": "recon"}]'::jsonb,
 800.00, 'RECON: Large luxury SUV assessment', NULL,
 5, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() + INTERVAL '5 days'),

-- Additional Car Wash Orders (CW-0100 series)
('CW-0101', 'WASH-00101', 'service', 'Express Service', 'express2@customer.com', '+1-555-0501',
 2023, 'BMW', 'X3', '5UX43DP05O9A12346', 'WASH101',
 'pending', 'normal', '[{"name": "Express Wash", "price": 25, "category": "car_wash"}]'::jsonb,
 25.00, 'CARWASH: Express service request', NULL,
 5, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes', NOW() + INTERVAL '45 minutes'),

('CW-0102', 'WASH-00102', 'service', 'Premium Detail', 'premium3@customer.com', '+1-555-0502',
 2024, 'BMW', '530i', 'WBA5A7C50P7H89013', 'WASH102',
 'in_progress', 'high', '[{"name": "Premium Full Service", "price": 150, "category": "car_wash"}]'::jsonb,
 150.00, 'CARWASH: Premium detail in progress', NULL,
 5, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '45 minutes', NOW() + INTERVAL '1 hour'),

('CW-0103', 'WASH-00103', 'service', 'Customer Waiting', 'waiting@customer.com', '+1-555-0503',
 2023, 'BMW', 'M3', 'WBS8M9C09O5E56790', 'WASH103',
 'pending', 'urgent', '[{"name": "Quick Wash", "price": 35, "category": "car_wash"}]'::jsonb,
 35.00, 'CARWASH: Customer waiting - high priority', NULL,
 5, NOW() - INTERVAL '3 minutes', NOW() - INTERVAL '3 minutes', NOW() + INTERVAL '30 minutes'),

('CW-0104', 'WASH-00104', 'service', 'Delivery Final', 'delivery2@dealership.com', '+1-555-0504',
 2024, 'BMW', 'iX', '5UX8V4C03P9I90124', 'WASH104',
 'completed', 'urgent', '[{"name": "Final Delivery Prep", "price": 50, "category": "car_wash"}]'::jsonb,
 50.00, 'CARWASH: Final delivery preparation complete', NULL,
 5, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours 30 minutes'),

('CW-0105', 'WASH-00105', 'service', 'VIP Express', 'vip2@customer.com', '+1-555-0505',
 2023, 'BMW', 'X5', '5UX53DP05P9C34568', 'WASH105',
 'in_progress', 'urgent', '[{"name": "VIP Express Detail", "price": 95, "category": "car_wash"}]'::jsonb,
 95.00, 'CARWASH: VIP express service in progress', NULL,
 5, NOW() - INTERVAL '18 minutes', NOW() - INTERVAL '8 minutes', NOW() + INTERVAL '25 minutes');