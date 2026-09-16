-- Enable pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Create RPC function to set member password as manager
CREATE OR REPLACE FUNCTION public.admin_set_member_password(
  p_email TEXT,
  p_new_password TEXT,
  p_pin TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_hashed_password TEXT;
BEGIN
  IF p_pin IS NULL OR p_pin = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PIN de gerente é obrigatório.');
  END IF;

  IF p_new_password IS NULL OR length(p_new_password) < 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'A senha deve ter no mínimo 4 caracteres.');
  END IF;

  -- Find user in auth.users by email
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_email));

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conta de usuário não encontrada no sistema de autenticação.');
  END IF;

  -- Generate bcrypt hash for Supabase Auth
  v_hashed_password := extensions.crypt(p_new_password, extensions.gen_salt('bf'));

  -- Update password in auth.users
  UPDATE auth.users
  SET encrypted_password = v_hashed_password,
      updated_at = now()
  WHERE id = v_user_id;

  -- Ensure auth_user_id is linked in members table
  UPDATE public.members
  SET auth_user_id = v_user_id
  WHERE lower(email) = lower(trim(p_email));

  RETURN jsonb_build_object('success', true, 'auth_user_id', v_user_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.admin_set_member_password(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
