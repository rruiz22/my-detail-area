-- Check and add new fields to orders table if they don't exist
DO $$ 
BEGIN
  -- Add notes column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'notes') THEN
    ALTER TABLE public.orders ADD COLUMN notes TEXT;
  END IF;
  
  -- Add internal_notes column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'internal_notes') THEN
    ALTER TABLE public.orders ADD COLUMN internal_notes TEXT;
  END IF;
  
  -- Add assigned_contact_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'assigned_contact_id') THEN
    ALTER TABLE public.orders ADD COLUMN assigned_contact_id UUID;
  END IF;
  
  -- Add scheduled_date column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'scheduled_date') THEN
    ALTER TABLE public.orders ADD COLUMN scheduled_date TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Add scheduled_time column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'scheduled_time') THEN
    ALTER TABLE public.orders ADD COLUMN scheduled_time TIME;
  END IF;
  
  -- Add salesperson column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'salesperson') THEN
    ALTER TABLE public.orders ADD COLUMN salesperson TEXT;
  END IF;
  
  -- Add qr_code_url column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'qr_code_url') THEN
    ALTER TABLE public.orders ADD COLUMN qr_code_url TEXT;
  END IF;
  
  -- Add short_link column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'short_link') THEN
    ALTER TABLE public.orders ADD COLUMN short_link TEXT;
  END IF;
END $$;

-- Create order_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.order_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'public' CHECK (comment_type IN ('public', 'internal')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on order_comments if it exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_comments') THEN
    ALTER TABLE public.order_comments ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies for order_comments (drop first if they exist)
DROP POLICY IF EXISTS "Users can view comments for accessible orders" ON public.order_comments;
DROP POLICY IF EXISTS "Users can create comments for accessible orders" ON public.order_comments;  
DROP POLICY IF EXISTS "Users can update their own comments" ON public.order_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.order_comments;

CREATE POLICY "Users can view comments for accessible orders" 
ON public.order_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_comments.order_id
    AND (
      is_admin() OR 
      user_has_active_dealer_membership(auth.uid(), o.dealer_id)
    )
  )
);

CREATE POLICY "Users can create comments for accessible orders" 
ON public.order_comments 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_comments.order_id
    AND (
      is_admin() OR 
      user_has_active_dealer_membership(auth.uid(), o.dealer_id)
    )
  )
);

CREATE POLICY "Users can update their own comments" 
ON public.order_comments 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" 
ON public.order_comments 
FOR DELETE 
USING (user_id = auth.uid());

-- Add trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_order_comments_updated_at ON public.order_comments;
CREATE TRIGGER update_order_comments_updated_at
BEFORE UPDATE ON public.order_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_order_comments_order_id'
  ) THEN
    ALTER TABLE public.order_comments
    ADD CONSTRAINT fk_order_comments_order_id
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
  END IF;
END $$;