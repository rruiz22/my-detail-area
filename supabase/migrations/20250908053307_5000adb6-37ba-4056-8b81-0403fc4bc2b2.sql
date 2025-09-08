-- Fix security warnings: Add search_path to functions without it

-- Fix generate_unique_slug function
CREATE OR REPLACE FUNCTION public.generate_unique_slug()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
  slug_exists BOOLEAN;
BEGIN
  LOOP
    result := '';
    -- Generate 5 character slug
    FOR i IN 1..5 LOOP
      result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    
    -- Check if slug already exists
    SELECT EXISTS(SELECT 1 FROM public.sales_order_links WHERE slug = result AND is_active = true) INTO slug_exists;
    
    -- Exit loop if slug is unique
    IF NOT slug_exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$function$;