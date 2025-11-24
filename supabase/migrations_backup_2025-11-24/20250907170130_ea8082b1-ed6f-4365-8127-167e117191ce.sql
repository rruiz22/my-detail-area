-- Create dealer membership for current user
INSERT INTO public.dealer_memberships (user_id, dealer_id, is_active, joined_at)
SELECT auth.uid(), 5, true, now()
WHERE NOT EXISTS (
  SELECT 1 FROM public.dealer_memberships 
  WHERE user_id = auth.uid() AND dealer_id = 5
);