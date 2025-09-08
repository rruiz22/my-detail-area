-- Phase 2: Attachments & Storage System
-- Create storage buckets for order attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'order-attachments', 
  'order-attachments', 
  false, 
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv'
  ]
);

-- Create order_attachments table
CREATE TABLE public.order_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  upload_context TEXT DEFAULT 'general',
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for order_attachments
CREATE POLICY "Users can view attachments for accessible orders" 
ON public.order_attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_attachments.order_id 
    AND (is_admin() OR user_has_active_dealer_membership(auth.uid(), o.dealer_id))
  )
);

CREATE POLICY "Users can upload attachments for accessible orders" 
ON public.order_attachments 
FOR INSERT 
WITH CHECK (
  uploaded_by = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_attachments.order_id 
    AND (is_admin() OR (
      user_has_active_dealer_membership(auth.uid(), o.dealer_id) 
      AND user_has_order_permission(auth.uid(), o.dealer_id, 'orders.update')
    ))
  )
);

CREATE POLICY "Users can delete their own attachments" 
ON public.order_attachments 
FOR DELETE 
USING (
  uploaded_by = auth.uid() 
  OR is_admin() 
  OR EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_attachments.order_id 
    AND user_has_active_dealer_membership(auth.uid(), o.dealer_id)
    AND user_has_order_permission(auth.uid(), o.dealer_id, 'orders.delete')
  )
);

-- Storage policies for order-attachments bucket
CREATE POLICY "Users can view attachments they have access to" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'order-attachments' 
  AND (
    is_admin() 
    OR EXISTS (
      SELECT 1 FROM public.order_attachments oa
      JOIN public.orders o ON o.id = oa.order_id
      WHERE oa.file_path = storage.objects.name
      AND user_has_active_dealer_membership(auth.uid(), o.dealer_id)
    )
  )
);

CREATE POLICY "Users can upload attachments" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'order-attachments' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own attachments" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'order-attachments' 
  AND (
    is_admin() 
    OR EXISTS (
      SELECT 1 FROM public.order_attachments oa
      JOIN public.orders o ON o.id = oa.order_id
      WHERE oa.file_path = storage.objects.name
      AND (
        oa.uploaded_by = auth.uid()
        OR user_has_order_permission(auth.uid(), o.dealer_id, 'orders.delete')
      )
    )
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_order_attachments_updated_at
  BEFORE UPDATE ON public.order_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();