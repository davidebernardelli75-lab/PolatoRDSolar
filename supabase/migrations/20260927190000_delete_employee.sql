-- Delete personnel only through an admin-checked, transactional operation.
-- Removing an employee also removes their assigned-course records after explicit UI confirmation.
-- Original FV, vehicle and insurance policies remain unchanged.
BEGIN;

CREATE OR REPLACE FUNCTION public.delete_polato_employee(p_employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF (SELECT polato_internal.is_polato_admin()) IS NOT TRUE THEN
    RAISE EXCEPTION 'Operazione riservata all''amministrazione' USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.employees WHERE id = p_employee_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dipendente non trovato' USING ERRCODE = 'P0002';
  END IF;

  DELETE FROM public.employee_courses WHERE employee_id = p_employee_id;
  DELETE FROM public.employees WHERE id = p_employee_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_polato_employee(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_polato_employee(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
