-- RPC to delete a member and their associated Auth account completely
CREATE OR REPLACE FUNCTION public.admin_delete_member(
  p_member_id UUID,
  p_email TEXT
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Protection: Block deletion of VP profile
  IF lower(trim(p_email)) = 'vicepresidencia@conselt.com.br' THEN
    RETURN jsonb_build_object('success', false, 'error', 'O perfil de Vice-Presidência não pode ser excluído.');
  END IF;

  -- Look up auth_user_id from public.members or auth.users
  SELECT auth_user_id INTO v_user_id FROM public.members WHERE id = p_member_id;

  IF v_user_id IS NULL AND p_email IS NOT NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower(trim(p_email));
  END IF;

  -- Delete from public.members
  DELETE FROM public.members WHERE id = p_member_id OR lower(email) = lower(trim(p_email));

  -- Delete from auth.users
  IF v_user_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_user_id;
  ELSIF p_email IS NOT NULL AND p_email <> '' THEN
    DELETE FROM auth.users WHERE lower(email) = lower(trim(p_email));
  END IF;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.admin_delete_member(UUID, TEXT) TO anon, authenticated, service_role;
