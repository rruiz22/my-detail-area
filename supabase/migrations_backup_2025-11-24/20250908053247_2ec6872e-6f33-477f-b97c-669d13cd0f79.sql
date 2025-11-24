-- Create sales_order_links table for advanced QR & Short Links analytics
CREATE TABLE public.sales_order_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  dealer_id BIGINT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_url TEXT,
  qr_code_url TEXT,
  deep_link TEXT NOT NULL,
  title TEXT,
  description TEXT,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,
  last_clicked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  -- Constraints
  CONSTRAINT sales_order_links_slug_length CHECK (length(slug) = 5),
  CONSTRAINT sales_order_links_slug_format CHECK (slug ~ '^[A-Z0-9]{5}$')
);

-- Create click tracking table
CREATE TABLE public.sales_order_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_id UUID NOT NULL REFERENCES public.sales_order_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  referer TEXT,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  is_mobile BOOLEAN DEFAULT false,
  is_unique_click BOOLEAN DEFAULT false,
  session_id TEXT,
  
  -- Additional tracking data
  click_data JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.sales_order_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_link_clicks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sales_order_links
CREATE POLICY "Users can view links for accessible orders" 
ON public.sales_order_links 
FOR SELECT 
USING (
  is_admin() OR 
  user_has_active_dealer_membership(auth.uid(), dealer_id) OR
  (order_id IN (
    SELECT o.id FROM get_user_accessible_orders(auth.uid(), dealer_id) o
  ))
);

CREATE POLICY "Users can create links for accessible orders" 
ON public.sales_order_links 
FOR INSERT 
WITH CHECK (
  is_admin() OR 
  (user_has_active_dealer_membership(auth.uid(), dealer_id) AND 
   user_has_order_permission(auth.uid(), dealer_id, 'orders.update'))
);

CREATE POLICY "Users can update links for accessible orders" 
ON public.sales_order_links 
FOR UPDATE 
USING (
  is_admin() OR 
  (user_has_active_dealer_membership(auth.uid(), dealer_id) AND 
   user_has_order_permission(auth.uid(), dealer_id, 'orders.update'))
);

-- Create RLS policies for sales_order_link_clicks (read-only for users)
CREATE POLICY "Users can view clicks for accessible links" 
ON public.sales_order_link_clicks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sales_order_links sol 
    WHERE sol.id = link_id 
    AND (is_admin() OR user_has_active_dealer_membership(auth.uid(), sol.dealer_id))
  )
);

-- Public policy for click insertion (no auth required for tracking)
CREATE POLICY "Allow public click tracking" 
ON public.sales_order_link_clicks 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_sales_order_links_order_id ON public.sales_order_links(order_id);
CREATE INDEX idx_sales_order_links_dealer_id ON public.sales_order_links(dealer_id);
CREATE INDEX idx_sales_order_links_slug ON public.sales_order_links(slug);
CREATE INDEX idx_sales_order_links_active ON public.sales_order_links(is_active) WHERE is_active = true;

CREATE INDEX idx_sales_order_link_clicks_link_id ON public.sales_order_link_clicks(link_id);
CREATE INDEX idx_sales_order_link_clicks_clicked_at ON public.sales_order_link_clicks(clicked_at);
CREATE INDEX idx_sales_order_link_clicks_ip_session ON public.sales_order_link_clicks(ip_address, session_id);

-- Create function to generate unique 5-digit slugs
CREATE OR REPLACE FUNCTION public.generate_unique_slug()
RETURNS TEXT
LANGUAGE plpgsql
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

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sales_order_links_updated_at
BEFORE UPDATE ON public.sales_order_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update click statistics
CREATE OR REPLACE FUNCTION public.update_link_click_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update total clicks
  UPDATE public.sales_order_links 
  SET 
    total_clicks = total_clicks + 1,
    last_clicked_at = NEW.clicked_at,
    updated_at = now()
  WHERE id = NEW.link_id;
  
  -- Update unique clicks if it's a unique click
  IF NEW.is_unique_click = true THEN
    UPDATE public.sales_order_links 
    SET unique_clicks = unique_clicks + 1
    WHERE id = NEW.link_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for click statistics
CREATE TRIGGER update_link_click_statistics
AFTER INSERT ON public.sales_order_link_clicks
FOR EACH ROW
EXECUTE FUNCTION public.update_link_click_stats();