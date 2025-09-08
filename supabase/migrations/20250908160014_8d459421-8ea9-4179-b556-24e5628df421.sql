-- Create separate sequences for sales and service orders starting at 1001
CREATE SEQUENCE IF NOT EXISTS sales_order_seq START WITH 1001;
CREATE SEQUENCE IF NOT EXISTS service_order_seq START WITH 1001;

-- Create function to generate sales order numbers
CREATE OR REPLACE FUNCTION public.generate_sales_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN 'SA-' || LPAD(nextval('sales_order_seq')::text, 4, '0');
END;
$function$

-- Create function to generate service order numbers  
CREATE OR REPLACE FUNCTION public.generate_service_order_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public' 
AS $function$
BEGIN
  RETURN 'SV-' || LPAD(nextval('service_order_seq')::text, 4, '0');
END;
$function$