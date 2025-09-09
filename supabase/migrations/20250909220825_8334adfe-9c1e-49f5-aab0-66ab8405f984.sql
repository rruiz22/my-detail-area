-- Ensure required extension exists (safe to run)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Replace create_dealer_invitation to avoid relying on gen_random_bytes
CREATE OR REPLACE FUNCTION public.create_dealer_invitation(p_dealer_id bigint, p_email text, p_role_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_token TEXT;
BEGIN
  -- Generate a 64-character token using built-in md5, avoiding pgcrypto dependency
  invitation_token := md5(random()::text || clock_timestamp()::text)
                      || md5(clock_timestamp()::text || random()::text);

  -- Insert invitation
  INSERT INTO public.dealer_invitations (
    inviter_id,
    dealer_id,
    email,
    role_name,
    invitation_token
  ) VALUES (
    auth.uid(),
    p_dealer_id,
    p_email,
    p_role_name,
    invitation_token
  );

  RETURN invitation_token;
END;
$$;