-- Add new fields to orders table
ALTER TABLE public.orders 
ADD COLUMN notes TEXT,
ADD COLUMN internal_notes TEXT,
ADD COLUMN assigned_contact_id UUID,
ADD COLUMN scheduled_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN scheduled_time TIME,
ADD COLUMN salesperson TEXT,
ADD COLUMN qr_code_url TEXT,
ADD COLUMN short_link TEXT;

-- Create order_comments table for comment tracking
CREATE TABLE public.order_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comment_text TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'public' CHECK (comment_type IN ('public', 'internal')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on order_comments
ALTER TABLE public.order_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for order_comments
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

-- Add trigger for updated_at
CREATE TRIGGER update_order_comments_updated_at
BEFORE UPDATE ON public.order_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key relationships where appropriate
ALTER TABLE public.order_comments
ADD CONSTRAINT fk_order_comments_order_id
FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;