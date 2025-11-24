-- Create user audit log table
CREATE TABLE public.user_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  dealer_id BIGINT REFERENCES public.dealerships(id),
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view audit logs for their dealership"
ON public.user_audit_log
FOR SELECT
USING (
  is_admin() OR 
  user_has_active_dealer_membership(auth.uid(), dealer_id)
);

CREATE POLICY "System can insert audit logs"
ON public.user_audit_log
FOR INSERT
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_user_audit_log_dealer_id ON public.user_audit_log(dealer_id);
CREATE INDEX idx_user_audit_log_event_type ON public.user_audit_log(event_type);
CREATE INDEX idx_user_audit_log_created_at ON public.user_audit_log(created_at DESC);
CREATE INDEX idx_user_audit_log_user_id ON public.user_audit_log(user_id);

-- Create user notifications table
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  dealer_id BIGINT REFERENCES public.dealerships(id),
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  action_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own notifications"
ON public.user_notifications
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX idx_user_notifications_dealer_id ON public.user_notifications(dealer_id);
CREATE INDEX idx_user_notifications_read_at ON public.user_notifications(read_at);
CREATE INDEX idx_user_notifications_created_at ON public.user_notifications(created_at DESC);

-- Create notification settings table
CREATE TABLE public.user_notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  dealer_id BIGINT REFERENCES public.dealerships(id),
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  push_notifications BOOLEAN NOT NULL DEFAULT true,
  in_app_notifications BOOLEAN NOT NULL DEFAULT true,
  notification_frequency TEXT NOT NULL DEFAULT 'immediate' CHECK (notification_frequency IN ('immediate', 'hourly', 'daily', 'weekly')),
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  notification_types JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own notification settings"
ON public.user_notification_settings
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Update timestamp triggers
CREATE TRIGGER update_user_notifications_updated_at
BEFORE UPDATE ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_notification_settings_updated_at
BEFORE UPDATE ON public.user_notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();