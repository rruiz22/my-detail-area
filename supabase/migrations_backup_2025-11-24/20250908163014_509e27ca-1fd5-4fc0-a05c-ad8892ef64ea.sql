-- Create enhanced order_communications table
CREATE TABLE public.order_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL,
  parent_message_id uuid REFERENCES public.order_communications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'voice', 'file', 'system_update')),
  content text,
  voice_file_path text,
  voice_duration_ms integer,
  voice_transcription text,
  attachments jsonb DEFAULT '[]'::jsonb,
  mentions jsonb DEFAULT '[]'::jsonb,
  reactions jsonb DEFAULT '{}'::jsonb,
  is_edited boolean DEFAULT false,
  edited_at timestamp with time zone,
  reply_count integer DEFAULT 0,
  is_internal boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_communications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view communications for accessible orders" 
ON public.order_communications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM orders o 
  WHERE o.id = order_communications.order_id 
  AND (is_admin() OR user_has_active_dealer_membership(auth.uid(), o.dealer_id))
));

CREATE POLICY "Users can create communications for accessible orders" 
ON public.order_communications 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM orders o 
    WHERE o.id = order_communications.order_id 
    AND (is_admin() OR user_has_active_dealer_membership(auth.uid(), o.dealer_id))
  )
);

CREATE POLICY "Users can update their own communications" 
ON public.order_communications 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own communications" 
ON public.order_communications 
FOR DELETE 
USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_order_communications_order_id ON public.order_communications(order_id);
CREATE INDEX idx_order_communications_parent_id ON public.order_communications(parent_message_id);
CREATE INDEX idx_order_communications_user_id ON public.order_communications(user_id);
CREATE INDEX idx_order_communications_created_at ON public.order_communications(created_at);

-- Create function to update reply count
CREATE OR REPLACE FUNCTION update_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.parent_message_id IS NOT NULL THEN
    UPDATE public.order_communications 
    SET reply_count = reply_count + 1 
    WHERE id = NEW.parent_message_id;
  ELSIF TG_OP = 'DELETE' AND OLD.parent_message_id IS NOT NULL THEN
    UPDATE public.order_communications 
    SET reply_count = reply_count - 1 
    WHERE id = OLD.parent_message_id;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for reply count updates
CREATE TRIGGER update_reply_count_trigger
  AFTER INSERT OR DELETE ON public.order_communications
  FOR EACH ROW EXECUTE FUNCTION update_reply_count();

-- Create function to update timestamps
CREATE TRIGGER update_order_communications_updated_at
  BEFORE UPDATE ON public.order_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();